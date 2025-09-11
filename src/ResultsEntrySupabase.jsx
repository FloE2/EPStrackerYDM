// src/components/ResultsEntrySupabase.jsx - VERSION SANS DASHBOARD ÉLÈVE
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  Save, 
  ArrowLeft,
  Search,
  Edit3,
  X,
  Loader,
  RefreshCw,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  Calendar
} from 'lucide-react';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { useSchoolYear } from './contexts/SchoolYearContext';

const ResultsEntrySupabase = () => {
  // Récupération de l'année scolaire sélectionnée
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();
  
  // États principaux
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // États pour la vue détaillée
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsCount, setStudentsCount] = useState({});
  
  // États d'édition
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editStatus, setEditStatus] = useState('result'); // 'result' | 'absent' | 'dispensed'

  // Chargement initial et quand l'année change
  useEffect(() => {
    if (selectedSchoolYear) {
      loadClassesAndCounts();
    }
  }, [selectedSchoolYear]);

  // Chargement des élèves quand une classe est sélectionnée
  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadClassData(selectedClass.id);
    }
  }, [selectedClass, selectedSchoolYear]);

  // Système de couleurs par niveau
  const getLevelColors = (level) => {
    const levelColorMap = {
      '6ème': {
        bg: 'bg-blue-50', 
        border: 'border-blue-300', 
        text: 'text-blue-700', 
        accent: 'bg-blue-600',
        hover: 'hover:bg-blue-100'
      },
      '5ème': {
        bg: 'bg-emerald-50', 
        border: 'border-emerald-300', 
        text: 'text-emerald-700', 
        accent: 'bg-emerald-600',
        hover: 'hover:bg-emerald-100'
      },
      '4ème': {
        bg: 'bg-orange-50', 
        border: 'border-orange-300', 
        text: 'text-orange-700', 
        accent: 'bg-orange-600',
        hover: 'hover:bg-orange-100'
      },
      '3ème': {
        bg: 'bg-purple-50', 
        border: 'border-purple-300', 
        text: 'text-purple-700', 
        accent: 'bg-purple-600',
        hover: 'hover:bg-purple-100'
      }
    };
    return levelColorMap[level] || levelColorMap['6ème'];
  };

  // Chargement des classes et comptage des élèves - FILTRÉ PAR ANNÉE
  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔗 ResultsEntry: Utilisation instance Supabase centralisée pour année', selectedSchoolYear);
      
      // Charger les classes filtrées par année scolaire
      const [classesRes, testsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('school_year', selectedSchoolYear) // ← FILTRE OBLIGATOIRE
          .order('level'),
        supabase.from('tests').select('*').order('category')
      ]);
      
      if (classesRes.error) throw classesRes.error;
      if (testsRes.error) throw testsRes.error;
      
      setClasses(classesRes.data || []);
      setTests(testsRes.data || []);
      
      // Reset classe sélectionnée si elle n'existe pas dans cette année
      if (selectedClass && !classesRes.data.find(c => c.id === selectedClass.id)) {
        setSelectedClass(null);
        setStudents([]);
        setResults({});
      }
      
      // Compter les élèves par classe pour cette année
      const counts = {};
      for (const classe of classesRes.data) {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedSchoolYear); // ← FILTRE OBLIGATOIRE
        
        if (!error) {
          counts[classe.id] = count || 0;
        }
      }
      setStudentsCount(counts);
      
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des données d'une classe spécifique - FILTRÉ PAR ANNÉE
  const loadClassData = async (classId) => {
    try {
      setLoading(true);
      
      // Charger élèves et résultats pour cette classe ET cette année
      const [studentsRes, resultsRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('class_id', classId)
          .eq('school_year', selectedSchoolYear) // ← FILTRE OBLIGATOIRE
          .order('last_name', { ascending: true }),
        supabase
          .from('results')
          .select(`
            *,
            students!inner(class_id, school_year)
          `)
          .eq('students.class_id', classId)
          .eq('students.school_year', selectedSchoolYear) // ← FILTRE OBLIGATOIRE
      ]);
      
      if (studentsRes.error) throw studentsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      
      setStudents(studentsRes.data || []);
      
      // Transformer les résultats avec format de clé standardisé
      const resultsMap = {};
      resultsRes.data.forEach(result => {
        const key = `${result.student_id}-${result.test_id}`;
        
        let status = 'result';
        if (result.absent) status = 'absent';
        else if (result.dispensed) status = 'dispensed';
        
        resultsMap[key] = {
          status: status,
          value: result.value,
          id: result.id
        };
      });
      
      setResults(resultsMap);
      
    } catch (err) {
      console.error('Erreur lors du chargement de la classe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions utilitaires
  const getResultStatus = (studentId, testId) => {
    const key = `${studentId}-${testId}`;
    return results[key] || { status: 'empty' };
  };

  const getCompletionStats = () => {
    if (!students.length || !tests.length) return { percentage: 0, completed: 0, total: 0 };
    
    const totalCells = students.length * tests.length;
    let completedCells = 0;
    
    students.forEach(student => {
      tests.forEach(test => {
        const result = getResultStatus(student.id, test.id);
        if (result.status !== 'empty') completedCells++;
      });
    });
    
    return {
      percentage: totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0,
      completed: completedCells,
      total: totalCells
    };
  };

  const handleCellEdit = (studentId, testId, type = 'result') => {
    const current = getResultStatus(studentId, testId);
    
    setEditingCell({ studentId, testId });
    setEditStatus(type);
    setEditValue(current?.value || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    try {
      setSaving(true);
      
      const { studentId, testId } = editingCell;
      const key = `${studentId}-${testId}`;
      
      const resultData = {
        student_id: parseInt(studentId),
        test_id: parseInt(testId),
        value: editStatus === 'result' ? parseFloat(editValue) : null,
        absent: editStatus === 'absent',
        dispensed: editStatus === 'dispensed',
        unit: tests.find(t => t.id === parseInt(testId))?.unit || '',
        school_year: selectedSchoolYear // ← AJOUTER L'ANNÉE SCOLAIRE
      };

      const existingResult = results[key];
      
      let response;
      if (existingResult?.id) {
        response = await supabase
          .from('results')
          .update(resultData)
          .eq('id', existingResult.id);
      } else {
        response = await supabase
          .from('results')
          .insert([resultData]);
      }
      
      if (response.error) throw response.error;
      
      const newResult = {
        status: editStatus,
        value: editStatus === 'result' ? parseFloat(editValue) : null,
        id: existingResult?.id || response.data?.[0]?.id
      };
      
      setResults(prev => ({
        ...prev,
        [key]: newResult
      }));
      
      setEditingCell(null);
      setEditValue('');
      setEditStatus('result');
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du résultat');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setEditStatus('result');
  };

  const refreshData = () => {
    if (selectedClass) {
      loadClassData(selectedClass.id);
    } else {
      loadClassesAndCounts();
    }
  };

  // Composant cellule de résultat avec CSS pour supprimer les spinners
  const ResultCell = ({ student, test }) => {
    const result = getResultStatus(student.id, test.id);
    const isEditing = editingCell?.studentId === student.id && editingCell?.testId === test.id;
    
    if (isEditing) {
      return (
        <td className="p-2 border border-gray-300 bg-blue-50">
          <style jsx>{`
            .no-spinner::-webkit-outer-spin-button,
            .no-spinner::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            
            .no-spinner[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>
          <div className="space-y-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setEditStatus('result')}
                className={`px-2 py-1 text-xs rounded ${
                  editStatus === 'result' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                Résultat
              </button>
              <button
                onClick={() => setEditStatus('absent')}
                className={`px-2 py-1 text-xs rounded ${
                  editStatus === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-200'
                }`}
              >
                Absent
              </button>
              <button
                onClick={() => setEditStatus('dispensed')}
                className={`px-2 py-1 text-xs rounded ${
                  editStatus === 'dispensed' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                }`}
              >
                Dispensé
              </button>
            </div>
            
            {editStatus === 'result' && (
              <input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="no-spinner w-full p-1 text-xs border rounded"
                placeholder={test.unit}
                autoFocus
              />
            )}
            
            <div className="flex space-x-1">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {saving ? <Loader className="animate-spin" size={10} /> : '✓'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </td>
      );
    }

    let cellContent, cellClass, bgClass;
    
    switch (result.status) {
      case 'result':
        cellContent = `${result.value} ${test.unit}`;
        cellClass = 'text-green-800 font-medium';
        bgClass = 'bg-green-50 hover:bg-green-100';
        break;
      case 'absent':
        cellContent = 'ABS';
        cellClass = 'text-red-800 font-medium';
        bgClass = 'bg-red-50 hover:bg-red-100';
        break;
      case 'dispensed':
        cellContent = 'DISP';
        cellClass = 'text-orange-800 font-medium';
        bgClass = 'bg-orange-50 hover:bg-orange-100';
        break;
      default:
        cellContent = '—';
        cellClass = 'text-gray-400';
        bgClass = 'bg-gray-50 hover:bg-gray-100';
    }

    return (
      <td 
        className={`p-3 border border-gray-300 text-center text-sm cursor-pointer transition-colors ${bgClass}`}
        onClick={() => handleCellEdit(student.id, test.id)}
        title={`Cliquer pour modifier - ${student.first_name} ${student.last_name} - ${test.name}`}
      >
        <span className={cellClass}>{cellContent}</span>
      </td>
    );
  };

  // Vue sélection des classes
  const ClassSelectionView = () => {
    const classesByLevel = {
      '6ème': classes.filter(c => c.level === '6ème').sort((a, b) => a.name.localeCompare(b.name)),
      '5ème': classes.filter(c => c.level === '5ème').sort((a, b) => a.name.localeCompare(b.name)),
      '4ème': classes.filter(c => c.level === '4ème').sort((a, b) => a.name.localeCompare(b.name)),
      '3ème': classes.filter(c => c.level === '3ème').sort((a, b) => a.name.localeCompare(b.name))
    };

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header avec indication de l'année */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Interface Enseignant - Saisie des Résultats</h1>
            <p className="text-gray-600">Sélectionnez une classe pour saisir et modifier les résultats des élèves</p>
          </div>

          {/* Affichage année scolaire */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <Calendar className="text-blue-600" size={20} />
              <span className="text-gray-700">Saisie des résultats pour</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedSchoolYear}
              </span>
              {selectedSchoolYear === currentSchoolYear && (
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                  Année courante
                </span>
              )}
            </div>
          </div>

          {/* Message si pas de classes */}
          {classes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
              <BookOpen size={64} className="mx-auto text-yellow-500 mb-6" />
              <h3 className="text-2xl font-semibold text-yellow-800 mb-4">
                Aucune classe pour {selectedSchoolYear}
              </h3>
              <p className="text-yellow-700 mb-8 text-lg">
                Aucune classe n'existe pour cette année scolaire. Créez d'abord des classes dans la section 
                "Gestion des Classes" ou changez d'année scolaire.
              </p>
            </div>
          ) : (
            // Grille des classes par niveau
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {Object.entries(classesByLevel).map(([level, levelClasses]) => (
                levelClasses.length > 0 && (
                  <div key={level} className="space-y-6">
                    {/* En-tête du niveau */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                        <h2 className={`text-xl font-bold ${getLevelColors(level).text}`}>
                          {level}
                        </h2>
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                      </div>
                    </div>
                    
                    {/* Classes du niveau */}
                    <div className="space-y-4">
                      {levelClasses.map((classe) => {
                        const colors = getLevelColors(classe.level);
                        const studentCount = studentsCount[classe.id] || 0;
                        
                        return (
                          <button
                            key={classe.id}
                            onClick={() => setSelectedClass(classe)}
                            className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                          >
                            <div className={`text-2xl font-bold mb-4 ${colors.text}`}>
                            {classe.level.charAt(0)}{classe.name}
                            </div>
                            
                            <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80 mb-3`}>
                              <Users size={16} />
                              <span>{studentCount} élève{studentCount !== 1 ? 's' : ''}</span>
                            </div>
                            
                            <div className={`text-sm ${colors.text} opacity-75`}>
                              Cliquer pour saisir les résultats
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Vue détaillée d'une classe - SIMPLIFIÉE SANS DASHBOARD
  const ClassDetailView = () => {
    const colors = getLevelColors(selectedClass.level);
    const stats = getCompletionStats();
    
    const filteredStudents = students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className={`${colors.accent} text-white shadow-lg`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setSearchTerm('');
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux classes</span>
                </button>
                <div className="flex items-center space-x-3">
                  <BarChart3 size={32} />
                  <div>
                  <h1 className="text-2xl font-bold">{selectedClass.level.charAt(0)}{selectedClass.name}</h1>
                    <p className="text-sm opacity-90 flex items-center space-x-2">
                      <Calendar size={14} />
                      <span>Année {selectedSchoolYear}</span>
                      {selectedSchoolYear === currentSchoolYear && (
                        <span className="text-xs bg-green-500 bg-opacity-80 px-2 py-1 rounded">
                          Courante
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-bold">{stats.percentage}%</div>
                  <div className="text-sm opacity-90">{stats.completed}/{stats.total} complétés</div>
                </div>
                <button 
                  onClick={refreshData}
                  className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                >
                  <RefreshCw size={16} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Barre de recherche */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className={`px-4 py-3 ${colors.bg} ${colors.text} rounded-lg border ${colors.border} font-medium`}>
                {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''} • {tests.length} tests
              </div>
            </div>
          </div>

          {/* Note explicative */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Activity className="text-blue-600" size={16} />
              <p className="text-sm text-blue-700">
                <strong>Interface de saisie :</strong> Cliquez sur une cellule pour saisir un résultat, marquer un élève absent ou dispensé. 
                Pour consulter les détails d'un élève, utilisez la section "Gestion des Classes".
              </p>
            </div>
          </div>

          {/* Tableau des résultats */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Search className="mx-auto text-gray-400 mb-6" size={80} />
              <h3 className="text-2xl font-bold text-gray-700 mb-4">Aucun résultat</h3>
              <p className="text-gray-500 text-lg">Aucun élève ne correspond à votre recherche</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${colors.bg} sticky top-0`}>
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-800 border-r border-gray-300 min-w-[200px]">
                        Élève
                      </th>
                      {tests.map(test => (
                        <th key={test.id} className="p-3 text-center font-medium text-gray-700 border-r border-gray-300 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="text-sm font-bold">{test.name}</div>
                            <div className="text-xs text-gray-500">({test.unit})</div>
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {test.category}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="p-4 text-center font-medium text-gray-700 min-w-[100px]">
                        Progression
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {filteredStudents.map((student) => {
                      const completedTests = tests.filter(test => 
                        getResultStatus(student.id, test.id).status !== 'empty'
                      ).length;
                      const progressPercentage = Math.round((completedTests / tests.length) * 100);
                      
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 border-b">
                          <td className="p-4 border-r border-gray-300 bg-gray-50">
                            <div className="flex items-center">
                              <div>
                                <div className="font-bold text-gray-800 text-lg">
                                  {student.last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {student.first_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {tests.map(test => (
                            <ResultCell key={test.id} student={student} test={test} />
                          ))}
                          
                          <td className="p-4 text-center">
                            <div className="space-y-1">
                              <div className={`text-sm font-bold ${
                                progressPercentage >= 80 ? 'text-green-600' :
                                progressPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {progressPercentage}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {completedTests}/{tests.length}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Gestion des erreurs et chargement
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => selectedClass ? loadClassData(selectedClass.id) : loadClassesAndCounts()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-500 mr-3" size={24} />
          <span className="text-gray-600">
            {selectedClass ? 'Chargement de la classe (instance centralisée)...' : 'Chargement des classes (instance centralisée)...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {selectedClass ? (
        <ClassDetailView />
      ) : (
        <ClassSelectionView />
      )}
      
      {/* Légende (uniquement en vue détaillée) */}
      {selectedClass && (
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende :</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Résultat saisi</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span>Dispensé</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Non effectué</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex items-center space-x-2">
              <Calendar size={12} />
              <span>
                <strong>Interface de saisie :</strong> Optimisée pour la saisie rapide des résultats • 
                Cliquez sur une cellule pour modifier • Pour voir les détails d'un élève, utilisez "Gestion des Classes"
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsEntrySupabase;