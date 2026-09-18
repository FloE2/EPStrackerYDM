// src/components/ExcelImportModal.jsx - VERSION AVEC MATCHING ROBUSTE (normalisation + fuzzy + date de naissance)
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
  AlertCircle,
  Link2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { useSchoolYear } from './contexts/SchoolYearContext';

// ============================================================================
// OUTILS DE NORMALISATION / COMPARAISON DE NOMS
// Objectif : reconnaître qu'un même élève est le même d'une année sur l'autre
// même si l'orthographe saisie diffère légèrement (tirets, espaces, accents,
// casse, voire une petite faute de frappe).
// ============================================================================

// Retire les accents (é -> e, ç -> c, etc.)
const stripAccents = (str = '') =>
  str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Normalise un nom/prénom pour la comparaison :
// - accents supprimés
// - tirets, apostrophes, points -> espace
// - espaces multiples -> un seul
// - majuscules
// Exemples : "Daviet-Gomes" / "DAVIET - GOMES" / "daviet   gomes" -> "DAVIET GOMES"
const normalizeForMatch = (str = '') =>
  stripAccents(str)
    .toUpperCase()
    .replace(/[-_'’.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Distance de Levenshtein : nombre minimal de modifications (ajout/suppression/
// substitution d'une lettre) pour passer d'une chaîne à l'autre.
// Sert à repérer les vraies fautes de frappe (ex: "BICGEL" vs "BIGGEL" = 1).
const levenshtein = (a = '', b = '') => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prevRow = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    let prevDiag = prevRow[0];
    prevRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prevRow[j];
      prevRow[j] = a[i - 1] === b[j - 1]
        ? prevDiag
        : 1 + Math.min(prevDiag, prevRow[j], prevRow[j - 1]);
      prevDiag = tmp;
    }
  }
  return prevRow[n];
};

