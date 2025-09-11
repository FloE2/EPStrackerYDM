// QuickResultsEntrySupabase.jsx - Dashboard avec Sélecteur de Tests
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Lock, 
  Activity, 
  Target, 
  GitBranch, 
  Zap, 
  Clock, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader,
  Eye,
  RefreshCw,
  Settings
} from 'lucide-react';

// Configuration Supabase
const SUPABASE_URL = 'https://jngzmclphkfoezgniexp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3ptY2xwaGtmb2V6Z25pZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDczMTYsImV4cCI6MjA3MTM4MzMxNn0.1kD4SPgxj5mWBXffwVhOFym4ueMzuiPvSKuJaQOSBS8';

const QuickResultsEntrySupabase = ({ setActiveTab }) => {
  // États principaux
  const [selectedClass] = useState('1'); // Classe 5A fixée
  const [selectedTest, setSelectedTest] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // Données Supabase
  const [classes, setClasses] = useState([]);
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // États pour la saisie
  const [editingStudent, setEditingStudent] = useState(null);
  const [inputValue, setInputValue] = useState('');

  // Configuration des icônes par catégorie
  const categoryIcons = {
    ENDURANCE: Activity,
    FORCE: Target,
    SOUPLESSE: GitBranch,
    VITESSE: Zap,
    COORDINATION: Clock,
    EQUILIBRE: Users
  };

  // Chargement des données Supabase
  useEffect(() => {
    loadSupabaseData();
  }, []);

  // Charger les élèves et résultats pour la classe
  useEffect(() => {
    loadStudentsAndResults();
  }, [selectedTest]);

  const loadSupabaseData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };

      // Charger les classes
      const classesResponse = await fetch(`${SUPABASE_URL}/rest/v1/classes?select=*`, { headers });
      if (!classesResponse.ok) throw new Error('Erreur chargement classes');
      const classesData = await classesResponse.json();

      // Charger les tests
      const testsResponse = await fetch(`${SUPABASE_URL}/rest/v1/tests?select=*`, { headers });
      if (!testsResponse.ok) throw new Error('Erreur chargement tests');
      const testsData = await testsResponse.json();

      console.log('🔍 Classes chargées:', classesData.length);
      console.log('🔍 Tests chargés:', testsData.length);

      setClasses(classesData);
      setTests(testsData);
      
    } catch (err) {
      console.error('❌ Erreur Supabase:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndResults = async () => {
    try {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };

      // Charger les élèves de la classe 5A (ID = 1)
      const studentsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/students?class_id=eq.${selectedClass}&select=*`, 
        { headers }
      );
      if (!studentsResponse.ok) throw new Error('Erreur chargement élèves');
      const studentsData = await studentsResponse.json();

      console.log('🔍 Élèves chargés:', studentsData.length);
      setStudents(studentsData);
      
      // Si un test est sélectionné, charger les résultats
      if (selectedTest) {
        const resultsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/results?class_id=eq.${selectedClass}&test_id=eq.${selectedTest}&select=*`, 
          { headers }
        );
        if (!resultsResponse.ok) throw new Error('Erreur chargement résultats');
        const resultsData = await resultsResponse.json();

        // Convertir en format {student_id: value}
        const resultsMap = {};
        resultsData.forEach(result => {
          resultsMap[result.student_id] = result.value;
        });
        setResults(resultsMap);
      } else {
        setResults({});
      }
      
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // Sauvegarder un résultat individuel
  const saveResult = async (studentId, value) => {
    setSaving(true);
    try {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };

      const resultData = {
        student_id: studentId,
        test_id: parseInt(selectedTest),
        class_id: selectedClass,
        value: parseFloat(value),
        date: new Date().toISOString()
      };

      // Vérifier si un résultat existe déjà
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/results?student_id=eq.${studentId}&test_id=eq.${selectedTest}&class_id=eq.${selectedClass}&select=*`,
        { headers }
      );
      const existingResults = await checkResponse.json();

      if (existingResults.length > 0) {
        // Mise à jour
        await fetch(
          `${SUPABASE_URL}/rest/v1/results?student_id=eq.${studentId}&test_id=eq.${selectedTest}&class_id=eq.${selectedClass}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ value: parseFloat(value), date: new Date().toISOString() })
          }
        );
      } else {
        // Création
        await fetch(`${SUPABASE_URL}/rest/v1/results`, {
          method: 'POST',
          headers,
          body: JSON.stringify(resultData)
        });
      }

      // Mettre à jour l'état local
      setResults(prev => ({
        ...prev,
        [studentId]: value
      }));

    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Gérer la saisie
  const handleStudentClick = (student) => {
    if (!selectedTest) {
      alert('Veuillez sélectionner un test d\'abord');
      return;
    }
    setEditingStudent(student.id);
    setInputValue(results[student.id] || '');
  };

  const handleInputSubmit = () => {
    if (inputValue.trim() && editingStudent) {
      saveResult(editingStudent, inputValue.trim());
      setEditingStudent(null);
      setInputValue('');
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setEditingStudent(null);
      setInputValue('');
    }
  };

  // Prompt mot de passe pour changer de classe
  const requestPasswordForClassChange = () => {
    setShowPasswordPrompt(true);
    setTeacherPassword('');
  };

  const handlePasswordSubmit = () => {
    if (teacherPassword === 'prof123') {
      setShowPasswordPrompt(false);
      setActiveTab('classes'); // Retourner à la gestion des classes
      setTeacherPassword('');
    } else {
      alert('Mot de passe incorrect');
      setTeacherPassword('');
    }
  };

  // Utilitaires
  const getCurrentClass = () => classes.find(c => c.id == selectedClass) || { name: '5A', level: '5ème' };
  const getCurrentTest = () => tests.find(t => t.id === parseInt(selectedTest));
  
  // Grouper les tests par catégorie
  const testsByCategory = tests.reduce((acc, test) => {
    const category = test.category || 'AUTRE';
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {});

  // Fonction pour avoir les initiales d'un élève
  const getStudentInitials = (student) => {
    const first = student.first_name ? student.first_name.charAt(0).toLowerCase() : 'm';
    const last = student.last_name ? student.last_name.charAt(0).toUpperCase() : 'E';
    return first + last;
  };

  // Compter les résultats pour un élève
  const getStudentTestCount = (studentId) => {
    // Pour l'instant, simulation basée sur les résultats du test actuel
    return results[studentId] ? 1 : 0;
  };

  // Chargement initial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données Supabase...</p>
        </div>
      </div>
    );
  }

  // Erreur de chargement
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2 text-center">Erreur de chargement</h2>
          <p className="text-red-600 mb-4 text-center">{error}</p>
          <button
            onClick={loadSupabaseData}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Prompt mot de passe
  if (showPasswordPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Lock size={24} className="text-orange-500" />
            <span>Accès Professeur Requis</span>
          </h2>
          <p className="text-gray-600 mb-4">
            Pour changer de classe, veuillez entrer le mot de passe professeur :
          </p>
          <input
            type="password"
            value={teacherPassword}
            onChange={(e) => setTeacherPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            placeholder="Mot de passe..."
            autoFocus
          />
          <div className="flex space-x-3">
            <button
              onClick={handlePasswordSubmit}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Valider
            </button>
            <button
              onClick={() => setShowPasswordPrompt(false)}
              className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== INTERFACE PRINCIPALE - DASHBOARD CLASSE =====
  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* En-tête Dashboard */}
      <div className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('classes')}
                className="flex items-center space-x-2 px-3 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Retour aux classes</span>
              </button>
              
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Eye className="text-green-600" size={24} />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold">Dashboard Classe {getCurrentClass()?.name}</h1>
                <p className="text-green-200 text-sm">
                  Saisie rapide des résultats • {getCurrentClass()?.level}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadSupabaseData}
                className="flex items-center space-x-2 px-3 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                <span>Actualiser</span>
              </button>
              
              <div className="text-right">
                <div className="text-sm text-green-200">Mode saisie rapide</div>
                <button
                  onClick={requestPasswordForClassChange}
                  className="text-xs text-green-200 hover:text-white underline"
                >
                  Changer de classe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Sélecteur de test */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                <Activity size={24} className="text-blue-600" />
                <span>Sélectionner un test physique</span>
              </h2>
              {selectedTest && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">Test actuel:</div>
                  <div className="font-semibold text-blue-700">{getCurrentTest()?.name}</div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Object.entries(testsByCategory).map(([category, categoryTests]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1">
                    {category}
                  </h3>
                  {categoryTests.map(test => {
                    const IconComponent = categoryIcons[category] || Activity;
                    const isSelected = test.id === parseInt(selectedTest);
                    
                    return (
                      <button
                        key={test.id}
                        onClick={() => setSelectedTest(test.id.toString())}
                        className={`w-full p-2 rounded-lg border transition-all text-left text-sm ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent 
                            size={14} 
                            className={isSelected ? 'text-blue-600' : 'text-gray-500'} 
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-xs ${
                              isSelected ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              {test.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {test.unit}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {!selectedTest && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-center">
                <AlertCircle className="inline mr-2 text-yellow-600" size={16} />
                <span className="text-yellow-700 text-sm">
                  Sélectionnez un test pour commencer la saisie
                </span>
              </div>
            )}
          </div>

          {/* Barre de recherche et compteur d'élèves */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Rechercher un élève..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {selectedTest && getCurrentTest() && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Unité:</span> {getCurrentTest().unit}
                  </div>
                )}
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-medium">
                  {students.length} élèves
                </div>
              </div>
            </div>
          </div>

          {/* Grille des élèves */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {students.map(student => {
              const currentResult = results[student.id];
              const isEditing = editingStudent === student.id;
              const testCount = getStudentTestCount(student.id);
              const initials = getStudentInitials(student);
              
              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-lg shadow-md p-4 transition-all duration-200 cursor-pointer ${
                    isEditing 
                      ? 'border-2 border-blue-400 shadow-lg transform scale-105' 
                      : 'border border-gray-200 hover:shadow-lg hover:border-gray-300'
                  }`}
                  onClick={() => !isEditing && handleStudentClick(student)}
                >
                  <div className="text-center">
                    {/* Avatar avec initiales */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg ${
                      currentResult ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      {initials}
                    </div>
                    
                    {/* Nom de l'élève */}
                    <div className="font-semibold text-gray-800 mb-1">
                      {student.last_name?.toUpperCase() || 'EUDE'}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {student.first_name || 'Prénom'}
                    </div>
                    
                    {/* Zone de saisie ou résultat */}
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleInputKeyPress}
                        onBlur={() => {
                          if (inputValue.trim()) {
                            handleInputSubmit();
                          } else {
                            setEditingStudent(null);
                          }
                        }}
                        className="w-full p-2 text-center border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={getCurrentTest()?.unit}
                        autoFocus
                      />
                    ) : (
                      <div className="space-y-2">
                        {currentResult && selectedTest ? (
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-700">
                              {currentResult} {getCurrentTest()?.unit}
                            </div>
                            <div className="text-xs text-green-600">
                              {getCurrentTest()?.name}
                            </div>
                          </div>
                        ) : selectedTest ? (
                          <div className="text-sm text-gray-500">
                            Cliquer pour saisir
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            Sélectionner un test
                          </div>
                        )}
                        
                        {/* Compteur de tests */}
                        <div className="text-xs text-gray-500">
                          {testCount}/15 tests
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions en bas */}
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
                    <span>Valider</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Échap</kbd>
                    <span>Annuler</span>
                  </div>
                  {saving && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader className="animate-spin" size={16} />
                      <span>Sauvegarde...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickResultsEntrySupabase;