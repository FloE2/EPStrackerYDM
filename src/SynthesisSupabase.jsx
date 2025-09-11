// SynthesisSupabase.jsx - VERSION FINALE CORRIGÉE AVEC INSTANCE CENTRALISÉE
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  BookOpen,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Database,
  Zap,
  BarChart3,
  Calendar,
  ArrowRight,
  Trophy,
  Loader,
  Home,
  Play,
  Eye,
  Edit3
} from 'lucide-react';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { useSchoolYear } from './contexts/SchoolYearContext';

const SynthesisSupabase = ({ setActiveTab }) => {
  // Récupération de l'année scolaire sélectionnée
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();

  // États pour le dashboard
  const [dashboardData, setDashboardData] = useState({
    levels: {},
    connectionStatus: 'checking',
    lastUpdate: null,
    totalStudents: 0,
    totalTests: 0,
    schoolYear: selectedSchoolYear,
    globalStats: {
      totalPossibleTests: 0,
      completedTests: 0,
      globalProgression: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chargement des données pour le dashboard - FILTRÉ PAR ANNÉE
  useEffect(() => {
    if (selectedSchoolYear) {
      loadDashboardData();
    }
  }, [selectedSchoolYear]); // Recharger quand l'année change

  useEffect(() => {
    if (selectedSchoolYear) {
      // Actualisation automatique toutes les 5 minutes
      const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedSchoolYear]);

  const loadDashboardData = async () => {
    if (!selectedSchoolYear) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔗 Synthesis: Utilisation instance Supabase centralisée pour année', selectedSchoolYear);
      
      // Test de connexion Supabase avec instance centralisée
      const connectionTest = await supabase.from('classes').select('count', { count: 'exact', head: true });
      
      if (connectionTest.error) {
        setDashboardData(prev => ({ ...prev, connectionStatus: 'error' }));
        throw connectionTest.error;
      }
      
      setDashboardData(prev => ({ ...prev, connectionStatus: 'connected' }));
      
      // Charger les données principales - FILTRÉES PAR ANNÉE SCOLAIRE
      const [classesRes, studentsRes, testsRes, resultsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('school_year', selectedSchoolYear) // ← FILTRE OBLIGATOIRE
          .order('level'),
        supabase
          .from('students')
          .select('*')
          .eq('school_year', selectedSchoolYear), // ← FILTRE OBLIGATOIRE
        supabase.from('tests').select('*'),
        supabase
          .from('results')
          .select('*, students!inner(class_id, school_year)')
          .eq('students.school_year', selectedSchoolYear) // ← FILTRE OBLIGATOIRE
      ]);
      
      if (classesRes.error) throw classesRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (testsRes.error) throw testsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      
      // Organiser les données par niveau
      const levels = {};
      const classes = classesRes.data || [];
      const students = studentsRes.data || [];
      const tests = testsRes.data || [];
      const results = resultsRes.data || [];
      
      // Initialiser les niveaux
      ['6ème', '5ème', '4ème', '3ème'].forEach(level => {
        levels[level] = {
          level,
          classes: [],
          totalStudents: 0,
          totalPossibleTests: 0,
          completedTests: 0,
          progression: 0,
          classesData: []
        };
      });
      
      // Calculer les stats globales
      let totalPossibleGlobal = 0;
      let completedGlobal = 0;
      
      // Remplir les données par niveau
      classes.forEach(classe => {
        const classStudents = students.filter(s => s.class_id === classe.id);
        const classResults = results.filter(r => classStudents.some(s => s.id === r.student_id));
        
        const totalPossible = classStudents.length * tests.length;
        const completed = classResults.length;
        const progression = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0;
        
        // Ajouter aux stats globales
        totalPossibleGlobal += totalPossible;
        completedGlobal += completed;
        
        const levelData = levels[classe.level];
        if (levelData) {
          levelData.classes.push(classe.name);
          levelData.totalStudents += classStudents.length;
          levelData.totalPossibleTests += totalPossible;
          levelData.completedTests += completed;
          levelData.classesData.push({
            id: classe.id,
            name: classe.name,
            level: classe.level,
            students: classStudents.length,
            completed,
            totalPossible,
            progression
          });
          
          // Recalculer la progression globale du niveau
          levelData.progression = levelData.totalPossibleTests > 0 
            ? Math.round((levelData.completedTests / levelData.totalPossibleTests) * 100)
            : 0;
        }
      });
      
      setDashboardData({
        levels,
        connectionStatus: 'connected',
        lastUpdate: new Date(),
        totalStudents: students.length,
        totalTests: tests.length,
        schoolYear: selectedSchoolYear,
        globalStats: {
          totalPossibleTests: totalPossibleGlobal,
          completedTests: completedGlobal,
          globalProgression: totalPossibleGlobal > 0 ? Math.round((completedGlobal / totalPossibleGlobal) * 100) : 0
        }
      });
      
    } catch (err) {
      console.error('Erreur dashboard:', err);
      setError(err.message);
      setDashboardData(prev => ({ ...prev, connectionStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Couleurs par niveau
  const getLevelColors = (level) => {
    const colors = {
      '6ème': { 
        primary: 'bg-blue-500', 
        light: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-700',
        gradient: 'from-blue-500 to-blue-600',
        ring: 'ring-blue-500'
      },
      '5ème': { 
        primary: 'bg-emerald-500', 
        light: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-700',
        gradient: 'from-emerald-500 to-emerald-600',
        ring: 'ring-emerald-500'
      },
      '4ème': { 
        primary: 'bg-orange-500', 
        light: 'bg-orange-50', 
        border: 'border-orange-200', 
        text: 'text-orange-700',
        gradient: 'from-orange-500 to-orange-600',
        ring: 'ring-orange-500'
      },
      '3ème': { 
        primary: 'bg-purple-500', 
        light: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700',
        gradient: 'from-purple-500 to-purple-600',
        ring: 'ring-purple-500'
      }
    };
    return colors[level] || colors['6ème'];
  };

  // Navigation vers les différentes pages
  const navigateToPage = (page, classId = null) => {
    if (!setActiveTab) {
      console.log(`Navigation vers: ${page}`);
      return;
    }

    // Navigation selon le type de page
    switch (page) {
      case 'quick-entry':
        setActiveTab('quick-entry');
        break;
      case 'results':
        setActiveTab('results');
        break;
      case 'classes':
        setActiveTab('classes');
        break;
      case 'tests':
        setActiveTab('tests');
        break;
      default:
        // Pour les liens spécifiques à une classe
        if (page.includes('results-entry?class=')) {
          setActiveTab('results');
        } else if (page.includes('quick-entry?test=')) {
          setActiveTab('quick-entry');
        } else {
          console.log(`Navigation vers: ${page}`);
        }
    }
  };

  // Statut de connexion Supabase
  const ConnectionStatus = () => {
    const { connectionStatus } = dashboardData;
    
    if (connectionStatus === 'checking') {
      return (
        <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs">
          <Loader className="animate-spin" size={12} />
          <span>Vérification...</span>
        </div>
      );
    }
    
    if (connectionStatus === 'connected') {
      return (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
          <Database size={12} />
          <span>Instance centralisée</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
        <AlertCircle size={12} />
        <span>Erreur connexion</span>
      </div>
    );
  };

  // Gestion des erreurs
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">Erreur de connexion</h2>
          <p className="text-gray-600 mb-4 text-center text-sm">{error}</p>
          <button
            onClick={loadDashboardData}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer la connexion
          </button>
        </div>
      </div>
    );
  }

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Chargement du dashboard</h2>
          <p className="text-gray-500 text-sm">Instance Supabase centralisée...</p>
        </div>
      </div>
    );
  }

  // Vérifier s'il y a des données pour cette année
  const hasDataForYear = dashboardData.totalStudents > 0 || 
                         Object.values(dashboardData.levels).some(level => level.classesData.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* HEADER PRINCIPAL - AVEC ANNÉE SCOLAIRE */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Tableau de Bord - EPS SANTÉ
                </h1>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Collège Yves du Manoir</span>
                  <span className="text-gray-400">•</span>
                  <Calendar size={14} className="text-blue-600" />
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {selectedSchoolYear}
                  </span>
                  {selectedSchoolYear === currentSchoolYear && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      Année courante
                    </span>
                  )}
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                    Instance unique
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ConnectionStatus />
              <button 
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* MESSAGE SI AUCUNE DONNÉE POUR CETTE ANNÉE */}
        {!hasDataForYear ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <Calendar size={64} className="mx-auto text-yellow-500 mb-6" />
            <h3 className="text-2xl font-semibold text-yellow-800 mb-4">
              Aucune donnée pour {selectedSchoolYear}
            </h3>
            <p className="text-yellow-700 mb-6 text-lg max-w-2xl mx-auto">
              Cette année scolaire ne contient encore aucune classe ou élève. 
              Commencez par configurer vos classes dans la section "Gestion des Classes" 
              ou changez d'année scolaire dans le header.
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => navigateToPage('classes')}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
              >
                Configurer les classes
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STATS GLOBALES - Version compacte */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Élèves</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.totalStudents}</p>
                    <p className="text-xs text-gray-500">
                      dans {Object.values(dashboardData.levels).reduce((sum, level) => sum + level.classes.length, 0)} classes
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Tests</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.totalTests}</p>
                    <p className="text-xs text-gray-500">épreuves</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Complétés</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.globalStats.completedTests}</p>
                    <p className="text-xs text-gray-500">sur {dashboardData.globalStats.totalPossibleTests}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Progression</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.globalStats.globalProgression}%</p>
                    <p className="text-xs text-gray-500">global</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* VUE PAR NIVEAU - Version compacte 2x2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(dashboardData.levels).map(([level, levelData]) => {
                const colors = getLevelColors(level);
                
                return (
                  <div key={level} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all">
                    {/* Header niveau compact */}
                    <div className={`bg-gradient-to-r ${colors.gradient} p-3 text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{level}</h3>
                            <p className="text-white/90 text-xs">
                              {levelData.classes.length} classe{levelData.classes.length !== 1 ? 's' : ''} • {levelData.totalStudents} élèves
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{levelData.progression}%</div>
                        </div>
                      </div>
                      
                      {/* Barre de progression compacte */}
                      <div className="mt-2">
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-white rounded-full h-2 transition-all duration-700"
                            style={{ width: `${levelData.progression}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-white/90 mt-1">
                          <span>{levelData.completedTests} tests</span>
                          <span>{levelData.totalPossibleTests} total</span>
                        </div>
                      </div>
                    </div>

                    {/* Détail des classes - Grille 3 colonnes */}
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {levelData.classesData.length > 0 ? (
                          levelData.classesData.map((classe) => (
                            <div 
                              key={classe.id} 
                              onClick={() => navigateToPage(`results-entry?class=${classe.id}`)}
                              className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer text-center"
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-3 h-3 rounded-full ${colors.primary}`}></div>
                                <h4 className="font-medium text-gray-800 text-sm">
                                  {classe.name}
                                </h4>
                              </div>
                              
                              <p className="text-xs text-gray-600 mb-2">{classe.students} élèves</p>
                              
                              <div className={`text-lg font-bold ${colors.text} mb-1`}>
                                {classe.progression}%
                              </div>
                              
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div 
                                  className={`rounded-full h-2 ${colors.primary} transition-all duration-700`}
                                  style={{ width: `${classe.progression}%` }}
                                ></div>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                {classe.completed}/{classe.totalPossible}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-4 text-gray-500">
                            <BookOpen size={20} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs">Aucune classe</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTIONS RAPIDES - Version compacte */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <Zap className="text-yellow-500" size={20} />
                  <span>Actions rapides</span>
                </h3>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Année {selectedSchoolYear}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <button 
                  onClick={() => navigateToPage('quick-entry')}
                  className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Target size={20} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">Mode Atelier</div>
                    <div className="text-xs text-blue-100">Saisie par test</div>
                  </div>
                </button>

                <button 
                  onClick={() => navigateToPage('results')}
                  className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Users size={20} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">Saisie Individuelle</div>
                    <div className="text-xs text-green-100">Par élève</div>
                  </div>
                </button>

                <button 
                  onClick={() => navigateToPage('classes')}
                  className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Settings size={20} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">Gestion</div>
                    <div className="text-xs text-orange-100">Classes & Élèves</div>
                  </div>
                </button>

                <button 
                  onClick={() => navigateToPage('tests')}
                  className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BarChart3 size={20} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">Tests Physiques</div>
                    <div className="text-xs text-purple-100">Gestion tests</div>
                  </div>
                </button>
              </div>
            </div>

            {/* CLASSES PRIORITAIRES - Version ultra-compacte */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <Trophy size={20} className="text-yellow-500" />
                  <span>Classes prioritaires</span>
                </h3>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {selectedSchoolYear}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                {Object.values(dashboardData.levels)
                  .flatMap(level => level.classesData.map(classe => ({ ...classe, level: level.level })))
                  .sort((a, b) => a.progression - b.progression)
                  .slice(0, 9)
                  .map((classe) => {
                    const colors = getLevelColors(classe.level);
                    const urgencyLevel = classe.progression < 25 ? 'high' : classe.progression < 50 ? 'medium' : 'low';
                    
                    const urgencyStyles = {
                      high: {
                        bg: 'border-red-300 bg-red-50 hover:bg-red-100',
                        icon: <AlertCircle className="text-red-500" size={14} />,
                        badge: 'bg-red-500 text-white'
                      },
                      medium: {
                        bg: 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100', 
                        icon: <Clock className="text-yellow-500" size={14} />,
                        badge: 'bg-yellow-500 text-white'
                      },
                      low: {
                        bg: 'border-green-300 bg-green-50 hover:bg-green-100',
                        icon: <CheckCircle className="text-green-500" size={14} />,
                        badge: 'bg-green-500 text-white'
                      }
                    };
                    
                    const urgencyLabels = {
                      high: 'Urgent',
                      medium: 'Attention',
                      low: 'OK'
                    };
                    
                    return (
                      <div 
                        key={`${classe.level}-${classe.name}`}
                        onClick={() => navigateToPage(`results-entry?class=${classe.id}`)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${urgencyStyles[urgencyLevel].bg}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${colors.primary}`}></div>
                            <div>
                              <span className="font-bold text-gray-800 text-sm">
                                {classe.name}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">({classe.level})</span>
                                <span className={`text-xs px-1 py-0.5 rounded-full ${urgencyStyles[urgencyLevel].badge}`}>
                                  {urgencyLabels[urgencyLevel]}
                                </span>
                              </div>
                            </div>
                          </div>
                          {urgencyStyles[urgencyLevel].icon}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">{classe.students} élèves</span>
                            <span className={`font-bold ${colors.text}`}>{classe.progression}%</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`rounded-full h-2 ${colors.primary} transition-all duration-500`}
                              style={{ width: `${classe.progression}%` }}
                            ></div>
                          </div>
                          
                          <div className="text-xs text-gray-500 text-center">
                            {classe.completed}/{classe.totalPossible} tests
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* RÉSUMÉ DU JOUR - Version compacte avec année */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <Calendar size={20} />
                    <span>Dashboard {selectedSchoolYear}</span>
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    {dashboardData.lastUpdate ? 
                      `MAJ: ${dashboardData.lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 
                      'Première connexion'
                    }
                    {selectedSchoolYear === currentSchoolYear && (
                      <span className="ml-2 bg-green-500 bg-opacity-80 px-2 py-1 rounded-full text-xs">
                        Année courante
                      </span>
                    )}
                    <span className="ml-2 bg-blue-500 bg-opacity-80 px-2 py-1 rounded-full text-xs">
                      Instance unique
                    </span>
                  </p>
                </div>
                
                {/* Résumé visuel par niveau - compact */}
                <div className="flex items-center space-x-4">
                  {Object.entries(dashboardData.levels).map(([level, levelData]) => (
                    <div key={level} className="text-center">
                      <div className="text-lg font-bold">
                        {levelData.progression}%
                      </div>
                      <div className="text-xs text-indigo-200">{level}</div>
                      <div className="w-12 bg-white/20 rounded-full h-1 mt-1">
                        <div 
                          className="bg-white rounded-full h-1 transition-all duration-700"
                          style={{ width: `${levelData.progression}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* FOOTER compact avec info année et instance centralisée */}
        <div className="text-center text-gray-500 text-xs">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-1">
              <Database size={12} />
              <span>Instance unique</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>Filtré par année</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <CheckCircle size={12} className="text-green-500" />
              <span>Plus d'erreurs GoTrueClient</span>
            </div>
          </div>
          <p className="mt-1">Dashboard Aptitudes Physiques - Collège Yves du Manoir - {selectedSchoolYear} - Instance Supabase centralisée</p>
        </div>
      </div>
    </div>
  );
};

export default SynthesisSupabase;