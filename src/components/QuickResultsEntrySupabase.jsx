// src/components/QuickResultsEntrySupabase.jsx - APPROCHE 5 : REFS PURES
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Activity, 
  ArrowLeft,
  Search,
  Play,
  CheckCircle,
  Clock,
  Target,
  Loader,
  RefreshCw,
  User,
  Trophy,
  AlertCircle,
  Save,
  Lock,
  ClipboardList,
  BarChart3,
  Calendar,
  GraduationCap
} from 'lucide-react';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from '../lib/supabase';

// Hook pour gérer l'année scolaire (logique locale à ce composant)
const useSchoolYear = () => {
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  
  // Générer les années scolaires disponibles
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  return {
    selectedYear,
    setSelectedYear,
    availableYears: getAvailableYears()
  };
};

const QuickResultsEntrySupabase = ({ setActiveTab }) => {
  // Hook pour l'année scolaire
  const { selectedYear, setSelectedYear, availableYears } = useSchoolYear();
  
  // États principaux
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // États pour la recherche et le workflow
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsCount, setStudentsCount] = useState({});
  const [mode, setMode] = useState('class-selection'); // 'class-selection' | 'test-selection' | 'mass-entry'
  
  // États pour la saisie en lot
  const [tempResults, setTempResults] = useState({}); // Résultats temporaires avant sauvegarde
  const [savingProgress, setSavingProgress] = useState(0);
  
  // États pour le mot de passe et changement d'année
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingYear, setPendingYear] = useState(null);

  // APPROCHE 5: Stockage des refs des inputs - SOLUTION RADICALE
  const inputRefsRef = useRef({});

  // SIMPLE NAVIGATION FUNCTION - AVEC REFS
  const handleKeyDown = (e, studentIndex, filteredStudents) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Navigation directe avec les refs
      const nextIndex = studentIndex + 1;
      if (nextIndex < filteredStudents.length) {
        const nextStudent = filteredStudents[nextIndex];
        const nextInput = inputRefsRef.current[nextStudent.id];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  // Focus automatique sur le premier champ
  useEffect(() => {
    if (mode === 'mass-entry') {
      setTimeout(() => {
        const firstStudent = students[0];
        if (firstStudent) {
          const firstInput = inputRefsRef.current[firstStudent.id];
          if (firstInput) {
            firstInput.focus();
          }
        }
      }, 300);
    }
  }, [mode, students]);

  // Chargement initial (rechargement quand l'année change)
  useEffect(() => {
    loadClassesAndCounts();
  }, [selectedYear]);

  // Chargement des élèves et tests quand une classe est sélectionnée
  useEffect(() => {
    if (selectedClass && mode === 'test-selection') {
      loadClassData(selectedClass.id);
    }
  }, [selectedClass, mode, selectedYear]);

  // Chargement des résultats existants quand un test est sélectionné
  useEffect(() => {
    if (selectedClass && selectedTest && mode === 'mass-entry') {
      loadTestResults(selectedClass.id, selectedTest.id);
    }
  }, [selectedClass, selectedTest, mode, selectedYear]);

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

  // Système de couleurs par catégorie de test
  const getCategoryColors = (category) => {
    const categoryColorMap = {
      'ENDURANCE': {
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-700', 
        hover: 'hover:bg-blue-100'
      },
      'FORCE': {
        bg: 'bg-red-50', 
        border: 'border-red-200', 
        text: 'text-red-700', 
        hover: 'hover:bg-red-100'
      },
      'SOUPLESSE': {
        bg: 'bg-green-50', 
        border: 'border-green-200', 
        text: 'text-green-700', 
        hover: 'hover:bg-green-100'
      },
      'EQUILIBRE': {
        bg: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700', 
        hover: 'hover:bg-purple-100'
      },
      'VITESSE': {
        bg: 'bg-yellow-50', 
        border: 'border-yellow-200', 
        text: 'text-yellow-700', 
        hover: 'hover:bg-yellow-100'
      },
      'COORDINATION': {
        bg: 'bg-indigo-50', 
        border: 'border-indigo-200', 
        text: 'text-indigo-700', 
        hover: 'hover:bg-indigo-100'
      }
    };
    return categoryColorMap[category] || categoryColorMap['ENDURANCE'];
  };

  // Fonction pour gérer le retour avec mot de passe
  const handleBackWithPassword = () => {
    setPendingYear(null); // Pas de changement d'année, juste retour
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  // Fonction pour gérer le changement d'année avec mot de passe
  const handleYearChangeWithPassword = (newYear) => {
    setPendingYear(newYear);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  // Fonction pour vérifier le mot de passe (pour les deux cas)
  const verifyPassword = () => {
    if (passwordInput === 'prof2025') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      
      if (pendingYear === 'dashboard') {
        // Navigation vers le dashboard
        setActiveTab && setActiveTab('dashboard');
        setPendingYear(null);
      } else if (pendingYear) {
        // Changement d'année approuvé
        setSelectedYear(pendingYear);
        setPendingYear(null);
        resetToClassSelection();
      } else {
        // Retour au menu principal
        resetToClassSelection();
      }
    } else {
      setPasswordError('Mot de passe incorrect');
    }
  };

  // Reset complet à la sélection des classes
  const resetToClassSelection = () => {
    setSelectedClass(null);
    setSelectedTest(null);
    setMode('class-selection');
    setSearchTerm('');
    setTempResults({});
    setResults({});
    setStudents([]);
    // Reset des refs
    inputRefsRef.current = {};
  };

  // Chargement des classes et comptage des élèves (filtré par année)
  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('QuickResultsEntry: Utilisation instance Supabase centralisée pour année', selectedYear);
      
      // Charger les classes filtrées par année scolaire
      const [classesRes, testsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('school_year', selectedYear)
          .order('level'),
        supabase.from('tests').select('*').order('category')
      ]);
      
      if (classesRes.error) throw classesRes.error;
      if (testsRes.error) throw testsRes.error;
      
      setClasses(classesRes.data);
      setTests(testsRes.data);
      
      // Compter les élèves par classe (filtrés par année)
      const counts = {};
      for (const classe of classesRes.data) {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedYear);
        
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

  // Chargement des données d'une classe spécifique (filtré par année)
  const loadClassData = async (classId) => {
    try {
      setLoading(true);
      
      // Charger seulement les élèves de la classe pour l'année sélectionnée
      const studentsRes = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('school_year', selectedYear)
        .order('last_name', { ascending: true });
      
      if (studentsRes.error) throw studentsRes.error;
      
      console.log('Élèves chargés pour', selectedYear, ':', studentsRes.data);
      setStudents(studentsRes.data);
      
      if (studentsRes.data.length === 0) {
        setError(`Aucun élève trouvé dans cette classe pour l'année ${selectedYear}. Vérifiez que des élèves sont bien assignés à cette classe pour cette année scolaire.`);
        return;
      }
      
    } catch (err) {
      console.error('Erreur lors du chargement de la classe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des résultats existants pour un test spécifique (filtré par année)
  const loadTestResults = async (classId, testId) => {
    try {
      setLoading(true);
      
      // Charger les résultats pour ce test, cette classe et cette année
      const resultsRes = await supabase
        .from('results')
        .select(`
          *,
          students!inner(class_id, school_year)
        `)
        .eq('students.class_id', classId)
        .eq('students.school_year', selectedYear)
        .eq('test_id', testId);
      
      if (resultsRes.error) throw resultsRes.error;
      
      // Transformer en map avec student_id comme clé
      const resultsMap = {};
      const tempMap = {};
      
      resultsRes.data.forEach(result => {
        resultsMap[result.student_id] = result.value;
        tempMap[result.student_id] = result.value ? String(result.value) : '';
      });
      
      setResults(resultsMap);
      setTempResults(tempMap);
      
      // APPROCHE 5: Mettre à jour les inputs via les refs
      setTimeout(() => {
        resultsRes.data.forEach(result => {
          const input = inputRefsRef.current[result.student_id];
          if (input && result.value) {
            input.value = String(result.value);
          }
        });
      }, 100);
      
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // APPROCHE 5: Sauvegarde modifiée pour lire uniquement les refs
  const saveAllResults = async () => {
    try {
      setSaving(true);
      setSavingProgress(0);
      
      // Lire les valeurs directement des refs - AUCUNE interaction React
      const resultsToSave = [];
      
      Object.keys(inputRefsRef.current).forEach(studentId => {
        const input = inputRefsRef.current[studentId];
        if (input && input.value && input.value.trim() !== '') {
          resultsToSave.push({
            student_id: parseInt(studentId),
            test_id: selectedTest.id,
            value: parseFloat(input.value.trim()),
            unit: selectedTest.unit,
            school_year: selectedYear,
            date_recorded: new Date().toISOString()
          });
        }
      });

      if (resultsToSave.length === 0) {
        alert('Aucun résultat valide à sauvegarder');
        return;
      }

      console.log('Données à sauvegarder (lecture refs pures):', resultsToSave);

      // Sauvegarder un par un
      for (let i = 0; i < resultsToSave.length; i++) {
        const result = resultsToSave[i];
        
        try {
          // Vérifier s'il existe déjà pour cette année
          const { data: existing, error: selectError } = await supabase
            .from('results')
            .select('id')
            .eq('student_id', result.student_id)
            .eq('test_id', result.test_id)
            .eq('school_year', result.school_year)
            .maybeSingle();

          if (selectError) {
            console.error('Erreur lors de la vérification:', selectError);
            continue;
          }

          if (existing) {
            // Mettre à jour
            const { error: updateError } = await supabase
              .from('results')
              .update({
                value: result.value,
                unit: result.unit,
                date_recorded: result.date_recorded
              })
              .eq('student_id', result.student_id)
              .eq('test_id', result.test_id)
              .eq('school_year', result.school_year);
              
            if (updateError) {
              console.error('Erreur lors de la mise à jour:', updateError);
              continue;
            }
          } else {
            // Créer nouveau
            const { error: insertError } = await supabase
              .from('results')
              .insert([result]);
              
            if (insertError) {
              console.error('Erreur lors de l\'insertion:', insertError);
              continue;
            }
          }
          
          setSavingProgress(Math.round(((i + 1) / resultsToSave.length) * 100));
          
        } catch (individualError) {
          console.error(`Erreur pour l'élève ${result.student_id}:`, individualError);
        }
      }

      // Recharger les données après sauvegarde
      await loadTestResults(selectedClass.id, selectedTest.id);
      
      alert(`Sauvegarde terminée pour l'année ${selectedYear}!`);
      
    } catch (error) {
      console.error('Erreur générale lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des résultats: ' + error.message);
    } finally {
      setSaving(false);
      setSavingProgress(0);
    }
  };

  const refreshData = () => {
    if (mode === 'mass-entry' && selectedClass && selectedTest) {
      loadTestResults(selectedClass.id, selectedTest.id);
    } else if (mode === 'test-selection' && selectedClass) {
      loadClassData(selectedClass.id);
    } else {
      loadClassesAndCounts();
    }
  };

  // APPROCHE 5: Fonction pour compter les résultats à partir des refs
  const getCompletedCountFromRefs = () => {
    let count = 0;
    Object.keys(inputRefsRef.current).forEach(studentId => {
      const input = inputRefsRef.current[studentId];
      if (input && input.value && input.value.trim() !== '') {
        count++;
      }
    });
    return count;
  };

  // Composant pour le sélecteur d'année (avec protection mot de passe)
  const SchoolYearSelector = () => (
    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-sm px-4 py-2 border">
      <Calendar className="text-gray-600" size={20} />
      <div className="text-sm text-gray-600">Année scolaire :</div>
      <select
        value={selectedYear}
        onChange={(e) => {
          const newYear = e.target.value;
          if (newYear !== selectedYear) {
            handleYearChangeWithPassword(newYear);
          }
        }}
        className="bg-transparent border-none text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        {availableYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  );

  // Modal mot de passe (avec gestion du changement d'année)
  const PasswordModal = () => {
    if (!showPasswordModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
          <div className="text-center mb-6">
            <Lock className="mx-auto text-gray-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {pendingYear === 'dashboard' ? 'Accès tableau de bord' : 
               pendingYear ? 'Changement d\'année scolaire' : 'Mot de passe requis'}
            </h2>
            <p className="text-gray-600">
              {pendingYear === 'dashboard' 
                ? 'Veuillez saisir le mot de passe professeur pour accéder au tableau de bord'
                : pendingYear 
                ? `Confirmer le changement vers l'année ${pendingYear}`
                : 'Veuillez saisir le mot de passe professeur pour revenir au menu principal'
              }
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    verifyPassword();
                  }
                }}
                placeholder="Mot de passe..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError('');
                  setPendingYear(null); // Annuler le changement d'année pendante
                }}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={verifyPassword}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vue 1: Sélection des classes (avec filtre par année)
  const ClassSelectionView = () => {
    const classesByLevel = {
      '6ème': classes.filter(c => c.level === '6ème').sort((a, b) => a.name.localeCompare(b.name)),
      '5ème': classes.filter(c => c.level === '5ème').sort((a, b) => a.name.localeCompare(b.name)),
      '4ème': classes.filter(c => c.level === '4ème').sort((a, b) => a.name.localeCompare(b.name)),
      '3ème': classes.filter(c => c.level === '3ème').sort((a, b) => a.name.localeCompare(b.name))
    };

    const totalClasses = classes.length;

    return (
      <div className="max-w-6xl mx-auto p-6">
        {totalClasses === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <GraduationCap className="mx-auto text-gray-400 mb-6" size={80} />
            <h3 className="text-2xl font-bold text-gray-700 mb-4">
              Aucune classe pour l'année {selectedYear}
            </h3>
            <p className="text-gray-500 mb-6">
              Il n'y a pas encore de classes créées pour cette année scolaire.
              <br />
              Vérifiez que les classes ont bien été créées avec l'année scolaire correcte.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                <strong>Conseil :</strong> Utilisez le sélecteur d'année ci-dessus pour changer d'année scolaire 
                ou contactez l'administrateur pour créer les classes de cette année.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sélectionnez une classe pour commencer
              </h2>
              <p className="text-gray-600">
                Choisissez la classe pour laquelle vous souhaitez saisir des résultats de tests physiques
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {Object.entries(classesByLevel).map(([level, levelClasses]) => (
                levelClasses.length > 0 && (
                  <div key={level} className="space-y-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                        <h2 className="text-xl font-bold text-gray-700">{level}</h2>
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {levelClasses.map((classe) => {
                        const colors = getLevelColors(classe.level);
                        const studentCount = studentsCount[classe.id] || 0;
                        
                        return (
                          <button
                            key={classe.id}
                            onClick={() => {
                              setSelectedClass(classe);
                              setMode('test-selection');
                            }}
                            className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                          >
                            <div className="text-center">
                              <div className={`text-2xl font-bold mb-3 ${colors.text}`}>
                                {classe.level.charAt(0)}{classe.name}
                              </div>
                              <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80`}>
                                <Users size={16} />
                                <span>{studentCount} élève{studentCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="mt-3">
                                <div className={`text-sm ${colors.text} opacity-60`}>
                                  Cliquer pour sélectionner le test
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Vue 2: Sélection du test pour la classe
  const TestSelectionView = () => {
    const colors = getLevelColors(selectedClass.level);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className={`${colors.accent} text-white shadow-lg`}>
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackWithPassword}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux classes</span>
                </button>
                <div className="flex items-center space-x-3">
                  <ClipboardList size={32} />
                  <div>
                    <h1 className="text-2xl font-bold">{selectedClass.level.charAt(0)}{selectedClass.name} - Choix du Test</h1>
                    <p className="text-sm opacity-90">
                      Sélectionnez le test physique à effectuer • {selectedClass.level} • {selectedYear}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm opacity-90">
                  <Users size={16} />
                  <span>{students.length} élève{students.length !== 1 ? 's' : ''}</span>
                </div>
                <SchoolYearSelector />
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Choisissez le test physique pour l'atelier
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Vous pourrez ensuite saisir les résultats pour tous les élèves en même temps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const categoryColors = getCategoryColors(test.category);
              
              return (
                <button
                  key={test.id}
                  onClick={() => {
                    setSelectedTest(test);
                    setMode('mass-entry');
                  }}
                  className={`p-6 ${categoryColors.bg} rounded-lg border-2 ${categoryColors.border} ${categoryColors.hover} hover:shadow-lg transition-all duration-300 text-left group`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold ${categoryColors.text} group-hover:text-opacity-80`}>
                      {test.name}
                    </h3>
                    <Activity className={`${categoryColors.text} group-hover:text-opacity-60`} size={24} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className={`inline-block ${categoryColors.bg} ${categoryColors.text} px-3 py-1 rounded-full text-sm font-medium border ${categoryColors.border}`}>
                      {test.category}
                    </div>
                    
                    <div className="text-gray-600">
                      <p className="font-medium">Unité: {test.unit}</p>
                      {test.description && (
                        <p className="text-sm mt-2 opacity-80">{test.description}</p>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                      <div className={`flex items-center justify-center text-sm ${categoryColors.text} group-hover:text-opacity-70 font-medium`}>
                        <Play size={16} className="mr-2" />
                        Démarrer l'atelier
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Vue 3: Saisie en masse - APPROCHE 5 AVEC REFS PURES
  const MassEntryView = () => {
    const colors = getLevelColors(selectedClass.level);
    
    const filteredStudents = students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const clearAllResults = () => {
      // Vider directement les inputs via les refs
      Object.keys(inputRefsRef.current).forEach(studentId => {
        const input = inputRefsRef.current[studentId];
        if (input) {
          input.value = '';
        }
      });
      setTempResults({});
    };

    // Calculer le nombre de résultats complétés à partir des refs
    const completedCount = getCompletedCountFromRefs();

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className={`${colors.accent} text-white shadow-lg`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setMode('test-selection');
                    setSelectedTest(null);
                    setTempResults({});
                    inputRefsRef.current = {};
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Changer de test</span>
                </button>
                <div className="flex items-center space-x-3">
                  <Target size={32} />
                  <div>
                    <h1 className="text-2xl font-bold">
                      {selectedTest.name} - {selectedClass.level.charAt(0)}{selectedClass.name}
                    </h1>
                    <p className="text-sm opacity-90">
                      Atelier {selectedTest.category} • Unité: {selectedTest.unit} • {selectedClass.level} • {selectedYear}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right text-sm">
                  <div className="font-bold">{completedCount}/{students.length}</div>
                  <div className="opacity-80">résultats</div>
                </div>
                <SchoolYearSelector />
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

        {/* Barre d'actions */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
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
                  {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 ml-6">
                <button
                  onClick={clearAllResults}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Effacer tout
                </button>
                <button
                  onClick={saveAllResults}
                  disabled={saving || completedCount === 0}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Sauvegarde... {savingProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Sauvegarder ({completedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {selectedTest && (
            <div className="mt-8 text-center">
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Clic</kbd>
                    <span>Saisir résultat</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Entrée</kbd>
                    <span>Élève suivant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-purple-200 rounded text-xs">APPROCHE 5</span>
                    <span>Refs pures - Aucun événement onChange</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GRILLE AVEC APPROCHE 5 - REFS PURES, AUCUN ÉVÉNEMENT onChange */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student, index) => {
              const tempValue = tempResults[student.id] || '';
              const hasTemp = tempValue && tempValue.toString().trim() !== '';
              const hasExisting = results[student.id];
              
              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 ${
                    hasTemp 
                      ? 'border-green-300 bg-green-50' 
                      : hasExisting 
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Header avec numéro et statut */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {index + 1}
                    </div>
                    {hasTemp && (
                      <CheckCircle className="text-green-500" size={20} />
                    )}
                  </div>

                  {/* Avatar et nom */}
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                      {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                    </div>
                    <div className="font-bold text-gray-800 text-sm">
                      {student.last_name}
                    </div>
                    <div className="font-medium text-gray-600 text-sm">
                      {student.first_name}
                    </div>
                  </div>

                  {/* Résultat existant */}
                  {hasExisting && !hasTemp && (
                    <div className="text-center mb-3">
                      <div className="text-xs text-gray-500 mb-1">Résultat actuel</div>
                      <div className="text-sm font-medium text-blue-600">
                        {results[student.id]} {selectedTest.unit}
                      </div>
                    </div>
                  )}

                  {/* APPROCHE 5: INPUT AVEC REF PURE - AUCUN ÉVÉNEMENT onChange/onInput */}
                  <div className="space-y-2">
                    <input
                      ref={(el) => {
                        if (el) {
                          inputRefsRef.current[student.id] = el;
                          // Initialiser la valeur si elle existe
                          if (tempValue && el.value !== tempValue) {
                            el.value = tempValue;
                          }
                        }
                      }}
                      type="number"
                      step="0.01"
                      defaultValue={tempValue}
                      onKeyDown={(e) => handleKeyDown(e, index, filteredStudents)}
                      placeholder={
                        selectedTest.unit === 'sec' && 
                        (selectedTest.name.includes('Planche') || selectedTest.name.includes('Chaise') || selectedTest.name.includes('Suspension'))
                          ? 'Ex: 90 (pour 1min30)'
                          : `Résultat en ${selectedTest.unit}`
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-sm"
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />
                    <div className="text-center text-xs text-gray-500">
                      {selectedTest.unit === 'sec' && 
                       (selectedTest.name.includes('Planche') || selectedTest.name.includes('Chaise') || selectedTest.name.includes('Suspension')) ? (
                        <div>
                          <div className="font-medium">secondes</div>
                          <div className="text-xs">1min30 = 90sec</div>
                        </div>
                      ) : (
                        selectedTest.unit
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résumé en bas */}
          {filteredStudents.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                    <div className="text-sm text-gray-500">Complétés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{students.length - completedCount}</div>
                    <div className="text-sm text-gray-500">Restants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-500">Progression</div>
                  </div>
                  <div className="text-center border-l border-gray-200 pl-6">
                    <div className="text-lg font-bold text-blue-600">{selectedYear}</div>
                    <div className="text-xs text-gray-500">Année scolaire</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>APPROCHE 5 RADICALE :</strong> Refs pures, aucun événement React
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={clearAllResults}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Effacer tout
                    </button>
                    <button
                      onClick={saveAllResults}
                      disabled={saving || completedCount === 0}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      {saving ? (
                        <>
                          <Loader className="animate-spin" size={18} />
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Sauvegarder ({completedCount})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Réessayer
            </button>
            <SchoolYearSelector />
          </div>
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
            {mode === 'class-selection' ? `Chargement des classes pour ${selectedYear}...` :
             mode === 'test-selection' ? `Chargement des élèves pour ${selectedYear}...` :
             `Chargement des résultats pour ${selectedYear}...`}
          </span>
        </div>
      </div>
    );
  }

  // Rendu principal selon le mode
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header principal fixe */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Demander le mot de passe avant de retourner au dashboard
                  setPendingYear('dashboard');
                  setShowPasswordModal(true);
                  setPasswordInput('');
                  setPasswordError('');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Tableau de bord</span>
              </button>
              <div className="flex items-center space-x-3">
                <Target size={28} className="text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Mode Atelier - Saisie Rapide (APPROCHE 5)</h1>
                  <p className="text-sm text-gray-600">
                    Refs pures - Aucune interaction React • Année {selectedYear}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{classes.length}</span> classes disponibles
              </div>
              <SchoolYearSelector />
              <button 
                onClick={refreshData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="pt-6">
        {mode === 'mass-entry' && selectedClass && selectedTest ? (
          <MassEntryView />
        ) : mode === 'test-selection' && selectedClass ? (
          <TestSelectionView />
        ) : (
          <ClassSelectionView />
        )}
      </div>
      
      <PasswordModal />
    </div>
  );
};

export default QuickResultsEntrySupabase;