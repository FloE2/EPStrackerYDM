// src/components/ExcelImportModal.jsx - VERSION CORRIGÉE AVEC TRAITEMENT DES DATES EXCEL
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Loader, 
  Download,
  Eye,
  Save,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { useSchoolYear } from './contexts/SchoolYearContext';

const ExcelImportModal = ({ isOpen, onClose, selectedClass, existingStudents, onStudentsAdded }) => {
  // Récupération de l'année scolaire sélectionnée
  const { selectedSchoolYear } = useSchoolYear();
  
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    firstName: '',
    lastName: '', 
    birthDate: '',
    gender: ''
  });
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview/Mapping, 3: Import
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, errors: [], duplicates: [] });
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef(null);

  // ========== FONCTION DE TRAITEMENT DES DATES EXCEL ==========
  const parseExcelDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Si c'est déjà null ou undefined
    if (dateValue === null || dateValue === undefined || dateValue === '') return null;
    
    let date;
    
    // Si c'est un nombre (format série Excel)
    if (typeof dateValue === 'number') {
      // Les dates Excel commencent le 1/1/1900, mais JavaScript commence le 1/1/1970
      // Formule de conversion: (dateValue - 25569) * 86400 * 1000
      date = new Date((dateValue - 25569) * 86400 * 1000);
    }
    // Si c'est déjà un objet Date
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Si c'est une chaîne de caractères
    else if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();
      
      // Vérifier différents formats
      if (trimmedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // Format DD/MM/YYYY
        const parts = trimmedValue.split('/');
        date = new Date(parts[2], parts[1] - 1, parts[0]); // Année, Mois-1, Jour
      } else if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format YYYY-MM-DD
        date = new Date(trimmedValue);
      } else if (trimmedValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
        // Format DD-MM-YYYY
        const parts = trimmedValue.split('-');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (trimmedValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        // Format DD.MM.YYYY
        const parts = trimmedValue.split('.');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        // Essayer la conversion directe
        date = new Date(trimmedValue);
      }
    }
    
    // Vérifier si la date est valide et raisonnable (entre 1900 et 2030)
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2030) {
        return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      }
    }
    
    return null;
  };

  // Reset modal when opening
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setExcelData([]);
      setHeaders([]);
      setMapping({ firstName: '', lastName: '', birthDate: '', gender: '' });
      setStep(1);
      setImporting(false);
      setImportResults({ success: 0, errors: [], duplicates: [] });
      setShowPreview(false);
    }
  }, [isOpen]);

  // Gérer la sélection du fichier
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Vérifier le type de fichier
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        alert('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV');
        return;
      }
      
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  // Parser le fichier Excel
  const parseExcelFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true, // Important: demander à XLSX de convertir les dates
        dateNF: 'dd/mm/yyyy' // Format de date préféré
      });
      
      // Prendre la première feuille
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir en JSON avec les dates converties
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false, // Convertir les valeurs en chaînes
        dateNF: 'dd/mm/yyyy'
      });
      
      if (jsonData.length < 2) {
        alert('Le fichier doit contenir au moins une ligne d\'en-têtes et une ligne de données');
        return;
      }
      
      // Extraire les en-têtes (première ligne)
      const fileHeaders = jsonData[0].filter(header => header && header.toString().trim() !== '');
      
      // Extraire les données (lignes suivantes)
      const data = jsonData.slice(1)
        .filter(row => row.some(cell => cell && cell.toString().trim() !== '')) // Filtrer les lignes vides
        .map((row, index) => {
          const rowData = {};
          fileHeaders.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || '';
          });
          rowData._rowNumber = index + 2; // Numéro de ligne dans Excel (commence à 2)
          return rowData;
        });
      
      setHeaders(fileHeaders);
      setExcelData(data);
      setStep(2);
      
      // Auto-mapping intelligent
      autoMapColumns(fileHeaders);
      
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      alert('Erreur lors de la lecture du fichier Excel');
    }
  };

  // Mapping automatique des colonnes
  const autoMapColumns = (fileHeaders) => {
    const newMapping = { firstName: '', lastName: '', birthDate: '', gender: '' };
    
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // Mapping intelligent basé sur les noms courants
      if (lowerHeader.includes('prénom') || lowerHeader.includes('prenom') || 
          lowerHeader.includes('firstname') || lowerHeader === 'first_name') {
        newMapping.firstName = header;
      } else if (lowerHeader.includes('nom') && !lowerHeader.includes('prénom') || 
                 lowerHeader.includes('lastname') || lowerHeader === 'last_name') {
        newMapping.lastName = header;
      } else if (lowerHeader.includes('naissance') || lowerHeader.includes('birth') || 
                 lowerHeader.includes('date')) {
        newMapping.birthDate = header;
      } else if (lowerHeader.includes('sexe') || lowerHeader.includes('genre') || 
                 lowerHeader.includes('gender')) {
        newMapping.gender = header;
      }
    });
    
    setMapping(newMapping);
  };

  // Valider les données avant import - VERSION CORRIGÉE
  const validateData = () => {
    const errors = [];
    const duplicates = [];
    
    if (!mapping.firstName || !mapping.lastName) {
      errors.push('Le mapping du prénom et du nom est obligatoire');
      return { isValid: false, errors, duplicates };
    }
    
    excelData.forEach((row, index) => {
      const firstName = row[mapping.firstName]?.toString().trim();
      const lastName = row[mapping.lastName]?.toString().trim();
      
      // Vérifier les champs obligatoires
      if (!firstName || !lastName) {
        errors.push(`Ligne ${row._rowNumber}: Prénom et nom obligatoires`);
        return;
      }
      
      // Vérifier les doublons avec les élèves existants
      const duplicate = existingStudents.find(student => 
        student.first_name.toLowerCase() === firstName.toLowerCase() && 
        student.last_name.toLowerCase() === lastName.toLowerCase()
      );
      
      if (duplicate) {
        duplicates.push(`${firstName} ${lastName} (ligne ${row._rowNumber})`);
      }
      
      // NOUVELLE VALIDATION pour la date de naissance avec parseExcelDate
      if (mapping.birthDate && row[mapping.birthDate]) {
        const parsedDate = parseExcelDate(row[mapping.birthDate]);
        if (!parsedDate) {
          errors.push(`Ligne ${row._rowNumber}: Date de naissance invalide - Format attendu: JJ/MM/AAAA ou AAAA-MM-JJ`);
        }
      }
    });
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      duplicates 
    };
  };

  // Importer les élèves - VERSION CORRIGÉE
  const importStudents = async () => {
    const validation = validateData();
    
    if (!validation.isValid) {
      setImportResults({ success: 0, errors: validation.errors, duplicates: validation.duplicates });
      return;
    }
    
    setImporting(true);
    setStep(3);
    
    const studentsToImport = excelData
      .filter(row => {
        const firstName = row[mapping.firstName]?.toString().trim();
        const lastName = row[mapping.lastName]?.toString().trim();
        
        // Exclure les doublons
        if (!firstName || !lastName) return false;
        
        const isDuplicate = existingStudents.some(student => 
          student.first_name.toLowerCase() === firstName.toLowerCase() && 
          student.last_name.toLowerCase() === lastName.toLowerCase()
        );
        
        return !isDuplicate;
      })
      .map(row => {
        const studentData = {
          first_name: row[mapping.firstName]?.toString().trim(),
          last_name: row[mapping.lastName]?.toString().trim().toUpperCase(),
          class_id: selectedClass.id,
          school_year: selectedSchoolYear // Ajout de l'année scolaire
        };
        
        // NOUVELLE MÉTHODE pour traiter la date de naissance avec parseExcelDate
        if (mapping.birthDate && row[mapping.birthDate]) {
          const parsedDate = parseExcelDate(row[mapping.birthDate]);
          if (parsedDate) {
            studentData.birth_date = parsedDate;
          }
        }
        
        // Ajouter le genre si fourni
        if (mapping.gender && row[mapping.gender]) {
          const gender = row[mapping.gender]?.toString().trim().toUpperCase();
          if (gender === 'M' || gender === 'MASCULIN' || gender === 'GARCON' || gender === 'GARÇON') {
            studentData.gender = 'M';
          } else if (gender === 'F' || gender === 'FEMININ' || gender === 'FÉMININ' || gender === 'FILLE') {
            studentData.gender = 'F';
          }
        }
        
        return studentData;
      });
    
    try {
      let successCount = 0;
      const errors = [];
      
      // Importer un par un pour capturer les erreurs individuelles
      for (const studentData of studentsToImport) {
        try {
          const { error } = await supabase
            .from('students')
            .insert([studentData]);
          
          if (error) {
            errors.push(`${studentData.first_name} ${studentData.last_name}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`${studentData.first_name} ${studentData.last_name}: ${err.message}`);
        }
      }
      
      setImportResults({ 
        success: successCount, 
        errors, 
        duplicates: validation.duplicates 
      });
      
      // Notifier le parent pour actualiser la liste
      if (successCount > 0) {
        onStudentsAdded();
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setImportResults({ 
        success: 0, 
        errors: ['Erreur générale: ' + error.message], 
        duplicates: validation.duplicates 
      });
    } finally {
      setImporting(false);
    }
  };

  // Télécharger un modèle Excel avec dates correctement formatées
  const downloadTemplate = () => {
    const templateData = [
      ['Prénom', 'Nom', 'Date de Naissance', 'Sexe'],
      ['Jean', 'MARTIN', '15/03/2010', 'M'],
      ['Marie', 'DUPONT', '22/07/2009', 'F'],
      ['Pierre', 'DURAND', '08/12/2010', 'M'],
      ['Sophie', 'BERNARD', '14/01/2011', 'F']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Formater la colonne des dates
    const dateCol = 'C'; // Colonne Date de Naissance
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Appliquer le format de date aux cellules
    for (let row = 2; row <= range.e.r + 1; row++) {
      const cellAddress = dateCol + row;
      if (ws[cellAddress]) {
        ws[cellAddress].t = 'd'; // Type date
        ws[cellAddress].z = 'dd/mm/yyyy'; // Format d'affichage
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle Élèves');
    XLSX.writeFile(wb, `Modele_Import_Eleves_${selectedClass?.name || 'Classe'}.xlsx`);
  };

  // Fonction helper pour l'aperçu des dates
  const formatDateForPreview = (dateValue) => {
    if (!dateValue) return '-';
    const parsedDate = parseExcelDate(dateValue);
    if (parsedDate) {
      // Convertir YYYY-MM-DD en DD/MM/YYYY pour l'affichage
      const parts = parsedDate.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateValue.toString() + ' (invalide)';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="text-green-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Import Excel - Classe {selectedClass?.name}
              </h2>
              <p className="text-sm text-gray-600">
                Importez une liste d'élèves depuis un fichier Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Étape 1: Upload du fichier */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Sélectionnez votre fichier Excel</h3>
                <p className="text-gray-600 mb-6">
                  Formats supportés: .xlsx, .xls, .csv
                </p>
              </div>

              {/* Zone de téléchargement */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-sm text-gray-500">
                  ou glissez-déposez votre fichier ici
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Bouton modèle */}
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Download size={16} />
                  <span>Télécharger un modèle Excel</span>
                </button>
              </div>

              {/* Information sur les colonnes attendues */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Colonnes attendues :</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Prénom</strong> (obligatoire)</li>
                  <li>• <strong>Nom</strong> (obligatoire)</li>
                  <li>• <strong>Date de Naissance</strong> (optionnel, format JJ/MM/AAAA recommandé)</li>
                  <li>• <strong>Sexe</strong> (optionnel, M/F ou Masculin/Féminin)</li>
                </ul>
              </div>

              {/* Information spéciale sur les dates */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Pour les dates de naissance :</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• <strong>Recommandé :</strong> Formater les cellules en "Date" dans Excel</li>
                  <li>• <strong>Format :</strong> JJ/MM/AAAA (ex: 15/03/2010)</li>
                  <li>• <strong>Acceptés :</strong> DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY</li>
                </ul>
              </div>
            </div>
          )}

          {/* Étape 2: Mapping et aperçu */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vérification des données</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileSpreadsheet size={16} />
                  <span>{excelData.length} ligne{excelData.length > 1 ? 's' : ''} trouvée{excelData.length > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Mapping des colonnes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-4">Correspondance des colonnes :</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom *</label>
                    <select 
                      value={mapping.firstName} 
                      onChange={(e) => setMapping(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une colonne</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <select 
                      value={mapping.lastName} 
                      onChange={(e) => setMapping(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une colonne</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de Naissance</label>
                    <select 
                      value={mapping.birthDate} 
                      onChange={(e) => setMapping(prev => ({ ...prev, birthDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une colonne (optionnel)</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sexe</label>
                    <select 
                      value={mapping.gender} 
                      onChange={(e) => setMapping(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une colonne (optionnel)</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bouton aperçu */}
              <div className="text-center">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye size={16} />
                  <span>{showPreview ? 'Masquer' : 'Afficher'} l'aperçu des données</span>
                </button>
              </div>

              {/* Aperçu des données avec dates formatées */}
              {showPreview && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-medium">Aperçu (5 premiers élèves)</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Ligne</th>
                          <th className="px-4 py-2 text-left">Prénom</th>
                          <th className="px-4 py-2 text-left">Nom</th>
                          <th className="px-4 py-2 text-left">Date Naissance</th>
                          <th className="px-4 py-2 text-left">Sexe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{row._rowNumber}</td>
                            <td className="px-4 py-2">{row[mapping.firstName] || '-'}</td>
                            <td className="px-4 py-2 font-medium">{row[mapping.lastName] || '-'}</td>
                            <td className="px-4 py-2">
                              {mapping.birthDate ? formatDateForPreview(row[mapping.birthDate]) : '-'}
                            </td>
                            <td className="px-4 py-2">{row[mapping.gender] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {excelData.length > 5 && (
                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 text-center">
                      ... et {excelData.length - 5} autre{excelData.length - 5 > 1 ? 's' : ''} élève{excelData.length - 5 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Validation et avertissements */}
              {(() => {
                const validation = validateData();
                return (
                  <div className="space-y-3">
                    {/* Erreurs */}
                    {validation.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="text-red-500" size={16} />
                          <h4 className="font-medium text-red-700">Erreurs détectées :</h4>
                        </div>
                        <ul className="text-sm text-red-600 space-y-1">
                          {validation.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Doublons */}
                    {validation.duplicates.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="text-yellow-500" size={16} />
                          <h4 className="font-medium text-yellow-700">
                            Doublons détectés ({validation.duplicates.length}) :
                          </h4>
                        </div>
                        <p className="text-sm text-yellow-600 mb-2">Ces élèves existent déjà et seront ignorés :</p>
                        <ul className="text-sm text-yellow-600 space-y-1 max-h-32 overflow-y-auto">
                          {validation.duplicates.map((duplicate, index) => (
                            <li key={index}>• {duplicate}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Succès prévisionnel */}
                    {validation.isValid && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="text-green-500" size={16} />
                          <span className="font-medium text-green-700">
                            Prêt à importer {excelData.length - validation.duplicates.length} nouvel{excelData.length - validation.duplicates.length > 1 ? 's' : ''} élève{excelData.length - validation.duplicates.length > 1 ? 's' : ''} !
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Étape 3: Résultats de l'import */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  {importing ? 'Import en cours...' : 'Import terminé'}
                </h3>
                
                {importing ? (
                  <div className="flex items-center justify-center space-x-3">
                    <Loader className="animate-spin text-blue-500" size={24} />
                    <span className="text-gray-600">Ajout des élèves en cours...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Résumé */}
                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                        <div className="text-sm text-green-700">Ajoutés</div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{importResults.duplicates.length}</div>
                        <div className="text-sm text-yellow-700">Doublons</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                        <div className="text-sm text-red-700">Erreurs</div>
                      </div>
                    </div>
                    
                    {/* Détails des erreurs */}
                    {importResults.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
                        <h4 className="font-medium text-red-700 mb-2">Erreurs d'import :</h4>
                        <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
            <div>
              {step > 1 && step < 3 && (
                <button
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setExcelData([]);
                    setHeaders([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Choisir un autre fichier
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {step === 3 ? 'Fermer' : 'Annuler'}
              </button>
              
              {step === 2 && (
                <button
                  onClick={importStudents}
                  disabled={!mapping.firstName || !mapping.lastName || importing}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <Save size={16} />
                  <span>Importer les élèves</span>
                </button>
              )}
            </div>
          </div>

          {/* Note importante */}
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="text-orange-500 mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-medium text-orange-700">Note importante :</p>
                <p className="text-orange-600">
                  Les élèves seront ajoutés à l'année scolaire <strong>{selectedSchoolYear}</strong>. 
                  Le système gère automatiquement différents formats de dates Excel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant bouton à intégrer dans votre ClassManagementSupabase
const ExcelImportButton = ({ selectedClass, existingStudents, onStudentsAdded }) => {
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowImportModal(true)}
        disabled={!selectedClass}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
      >
        <Upload size={18} />
        <span>Importer Excel</span>
      </button>

      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        selectedClass={selectedClass}
        existingStudents={existingStudents}
        onStudentsAdded={onStudentsAdded}
      />
    </>
  );
};

export { ExcelImportModal, ExcelImportButton };