// Formatte une date YYYY-MM-DD en DD/MM/YYYY pour l'affichage
const formatDateFR = (isoDate) => {
  if (!isoDate) return 'date inconnue';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Recherche, parmi les élèves existants (toutes années/classes confondues),
// les candidats correspondant à un prénom/nom importé.
// Retourne { type: 'exact' | 'fuzzy' | 'none', candidates: [...] }
const findCandidatesForRow = (firstName, lastName, studentPool) => {
  const normFirst = normalizeForMatch(firstName);
  const normLast = normalizeForMatch(lastName);

  // On ne garde qu'une fiche par élève réel (regroupée par permanent_id),
  // en conservant la plus récente (le pool est trié par school_year décroissant).
  const byPermanentId = new Map();
  studentPool.forEach(s => {
    if (!s.permanent_id) return;
    if (!byPermanentId.has(s.permanent_id)) byPermanentId.set(s.permanent_id, s);
  });
  const pool = Array.from(byPermanentId.values());

  // 1) Correspondance exacte (après normalisation)
  const exact = pool.filter(s =>
    normalizeForMatch(s.first_name) === normFirst &&
    normalizeForMatch(s.last_name) === normLast
  );
  if (exact.length > 0) return { type: 'exact', candidates: exact };

  // 2) Correspondance floue : même prénom + nom très proche, OU même nom + prénom très proche.
  //    Seuil volontairement strict pour éviter les faux positifs (ex: deux prénoms différents).
  const fuzzy = pool
    .map(s => {
      const sf = normalizeForMatch(s.first_name);
      const sl = normalizeForMatch(s.last_name);
      const firstDist = levenshtein(sf, normFirst);
      const lastDist = levenshtein(sl, normLast);
      const isCandidate =
        (sf === normFirst && lastDist > 0 && lastDist <= 2) ||
        (sl === normLast && firstDist > 0 && firstDist <= 1);
      return isCandidate ? { student: s, score: firstDist + lastDist } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .map(x => x.student);

  if (fuzzy.length > 0) return { type: 'fuzzy', candidates: fuzzy.slice(0, 3) };

  return { type: 'none', candidates: [] };
};

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
  // step 1: Upload | 2: Mapping/aperçu | 3: Vérification des correspondances | 4: Résultats
  const [step, setStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, linked: 0, manual: 0, errors: [], duplicates: [] });
  const [showPreview, setShowPreview] = useState(false);

  // Pool de tous les élèves existants (toutes années/classes), chargé une seule fois
  const [studentPool, setStudentPool] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // Résultat du matching, un objet par ligne Excel à importer
  const [matches, setMatches] = useState([]);
  const [buildingMatches, setBuildingMatches] = useState(false);

  const fileInputRef = useRef(null);

  // ========== FONCTION DE TRAITEMENT DES DATES EXCEL ==========
  const parseExcelDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue === null || dateValue === undefined || dateValue === '') return null;

    let date;

    if (typeof dateValue === 'number') {
      // Les dates Excel commencent le 1/1/1900, JavaScript le 1/1/1970
      date = new Date((dateValue - 25569) * 86400 * 1000);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();

      if (trimmedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const parts = trimmedValue.split('/');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(trimmedValue);
      } else if (trimmedValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const parts = trimmedValue.split('-');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (trimmedValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        const parts = trimmedValue.split('.');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        date = new Date(trimmedValue);
      }
    }

    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2030) {
        return date.toISOString().split('T')[0];
      }
    }

    return null;
  };

  // Charge tous les élèves (toutes années/classes) pour servir de base au matching
  const loadStudentPool = async () => {
    setLoadingPool(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, birth_date, permanent_id, class_id, school_year')
        .order('school_year', { ascending: false });

      if (!error && data) setStudentPool(data);
      else setStudentPool([]);
    } catch {
      setStudentPool([]);
    } finally {
      setLoadingPool(false);
    }
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
      setImportResults({ success: 0, linked: 0, manual: 0, errors: [], duplicates: [] });
      setShowPreview(false);
      setMatches([]);
      loadStudentPool();
    }
  }, [isOpen]);

  // Gérer la sélection du fichier
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
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
        cellDates: true,
        dateNF: 'dd/mm/yyyy'
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        dateNF: 'dd/mm/yyyy'
      });

      if (jsonData.length < 2) {
        alert('Le fichier doit contenir au moins une ligne d\'en-têtes et une ligne de données');
        return;
      }

      const fileHeaders = jsonData[0].filter(header => header && header.toString().trim() !== '');

      const data = jsonData.slice(1)
        .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
        .map((row, index) => {
          const rowData = {};
          fileHeaders.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || '';
          });
          rowData._rowNumber = index + 2;
          return rowData;
        });

      setHeaders(fileHeaders);
      setExcelData(data);
      setStep(2);

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

  // Valider les données de base avant de passer à la vérification des correspondances
  const validateData = () => {
    const errors = [];

    if (!mapping.firstName || !mapping.lastName) {
      errors.push('Le mapping du prénom et du nom est obligatoire');
      return { isValid: false, errors };
    }

    excelData.forEach((row) => {
      const firstName = row[mapping.firstName]?.toString().trim();
      const lastName = row[mapping.lastName]?.toString().trim();

      if (!firstName || !lastName) {
        errors.push(`Ligne ${row._rowNumber}: Prénom et nom obligatoires`);
        return;
      }

      if (mapping.birthDate && row[mapping.birthDate]) {
        const parsedDate = parseExcelDate(row[mapping.birthDate]);
        if (!parsedDate) {
          errors.push(`Ligne ${row._rowNumber}: Date de naissance invalide - Format attendu: JJ/MM/AAAA ou AAAA-MM-JJ`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  // ============================================================================
  // ÉTAPE 3 : construction du tableau de correspondances
  // Pour chaque ligne du fichier importé, on détermine :
  //  - 'duplicate'   : déjà présent tel quel dans CETTE classe/année -> ignoré
  //  - 'new'         : aucun élève correspondant trouvé -> nouvel élève
  //  - 'auto'        : correspondance exacte unique -> lien automatique
  //  - 'auto-date'   : plusieurs homonymes exacts, départagés par la date de naissance
  //  - 'ambiguous'   : plusieurs homonymes exacts, impossible à départager -> choix manuel
  //  - 'suggested'   : ressemblance forte (faute de frappe probable) -> à confirmer
  // ============================================================================
  const buildMatches = () => {
    setBuildingMatches(true);

    const rows = excelData
      .map(row => {
        const firstName = row[mapping.firstName]?.toString().trim() || '';
        const lastName = row[mapping.lastName]?.toString().trim() || '';
        const birthDate = mapping.birthDate ? parseExcelDate(row[mapping.birthDate]) : null;
        return { row, firstName, lastName, birthDate };
      })
      .filter(r => r.firstName && r.lastName);

    const results = rows.map(({ row, firstName, lastName, birthDate }) => {
      // Doublon strict : déjà présent dans la classe/année cible
      const alreadyInClass = existingStudents.some(s =>
        normalizeForMatch(s.first_name) === normalizeForMatch(firstName) &&
        normalizeForMatch(s.last_name) === normalizeForMatch(lastName)
      );
      if (alreadyInClass) {
        return { row, firstName, lastName, birthDate, status: 'duplicate', chosenPermanentId: null, candidates: [] };
      }

      const { type, candidates } = findCandidatesForRow(firstName, lastName, studentPool);

      if (type === 'none') {
        return { row, firstName, lastName, birthDate, status: 'new', chosenPermanentId: null, candidates: [] };
      }

      if (type === 'exact') {
        if (candidates.length === 1) {
          return { row, firstName, lastName, birthDate, status: 'auto', chosenPermanentId: candidates[0].permanent_id, candidates };
        }
        // Homonymes exacts (même nom/prénom normalisés) : la date de naissance arbitre
        if (birthDate) {
          const byDate = candidates.filter(c => c.birth_date === birthDate);
          if (byDate.length === 1) {
            return { row, firstName, lastName, birthDate, status: 'auto-date', chosenPermanentId: byDate[0].permanent_id, candidates };
          }
        }
        return { row, firstName, lastName, birthDate, status: 'ambiguous', chosenPermanentId: null, candidates };
      }

      // type === 'fuzzy' : jamais de lien automatique, toujours une confirmation humaine
      return { row, firstName, lastName, birthDate, status: 'suggested', chosenPermanentId: null, candidates };
    });

    setMatches(results);
    setBuildingMatches(false);
    setStep(3);
  };

  // Met à jour le choix de l'utilisateur pour une ligne ambiguë/suggérée
  const setMatchChoice = (index, permanentId) => {
    setMatches(prev => prev.map((m, i) =>
      i === index ? { ...m, chosenPermanentId: permanentId || null } : m
    ));
  };

  // ============================================================================
  // ÉTAPE 4 : import effectif, en s'appuyant sur les décisions prises à l'étape 3
  // ============================================================================
  const importStudents = async () => {
    setImporting(true);
    setStep(4);

    let successCount = 0;
    let linkedCount = 0;
    let manualCount = 0;
    const errors = [];
    const skipped = matches.filter(m => m.status === 'duplicate').map(m => `${m.firstName} ${m.lastName}`);

    for (const m of matches) {
      if (m.status === 'duplicate') continue;

      try {
        const studentData = {
          first_name: m.firstName,
          last_name: m.lastName.toUpperCase(),
          class_id: selectedClass.id,
          school_year: selectedSchoolYear
        };

        if (m.birthDate) studentData.birth_date = m.birthDate;

        if (mapping.gender && m.row[mapping.gender]) {
          const gender = m.row[mapping.gender].toString().trim().toUpperCase();
          if (['M', 'MASCULIN', 'GARCON', 'GARÇON'].includes(gender)) studentData.gender = 'M';
          else if (['F', 'FEMININ', 'FÉMININ', 'FILLE'].includes(gender)) studentData.gender = 'F';
        }

        if (m.chosenPermanentId) {
          studentData.permanent_id = m.chosenPermanentId;
          linkedCount++;
          if (m.status === 'ambiguous' || m.status === 'suggested') manualCount++;
        }
        // Sinon, Supabase génère automatiquement un nouveau permanent_id (DEFAULT gen_random_uuid())

        const { error } = await supabase.from('students').insert([studentData]);

        if (error) {
          errors.push(`${m.firstName} ${m.lastName}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push(`${m.firstName} ${m.lastName}: ${err.message}`);
      }
    }

    setImportResults({
      success: successCount,
      linked: linkedCount,
      manual: manualCount,
      errors,
      duplicates: skipped
    });

    if (successCount > 0) onStudentsAdded();
    setImporting(false);
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
    const dateCol = 'C';
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let row = 2; row <= range.e.r + 1; row++) {
      const cellAddress = dateCol + row;
      if (ws[cellAddress]) {
        ws[cellAddress].t = 'd';
        ws[cellAddress].z = 'dd/mm/yyyy';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle Élèves');
    XLSX.writeFile(wb, `Modele_Import_Eleves_${selectedClass?.name || 'Classe'}.xlsx`);
  };

  const formatDateForPreview = (dateValue) => {
    if (!dateValue) return '-';
    const parsedDate = parseExcelDate(dateValue);
    if (parsedDate) return formatDateFR(parsedDate);
    return dateValue.toString() + ' (invalide)';
  };

  if (!isOpen) return null;

  const validation = step === 2 ? validateData() : { isValid: true, errors: [] };

  // Compteurs pour le résumé de l'étape 3
  const summary = {
    new: matches.filter(m => m.status === 'new').length,
    auto: matches.filter(m => m.status === 'auto' || m.status === 'auto-date').length,
    ambiguous: matches.filter(m => m.status === 'ambiguous').length,
    suggested: matches.filter(m => m.status === 'suggested').length,
    duplicate: matches.filter(m => m.status === 'duplicate').length,
  };
  const needsAttention = summary.ambiguous + summary.suggested;

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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Étape 1: Upload du fichier */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Sélectionnez votre fichier Excel</h3>
                <p className="text-gray-600 mb-6">Formats supportés: .xlsx, .xls, .csv</p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-lg font-medium text-gray-700 mb-2">Cliquez pour sélectionner un fichier</p>
                <p className="text-sm text-gray-500">ou glissez-déposez votre fichier ici</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Download size={16} />
                  <span>Télécharger un modèle Excel</span>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Colonnes attendues :</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Prénom</strong> (obligatoire)</li>
                  <li>• <strong>Nom</strong> (obligatoire)</li>
                  <li>• <strong>Date de Naissance</strong> (recommandé — permet de départager les homonymes)</li>
                  <li>• <strong>Sexe</strong> (optionnel, M/F ou Masculin/Féminin)</li>
                </ul>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-800 mb-2 flex items-center space-x-2">
                  <Link2 size={16} />
                  <span>Reconnaissance automatique des élèves</span>
                </h4>
                <p className="text-sm text-indigo-700">
                  À l'import, chaque élève est comparé à la base existante (accents, tirets et espaces
                  ignorés) pour relier automatiquement son historique. Les cas incertains (fautes de frappe,
                  homonymes) vous seront présentés pour validation avant l'import définitif.
                </p>
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
                    <label className="block text-sm font-medium mb-1">
                      Date de Naissance <span className="text-gray-400 font-normal">(recommandé)</span>
                    </label>
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
                {!mapping.birthDate && (
                  <p className="text-xs text-amber-600 mt-3 flex items-start space-x-1">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Sans date de naissance, deux élèves portant le même nom (homonymes) ne pourront pas être départagés automatiquement.</span>
                  </p>
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye size={16} />
                  <span>{showPreview ? 'Masquer' : 'Afficher'} l'aperçu des données</span>
                </button>
              </div>

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

              {/* Erreurs bloquantes uniquement (les correspondances se règlent à l'étape suivante) */}
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

              {validation.isValid && loadingPool && (
                <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
                  <Loader className="animate-spin" size={16} />
                  <span>Chargement de la base élèves pour la reconnaissance...</span>
                </div>
              )}
            </div>
          )}

          {/* Étape 3: Vérification des correspondances */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vérification des correspondances</h3>
                <span className="text-sm text-gray-600">{matches.length} élève{matches.length > 1 ? 's' : ''} analysé{matches.length > 1 ? 's' : ''}</span>
              </div>

              {/* Résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{summary.new}</div>
                  <div className="text-xs text-blue-700">Nouveaux élèves</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{summary.auto}</div>
                  <div className="text-xs text-green-700">Reconnus automatiquement</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-orange-600">{needsAttention}</div>
                  <div className="text-xs text-orange-700">À vérifier</div>
                </div>
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-600">{summary.duplicate}</div>
                  <div className="text-xs text-gray-700">Déjà dans la classe</div>
                </div>
              </div>

              {needsAttention > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 flex items-start space-x-2">
                  <HelpCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {needsAttention} élève{needsAttention > 1 ? 's nécessitent' : ' nécessite'} votre confirmation ci-dessous.
                    Sans action de votre part, {needsAttention > 1 ? 'ils seront importés' : 'il sera importé'} comme nouvel élève, sans lien avec son historique.
                  </span>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Élève importé</th>
                      <th className="px-3 py-2 text-left">Naissance</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-left">Correspondance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, index) => (
                      <tr key={index} className="border-t align-top">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{m.firstName} {m.lastName}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDateFR(m.birthDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {m.status === 'new' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Nouvel élève</span>
                          )}
                          {m.status === 'auto' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">🔗 Reconnu</span>
                          )}
                          {m.status === 'auto-date' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">🔗 Reconnu (date)</span>
                          )}
                          {m.status === 'ambiguous' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">⚠️ Homonymes</span>
                          )}
                          {m.status === 'suggested' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">❓ Ressemblance</span>
                          )}
                          {m.status === 'duplicate' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">Déjà présent</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {(m.status === 'auto' || m.status === 'auto-date') && (
                            <span className="text-gray-600 text-xs">
                              Historique lié automatiquement
                            </span>
                          )}
                          {m.status === 'new' && (
                            <span className="text-gray-400 text-xs">Aucun élève correspondant trouvé</span>
                          )}
                          {m.status === 'duplicate' && (
                            <span className="text-gray-400 text-xs">Ignoré à l'import</span>
                          )}
                          {(m.status === 'ambiguous' || m.status === 'suggested') && (
                            <select
                              value={m.chosenPermanentId || ''}
                              onChange={(e) => setMatchChoice(index, e.target.value)}
                              className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">➕ Nouvel élève (aucun lien)</option>
                              {m.candidates.map((c, ci) => (
                                <option key={ci} value={c.permanent_id}>
                                  {c.first_name} {c.last_name} — né(e) le {formatDateFR(c.birth_date)} — {c.school_year}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Étape 4: Résultats de l'import */}
          {step === 4 && (
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

                    {importResults.linked > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 max-w-md mx-auto text-center">
                        <div className="text-indigo-700 font-semibold text-sm">
                          🔗 {importResults.linked} élève{importResults.linked > 1 ? 's' : ''} reconnu{importResults.linked > 1 ? 's' : ''} depuis une année précédente
                        </div>
                        <div className="text-indigo-500 text-xs mt-1">
                          {importResults.manual > 0 && `dont ${importResults.manual} confirmé${importResults.manual > 1 ? 's' : ''} manuellement — `}
                          Leur historique de performances est automatiquement lié !
                        </div>
                      </div>
                    )}

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
              {step > 1 && step < 4 && (
                <button
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setExcelData([]);
                    setHeaders([]);
                    setMatches([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Choisir un autre fichier
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={() => setStep(2)}
                  className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ← Retour au mapping
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {step === 4 ? 'Fermer' : 'Annuler'}
              </button>

              {step === 2 && (
                <button
                  onClick={buildMatches}
                  disabled={!validation.isValid || loadingPool || buildingMatches}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {buildingMatches || loadingPool ? <Loader className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  <span>Vérifier les correspondances</span>
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={importStudents}
                  disabled={importing}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <Save size={16} />
                  <span>Importer les {matches.filter(m => m.status !== 'duplicate').length} élève{matches.filter(m => m.status !== 'duplicate').length > 1 ? 's' : ''}</span>
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
