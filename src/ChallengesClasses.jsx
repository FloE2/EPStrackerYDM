// ChallengesClasses.jsx - Challenges et comparaisons entre classes
import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Target,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  PieChart,
  Award,
  Star,
  Zap,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  Download,
  Info,
  Heart,
  GitBranch,
  Minimize2,
  Clock,
  ArrowUp,
  ArrowDown,
  Equal
} from 'lucide-react';

import { supabase } from './lib/supabase.js';
import { useSchoolYear } from './contexts/SchoolYearContext.jsx';

const ChallengesClasses = () => {
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Données
  const [classes, setClasses] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Filtres et sélections
  const [selectedComparison, setSelectedComparison] = useState('test'); // 'test', 'category', 'participation'
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ENDURANCE');
  const [selectedLevel, setSelectedLevel] = useState('all'); // 'all', '6ème', '5ème', etc.
  const [sortBy, setSortBy] = useState('average'); // 'average', 'participation', 'excellence'
  
  // Données calculées
  const [challengeResults, setChallengeResults] = useState([]);

  // Configuration des catégories
  const categories = {
    ENDURANCE: {
      name: "Endurance",
      icon: Activity,
      color: "#3b82f6",
      bgColor: "from-blue-50 to-blue-100",
      description: "Capacité cardio-respiratoire"
    },
    FORCE: {
      name: "Force",
      icon: Target,
      color: "#ef4444",
      bgColor: "from-red-50 to-red-100",
      description: "Force musculaire et explosive"
    },
    VITESSE: {
      name: "Vitesse",
      icon: Zap,
      color: "#eab308",
      bgColor: "from-yellow-50 to-yellow-100",
      description: "Vitesse de déplacement"
    },
    COORDINATION: {
      name: "Coordination",
      icon: GitBranch,
      color: "#a855f7",
      bgColor: "from-purple-50 to-purple-100",
      description: "Coordination motrice"
    },
    EQUILIBRE: {
      name: "Équilibre",
      icon: Users,
      color: "#6366f1",
      bgColor: "from-indigo-50 to-indigo-100",
      description: "Capacité d'équilibre"
    },
    SOUPLESSE: {
      name: "Souplesse",
      icon: Minimize2,
      color: "#22c55e",
      bgColor: "from-green-50 to-green-100",
      description: "Flexibilité articulaire"
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
        accent: 'bg-blue-600'
      },
      '5ème': { 
        primary: 'bg-emerald-500', 
        light: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-700',
        accent: 'bg-emerald-600'
      },
      '4ème': { 
        primary: 'bg-orange-500', 
        light: 'bg-orange-50', 
        border: 'border-orange-200', 
        text: 'text-orange-700',
        accent: 'bg-orange-600'
      },
      '3ème': { 
        primary: 'bg-purple-500', 
        light: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700',
        accent: 'bg-purple-600'
      }
    };
    return colors[level] || colors['6ème'];
  };

  // Chargement des données
  useEffect(() => {
    if (selectedSchoolYear) {
      loadData();
    }
  }, [selectedSchoolYear]);

  // Recalcul des résultats quand les filtres changent
  useEffect(() => {
    if (classes.length > 0 && tests.length > 0 && results.length > 0) {
      calculateChallengeResults();
    }
  }, [selectedComparison, selectedTest, selectedCategory, selectedLevel, sortBy, classes, tests, results, students]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger toutes les données pour l'année scolaire
      const [classesRes, testsRes, studentsRes, resultsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('school_year', selectedSchoolYear)
          .order('level')
          .order('name'),
        supabase
          .from('tests')
          .select('*')
          .order('category')
          .order('name'),
        supabase
          .from('students')
          .select('*')
          .eq('school_year', selectedSchoolYear),
        supabase
          .from('results')
          .select(`
            *,
            tests!inner(name, category, unit),
            students!inner(class_id, school_year, gender)
          `)
          .eq('students.school_year', selectedSchoolYear)
          .not('value', 'is', null)
      ]);

      if (classesRes.error) throw classesRes.error;
      if (testsRes.error) throw testsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setClasses(classesRes.data || []);
      setTests(testsRes.data || []);
      setStudents(studentsRes.data || []);
      setResults(resultsRes.data || []);

      // Sélectionner le premier test par défaut
      if (testsRes.data && testsRes.data.length > 0 && !selectedTest) {
        setSelectedTest(testsRes.data[0]);
      }

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour déterminer si un score plus élevé est meilleur pour un test
  const isHigherBetter = (testName) => {
    // Tests où un temps/score plus faible est meilleur
    const lowerIsBetterTests = ['30 mètres', 'SPRINTS', 'VITESSE', 'TEMPS'];
    
    // Vérifier si le nom du test contient des mots clés indiquant que plus bas = mieux
    return !lowerIsBetterTests.some(keyword => 
      testName.toUpperCase().includes(keyword.toUpperCase())
    );
  };

  // Fonction principale de calcul des résultats du challenge
  const calculateChallengeResults = () => {
    let filteredClasses = classes;
    
    // Filtrer par niveau si nécessaire
    if (selectedLevel !== 'all') {
      filteredClasses = classes.filter(c => c.level === selectedLevel);
    }

    const challengeData = filteredClasses.map(classe => {
      const classStudents = students.filter(s => s.class_id === classe.id);
      let classResults = [];
      let totalTests = 0;
      let completedTests = 0;

      if (selectedComparison === 'test' && selectedTest) {
        // Comparaison par test spécifique
        classResults = results.filter(r => 
          r.tests.name === selectedTest.name && 
          classStudents.some(s => s.id === r.student_id)
        );
        totalTests = classStudents.length;
        completedTests = classResults.length;
      } else if (selectedComparison === 'category') {
        // Comparaison par catégorie
        classResults = results.filter(r => 
          r.tests.category === selectedCategory && 
          classStudents.some(s => s.id === r.student_id)
        );
        const categoryTests = tests.filter(t => t.category === selectedCategory);
        totalTests = classStudents.length * categoryTests.length;
        completedTests = classResults.length;
      } else if (selectedComparison === 'participation') {
        // Comparaison globale de participation
        classResults = results.filter(r => 
          classStudents.some(s => s.id === r.student_id)
        );
        totalTests = classStudents.length * tests.length;
        completedTests = classResults.length;
      }

      // Calculs statistiques
      const values = classResults.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const participation = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
      const excellentCount = values.filter(v => v >= 85).length; // Supposons que 85+ = excellent
      
      // Calcul du meilleur score de la classe
      let bestScore = null;
      if (values.length > 0) {
        if (selectedComparison === 'test' && selectedTest) {
          // Pour un test spécifique, on applique la logique selon le type de test
          const higherBetter = isHigherBetter(selectedTest.name);
          bestScore = higherBetter ? Math.max(...values) : Math.min(...values);
        } else {
          // Pour les catégories ou participation globale, on prend le score le plus élevé
          bestScore = Math.max(...values);
        }
        bestScore = Math.round(bestScore * 100) / 100;
      }
      
      return {
        classe,
        studentsCount: classStudents.length,
        totalTests,
        completedTests,
        average: Math.round(average * 100) / 100,
        bestScore: bestScore,
        participation: Math.round(participation),
        excellentCount,
        excellentRate: classStudents.length > 0 ? Math.round((excellentCount / classStudents.length) * 100) : 0,
        values
      };
    });

    // Trier selon le critère sélectionné
    challengeData.sort((a, b) => {
      switch (sortBy) {
        case 'average':
          return b.average - a.average;
        case 'participation':
          return b.participation - a.participation;
        case 'excellence':
          return b.excellentRate - a.excellentRate;
        default:
          return b.average - a.average;
      }
    });

    setChallengeResults(challengeData);
  };

  // Fonction pour obtenir l'icône de médaille
  const getMedalIcon = (position) => {
    switch (position) {
      case 0:
        return <Trophy className="text-yellow-500" size={24} />;
      case 1:
        return <Medal className="text-gray-400" size={24} />;
      case 2:
        return <Award className="text-amber-600" size={24} />;
      default:
        return <Star className="text-blue-500" size={16} />;
    }
  };

  // Messages encourageants selon la position
  const getEncouragingMessage = (position, totalClasses, data) => {
    if (totalClasses === 1) return "Seule classe participante - Bravo !";
    
    switch (position) {
      case 0:
        return "🏆 Champions ! Félicitations à toute la classe !";
      case 1:
        return "🥈 Excellente performance ! Très proche du sommet !";
      case 2:
        return "🥉 Très bon travail ! Sur le podium !";
      default:
        if (data.participation >= 80) return "💪 Excellent engagement ! Participation remarquable !";
        if (data.average > 60) return "👏 Beau travail ! Continuez vos efforts !";
        return "🌱 En progression ! Chaque effort compte !";
    }
  };

  // Export des résultats
  const exportResults = () => {
    const csvContent = challengeResults.map((data, index) => ({
      Position: index + 1,
      Classe: data.classe.name,
      Niveau: data.classe.level,
      Élèves: data.studentsCount,
      Moyenne: data.average,
      MeilleurScore: data.bestScore,
      Participation: `${data.participation}%`,
      Excellents: data.excellentCount
    }));
    
    console.log('Export CSV:', csvContent);
    // Ici vous pourriez implémenter l'export CSV réel
  };

  // Interface de rendu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
          <p className="text-gray-600">Chargement des données de challenge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Erreur</p>
          <p>{error}</p>
          <button 
            onClick={loadData} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <Trophy size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Challenges Classes</h1>
                <p className="text-blue-100">Comparaisons et défis motivants entre classes</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm opacity-90 mb-1">
                <Calendar size={14} />
                <span>Année {selectedSchoolYear}</span>
                {selectedSchoolYear === currentSchoolYear && (
                  <span className="bg-green-500 bg-opacity-80 px-2 py-1 rounded text-xs">
                    Courante
                  </span>
                )}
              </div>
              <div className="text-xs opacity-75">
                {classes.length} classes • {students.length} élèves
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Panneau de contrôle */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Configuration du Challenge</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Type de comparaison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de comparaison
              </label>
              <select
                value={selectedComparison}
                onChange={(e) => setSelectedComparison(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="test">Par test spécifique</option>
                <option value="category">Par catégorie</option>
                <option value="participation">Participation globale</option>
              </select>
            </div>

            {/* Sélection test/catégorie */}
            {selectedComparison === 'test' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test à comparer
                </label>
                <select
                  value={selectedTest?.id || ''}
                  onChange={(e) => {
                    const test = tests.find(t => t.id === parseInt(e.target.value));
                    setSelectedTest(test);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name} ({test.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedComparison === 'category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie à comparer
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(categories).map(([key, category]) => (
                    <option key={key} value={key}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre par niveau */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous niveaux</option>
                <option value="6ème">6ème uniquement</option>
                <option value="5ème">5ème uniquement</option>
                <option value="4ème">4ème uniquement</option>
                <option value="3ème">3ème uniquement</option>
              </select>
            </div>

            {/* Critère de tri */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classer par
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="average">Moyenne des résultats</option>
                <option value="participation">Taux de participation</option>
                <option value="excellence">Taux d'excellence (85+)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info size={16} />
              <span>
                Challenge basé sur {challengeResults.length} classe{challengeResults.length !== 1 ? 's' : ''} • 
                Évaluation bienveillante et motivante
              </span>
            </div>
            <button
              onClick={exportResults}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download size={16} />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {/* Résultats du challenge */}
        {challengeResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune donnée disponible</h3>
            <p className="text-gray-500">
              Aucun résultat trouvé pour les critères sélectionnés. 
              Vérifiez que les élèves ont bien passé les tests.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {challengeResults.map((data, index) => {
              const colors = getLevelColors(data.classe.level);
              const message = getEncouragingMessage(index, challengeResults.length, data);
              
              return (
                <div
                  key={data.classe.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    index === 0 ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-white' :
                    index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-white' :
                    index === 2 ? 'border-amber-600 bg-gradient-to-r from-amber-50 to-white' :
                    colors.border
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Position et médaille */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-gray-400">
                          #{index + 1}
                        </div>
                        {getMedalIcon(index)}
                      </div>
                      
                      {/* Infos classe */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {data.classe.name} ({data.classe.level})
                        </h3>
                        <p className="text-green-600 font-medium">{message}</p>
                      </div>
                    </div>

                    {/* Statistiques - MODIFIÉ POUR 5 COLONNES */}
                    <div className="grid grid-cols-5 gap-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {data.average || '—'}
                        </div>
                        <div className="text-xs text-gray-500">Moyenne</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-indigo-600">
                          {data.bestScore !== null ? data.bestScore : '—'}
                        </div>
                        <div className="text-xs text-gray-500">Meilleur score</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {data.participation}%
                        </div>
                        <div className="text-xs text-gray-500">Participation</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {data.excellentCount}
                        </div>
                        <div className="text-xs text-gray-500">Excellents</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {data.studentsCount}
                        </div>
                        <div className="text-xs text-gray-500">Élèves</div>
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression pour la participation */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Participation de la classe</span>
                      <span className="text-sm font-medium text-gray-800">
                        {data.completedTests}/{data.totalTests} tests réalisés
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          data.participation >= 90 ? 'bg-green-500' :
                          data.participation >= 70 ? 'bg-blue-500' :
                          data.participation >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${data.participation}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message de conclusion */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center border border-blue-200">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Heart className="text-red-500" size={24} />
            <h3 className="text-xl font-bold text-gray-800">
              Félicitations à toutes les classes !
            </h3>
          </div>
          <p className="text-gray-700 max-w-3xl mx-auto">
            Chaque classe contribue à l'excellence de notre établissement. 
            Les challenges sont l'occasion de se motiver mutuellement et de progresser ensemble. 
            Continuez vos efforts - chaque mouvement compte pour votre santé !
          </p>
          <div className="mt-4 text-sm text-gray-600 bg-white bg-opacity-70 p-3 rounded">
            <strong>Esprit sportif :</strong> Ces classements visent à encourager et motiver, 
            pas à créer de la compétition négative. L'important est la participation et les progrès de chacun !
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengesClasses;