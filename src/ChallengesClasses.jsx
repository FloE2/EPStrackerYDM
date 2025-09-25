// ChallengesClasses.jsx - VERSION OPTIMISÉE AVEC CACHE
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
  const [selectedComparison, setSelectedComparison] = useState('test');
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('TOUS');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('average');
  
  // Données calculées
  const [challengeResults, setChallengeResults] = useState([]);
  
  // Cache pour les barèmes dynamiques
  const [baremesCache, setBaremesCache] = useState({});

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

  // ============================================================================
  // SYSTÈME DE NOTATION DYNAMIQUE AVEC CACHE
  // ============================================================================

  const calculatePercentiles = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    return {
      p10: sorted[Math.floor(n * 0.10)],
      p25: sorted[Math.floor(n * 0.25)], 
      p50: sorted[Math.floor(n * 0.50)],
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.90)]
    };
  };

  const getTestDirection = (testName) => {
    const timeBasedTests = ['SPRINTS 10 x 5', '30 mètres'];
    const speedBasedTests = ['36"-24"', 'VITESSE'];
    const higherIsBetterTests = [
      'COOPER', 'DEMI-COOPER', 'NAVETTE', 'RECTANGLE MAGIQUE', 
      'SAUT', 'LANCER', 'CHAISE', 'PLANCHE', 'SUSPENSION', 'POIGNÉE',
      'FOULÉES', 'TRIPLE SAUT', 'MONOPODAL', 'SOUPLESSE'
    ];

    if (timeBasedTests.some(test => testName.includes(test))) return false;
    if (speedBasedTests.some(test => testName.includes(test))) return true;
    if (higherIsBetterTests.some(test => testName.includes(test))) return true;
    
    return true;
  };

  const getTestData = async (testName, studentLevel, studentGender) => {
    // Vérifier le cache d'abord
    const cacheKey = `${testName}_${studentLevel}_${studentGender}`;
    if (baremesCache[cacheKey]) {
      return baremesCache[cacheKey];
    }

    try {
      const { data: results, error } = await supabase
        .from('results')
        .select(`
          value,
          tests!inner(name),
          students!inner(gender, school_year, classes!inner(level))
        `)
        .eq('tests.name', testName)
        .eq('students.gender', studentGender)
        .eq('students.classes.level', studentLevel)
        .eq('students.school_year', selectedSchoolYear)
        .not('value', 'is', null);

      if (error) {
        console.error('Erreur Supabase:', error);
        return null;
      }

      if (!results || results.length < 5) {
        const result = {
          sampleSize: results?.length || 0,
          insufficientData: true,
          message: "Échantillon trop faible"
        };
        setBaremesCache(prev => ({ ...prev, [cacheKey]: result }));
        return result;
      }

      const values = results.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
      
      if (values.length < 5) {
        const result = {
          sampleSize: values.length,
          insufficientData: true,
          message: "Échantillon trop faible"
        };
        setBaremesCache(prev => ({ ...prev, [cacheKey]: result }));
        return result;
      }

      const percentiles = calculatePercentiles(values);
      const higherIsBetter = getTestDirection(testName);
      const bestPerformance = higherIsBetter 
        ? Math.max(...values) 
        : Math.min(...values);
      
      const result = {
        sampleSize: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        moyenne: values.reduce((a, b) => a + b, 0) / values.length,
        percentiles,
        bestPerformance,
        higherIsBetter,
        insufficientData: false
      };

      setBaremesCache(prev => ({ ...prev, [cacheKey]: result }));
      return result;

    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
  };

  const scoreTestWithDynamicBareme = async (value, testName, studentLevel, studentGender) => {
    const testData = await getTestData(testName, studentLevel, studentGender);
    
    if (!testData) {
      return {
        score: 50,
        message: "Données insuffisantes",
        method: "score_defaut"
      };
    }

    if (testData.insufficientData) {
      return {
        score: null,
        message: testData.message,
        method: "echantillon_insuffisant",
        sampleSize: testData.sampleSize
      };
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return { score: 0, message: "Valeur invalide", method: "erreur" };

    const { percentiles, higherIsBetter } = testData;
    
    let score;

    if (higherIsBetter) {
      if (numericValue >= percentiles.p90) {
        score = Math.floor(Math.random() * 16) + 85;
      } else if (numericValue >= percentiles.p75) {
        score = Math.floor(Math.random() * 15) + 70;
      } else if (numericValue >= percentiles.p50) {
        score = Math.floor(Math.random() * 15) + 55;
      } else if (numericValue >= percentiles.p25) {
        score = Math.floor(Math.random() * 15) + 40;
      } else {
        score = Math.floor(Math.random() * 15) + 10;
      }
    } else {
      if (numericValue <= percentiles.p10) {
        score = Math.floor(Math.random() * 16) + 85;
      } else if (numericValue <= percentiles.p25) {
        score = Math.floor(Math.random() * 15) + 70;
      } else if (numericValue <= percentiles.p50) {
        score = Math.floor(Math.random() * 15) + 55;
      } else if (numericValue <= percentiles.p75) {
        score = Math.floor(Math.random() * 15) + 40;
      } else {
        score = Math.floor(Math.random() * 15) + 10;
      }
    }

    return {
      score,
      message: `Calculé sur ${testData.sampleSize} élèves`,
      method: "bareme_dynamique"
    };
  };

  const calculateCategoryScoreForStudent = async (studentTests, studentLevel, studentGender) => {
    if (studentTests.length === 0) return null;

    let totalScore = 0;
    let validTests = 0;

    for (const test of studentTests) {
      const result = await scoreTestWithDynamicBareme(
        test.value, 
        test.name, 
        studentLevel, 
        studentGender
      );
      
      if (result.score !== null && result.method !== "echantillon_insuffisant") {
        totalScore += result.score;
        validTests++;
      }
    }

    if (validTests === 0) return null;

    return Math.round(totalScore / validTests);
  };

  // ============================================================================
  // FONCTIONS UTILITAIRES POUR LES UNITÉS
  // ============================================================================

  const getTestDisplayUnit = (testName, testUnit) => {
    if (!testName && !testUnit) return '';
    
    const testNameUpper = testName?.toUpperCase() || '';
    const testUnitLower = testUnit?.toLowerCase() || '';
    
    const distanceTests = ['DEMI-COOPER', 'COOPER', 'TEST COOPER'];
    if (distanceTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'mètres' || testUnitLower === 'm') {
      return ' m';
    }
    
    const enduranceTests = ['LUC LEGER', 'LUC-LEGER', 'NAVETTE', 'PALIER'];
    if (enduranceTests.some(keyword => testNameUpper.includes(keyword)) || 
        testUnitLower.includes('palier')) {
      return ' paliers';
    }
    
    const speedTests = ['36"-24"', '36-24'];
    if (speedTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'km/h') {
      return ' km/h';
    }
    
    const timeTests = ['30 MÈTRES', '30M', '30 M', 'SPRINTS', 'VITESSE', 'PLAT'];
    if (timeTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'secondes' || testUnitLower === 'sec' || testUnitLower === 's') {
      return ' s';
    }
    
    const minuteTests = ['CHAISE', 'KILLY'];
    if (minuteTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'minutes' || testUnitLower === 'min') {
      return ' min';
    }
    
    const strengthTests = ['POIGNEE', 'POIGNÉE', 'MAIN'];
    if (strengthTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'kilos' || testUnitLower === 'kg') {
      return ' kg';
    }
    
    const jumpTests = ['SAUT', 'LONGUEUR', 'LANCER', 'BALLON', 'BASKET', 'SOUPLESSE', 'ÉPAULES', 'POSTÉRIEURE'];
    if (jumpTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'centimètres' || testUnitLower === 'cm') {
      return ' cm';
    }
    
    const balanceTimeTests = ['MONOPODAL', 'ÉQUILIBRE'];
    if (balanceTimeTests.some(keyword => testNameUpper.includes(keyword)) &&
        (testUnitLower === 'sec' || testUnitLower === 'secondes')) {
      return ' s';
    }
    
    const balanceAttemptTests = ['FLAMINGO', 'POUTRE'];
    if (balanceAttemptTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower.includes('tentative') || testUnitLower.includes('essai')) {
      return ' tentatives';
    }
    
    const suspensionTests = ['SUSPENSION', 'BARRE', 'PLANCHE'];
    if (suspensionTests.some(keyword => testNameUpper.includes(keyword)) &&
        (testUnitLower === 'sec' || testUnitLower === 'secondes')) {
      return ' s';
    }
    
    const repetitionTests = ['POMPES', 'ABDOS', 'TRACTIONS', 'SQUAT', 'REPETITIONS'];
    if (repetitionTests.some(keyword => testNameUpper.includes(keyword)) ||
        testUnitLower === 'répétitions' || testUnitLower === 'reps') {
      return ' reps';
    }
    
    return '/100';
  };

  const formatTestValue = (value, testName, testUnit) => {
    if (value === null || value === undefined) return '—';
    
    const unit = getTestDisplayUnit(testName, testUnit);
    
    if (unit === ' paliers') return `${Math.round(value)}${unit}`;
    if (unit === ' m') return `${Math.round(value)}${unit}`;
    if (unit === ' km/h') return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
    if (unit === ' s') return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
    if (unit === ' min') return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
    if (unit === ' cm') return `${Math.round(value)}${unit}`;
    if (unit === ' kg') return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
    if (unit === ' tentatives') return `${Math.round(value)}${unit}`;
    if (unit === ' reps') return `${Math.round(value)}${unit}`;
    
    return `${Math.round(value)}${unit}`;
  };

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  useEffect(() => {
    if (selectedSchoolYear) {
      setBaremesCache({});
      loadData();
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    const loadChallengeResults = async () => {
      if (classes.length > 0 && tests.length > 0 && results.length > 0) {
        setLoading(true);
        await calculateChallengeResults();
        setLoading(false);
      }
    };
    
    loadChallengeResults();
  }, [selectedComparison, selectedTest, selectedCategory, selectedLevel, sortBy, classes, tests, results, students]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

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

  // ============================================================================
  // CALCUL DES RÉSULTATS
  // ============================================================================

  const isHigherBetter = (testName) => {
    const lowerIsBetterTests = ['30 mètres', 'SPRINTS', 'VITESSE', 'TEMPS'];
    return !lowerIsBetterTests.some(keyword => 
      testName.toUpperCase().includes(keyword.toUpperCase())
    );
  };

  const calculateChallengeResults = async () => {
    let filteredClasses = classes;
    
    if (selectedLevel !== 'all') {
      filteredClasses = classes.filter(c => c.level === selectedLevel);
    }

    const challengeData = [];

    for (const classe of filteredClasses) {
      const classStudents = students.filter(s => s.class_id === classe.id);
      let totalTests = 0;
      let completedTests = 0;
      let average = 0;
      let bestScore = null;
      let excellentCount = 0;

      if (selectedComparison === 'test' && selectedTest) {
        const classResults = results.filter(r => 
          r.tests.name === selectedTest.name && 
          classStudents.some(s => s.id === r.student_id)
        );
        totalTests = classStudents.length;
        completedTests = classResults.length;
        
        const values = classResults.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
        average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        excellentCount = values.filter(v => v >= 85).length;
        
        if (values.length > 0) {
          const higherBetter = isHigherBetter(selectedTest.name);
          bestScore = higherBetter ? Math.max(...values) : Math.min(...values);
          bestScore = Math.round(bestScore * 100) / 100;
        }
        
      } else if (selectedComparison === 'category') {
        // Si "Tous les tests" est sélectionné
        if (selectedCategory === 'TOUS') {
          totalTests = classStudents.length * tests.length;
          
          const studentScores = [];
          
          for (const student of classStudents) {
            const studentResults = results.filter(r => r.student_id === student.id);
            
            if (studentResults.length > 0) {
              const categoriesScores = {};
              
              for (const categoryKey of Object.keys(categories)) {
                const categoryResults = studentResults.filter(r => r.tests.category === categoryKey);
                
                if (categoryResults.length > 0) {
                  const studentTestsData = categoryResults.map(r => ({
                    name: r.tests.name,
                    value: r.value,
                    unit: r.tests.unit
                  }));
                  
                  const catScore = await calculateCategoryScoreForStudent(
                    studentTestsData,
                    student.classes?.level || classe.level,
                    student.gender
                  );
                  
                  if (catScore !== null) {
                    categoriesScores[categoryKey] = catScore;
                  }
                }
              }
              
              const validCategoryScores = Object.values(categoriesScores);
              if (validCategoryScores.length > 0) {
                const studentGlobalScore = Math.round(
                  validCategoryScores.reduce((a, b) => a + b, 0) / validCategoryScores.length
                );
                studentScores.push(studentGlobalScore);
                completedTests += studentResults.length;
                if (studentGlobalScore >= 85) excellentCount++;
              }
            }
          }
          
          average = studentScores.length > 0 
            ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) 
            : 0;
          
          bestScore = null;
        } else {
          // Catégorie spécifique
          const categoryTests = tests.filter(t => t.category === selectedCategory);
          totalTests = classStudents.length * categoryTests.length;
          
          const studentScores = [];
          
          for (const student of classStudents) {
            const studentResults = results.filter(r => 
              r.student_id === student.id && 
              r.tests.category === selectedCategory
            );
            
            if (studentResults.length > 0) {
              const studentTestsData = studentResults.map(r => ({
                name: r.tests.name,
                value: r.value,
                unit: r.tests.unit
              }));
              
              const studentScore = await calculateCategoryScoreForStudent(
                studentTestsData,
                student.classes?.level || classe.level,
                student.gender
              );
              
              if (studentScore !== null) {
                studentScores.push(studentScore);
                completedTests += studentResults.length;
                if (studentScore >= 85) excellentCount++;
              }
            }
          }
          
          average = studentScores.length > 0 
            ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) 
            : 0;
          
          bestScore = null;
        }
        
      } else if (selectedComparison === 'participation') {
        totalTests = classStudents.length * tests.length;
        
        const studentScores = [];
        
        for (const student of classStudents) {
          const studentResults = results.filter(r => r.student_id === student.id);
          
          if (studentResults.length > 0) {
            const categoriesScores = {};
            
            for (const categoryKey of Object.keys(categories)) {
              const categoryResults = studentResults.filter(r => r.tests.category === categoryKey);
              
              if (categoryResults.length > 0) {
                const studentTestsData = categoryResults.map(r => ({
                  name: r.tests.name,
                  value: r.value,
                  unit: r.tests.unit
                }));
                
                const catScore = await calculateCategoryScoreForStudent(
                  studentTestsData,
                  student.classes?.level || classe.level,
                  student.gender
                );
                
                if (catScore !== null) {
                  categoriesScores[categoryKey] = catScore;
                }
              }
            }
            
            const validCategoryScores = Object.values(categoriesScores);
            if (validCategoryScores.length > 0) {
              const studentGlobalScore = Math.round(
                validCategoryScores.reduce((a, b) => a + b, 0) / validCategoryScores.length
              );
              studentScores.push(studentGlobalScore);
              completedTests += studentResults.length;
              if (studentGlobalScore >= 85) excellentCount++;
            }
          }
        }
        
        average = studentScores.length > 0 
          ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) 
          : 0;
        
        bestScore = null;
      }

      const participation = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
      const excellentRate = classStudents.length > 0 ? Math.round((excellentCount / classStudents.length) * 100) : 0;
      
      challengeData.push({
        classe,
        studentsCount: classStudents.length,
        totalTests,
        completedTests,
        average: Math.round(average * 100) / 100,
        bestScore: bestScore,
        participation: Math.round(participation),
        excellentCount,
        excellentRate
      });
    }

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

  // ============================================================================
  // EXPORT PDF
  // ============================================================================

  const exportChallengesPDF = () => {
    if (!challengeResults || challengeResults.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }
    
    const exportData = challengeResults.map((data, index) => ({
      rank: index + 1,
      classDisplayName: `${data.classe.level}${data.classe.name}`,
      level: data.classe.level,
      name: data.classe.name,
      averageScore: data.average || 0,
      bestScore: data.bestScore,
      participationRate: data.participation || 0,
      excellentCount: data.excellentCount || 0,
      completedTests: data.completedTests || 0,
      totalTests: data.totalTests || 0,
      totalStudents: data.studentsCount || 0
    }));

    let selectedTestName = '';
    let selectedTestUnit = '';
    
    if (selectedComparison === 'test' && selectedTest) {
      selectedTestName = selectedTest.name;
      selectedTestUnit = selectedTest.unit;
    } else if (selectedComparison === 'category') {
      selectedTestName = selectedCategory;
      selectedTestUnit = 'points';
    } else {
      selectedTestName = 'participation';
      selectedTestUnit = 'points';
    }

    const config = {
      schoolYear: selectedSchoolYear,
      comparisonType: getComparisonTypeLabel(),
      selectedTest: getSelectedTestLabel(),
      selectedTestName,
      selectedTestUnit,
      selectedLevel: selectedLevel === 'all' ? 'Tous niveaux' : selectedLevel,
      sortBy: getSortByLabel(),
      establishmentName: "Collège Yves du Manoir",
      totalResults: results.length,
      showBestScore: selectedComparison === 'test'
    };
    
    const printContent = generatePrintHTML(exportData, config);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const getComparisonTypeLabel = () => {
    switch (selectedComparison) {
      case 'test': return 'Par test spécifique';
      case 'category': return 'Par catégorie';
      case 'participation': return 'Participation globale';
      default: return 'Par test spécifique';
    }
  };

  const getSelectedTestLabel = () => {
    if (selectedComparison === 'test' && selectedTest) {
      return `${selectedTest.name} (${selectedTest.category})`;
    } else if (selectedComparison === 'category') {
      if (selectedCategory === 'TOUS') {
        return 'Tous les tests';
      }
      return `Catégorie ${categories[selectedCategory]?.name || selectedCategory}`;
    } else if (selectedComparison === 'participation') {
      return 'Tous les tests';
    }
    return 'N/A';
  };

  const getSortByLabel = () => {
    switch (sortBy) {
      case 'average': return 'Moyenne des résultats';
      case 'participation': return 'Taux de participation';
      case 'excellence': return 'Taux d\'excellence (85+)';
      default: return 'Moyenne des résultats';
    }
  };

  const generatePrintHTML = (challengeData, config) => {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Challenge Classes - ${config.schoolYear}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', sans-serif; font-size: 11px; line-height: 1.3; color: #333; }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #4F46E5; }
        .header h1 { font-size: 24px; color: #4F46E5; margin-bottom: 8px; font-weight: bold; }
        .header .subtitle { font-size: 14px; color: #6B7280; margin-bottom: 8px; }
        .header .info-line { font-size: 12px; color: #374151; }
        .config-section { background: #F9FAFB; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #E5E7EB; }
        .config-title { font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .config-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; }
        .config-item { text-align: center; }
        .config-label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .config-value { font-size: 12px; font-weight: bold; color: #111827; }
        .results-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        .results-table th { background: #4F46E5; color: white; padding: 8px 6px; text-align: center; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        .results-table td { padding: 6px; text-align: center; border-bottom: 1px solid #E5E7EB; }
        .results-table tr:nth-child(even) { background: #F9FAFB; }
        .rank-cell { font-weight: bold; font-size: 12px; }
        .rank-1 { color: #FFD700; }
        .rank-2 { color: #C0C0C0; }
        .rank-3 { color: #CD7F32; }
        .class-cell { font-weight: bold; font-size: 11px; }
        .metric-excellent { color: #059669; font-weight: bold; }
        .metric-good { color: #0EA5E9; font-weight: bold; }
        .metric-average { color: #F59E0B; font-weight: bold; }
        .metric-low { color: #DC2626; font-weight: bold; }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 Challenge Classes - EPS SANTÉ</h1>
        <div class="subtitle">Comparaisons et défis motivants entre classes</div>
        <div class="info-line">${config.establishmentName} • Année ${config.schoolYear} • Édité le ${currentDate}</div>
    </div>
    
    <div class="config-section">
        <div class="config-title">Configuration du Challenge</div>
        <div class="config-grid">
            <div class="config-item"><div class="config-label">Type</div><div class="config-value">${config.comparisonType}</div></div>
            <div class="config-item"><div class="config-label">Test</div><div class="config-value">${config.selectedTest}</div></div>
            <div class="config-item"><div class="config-label">Niveau</div><div class="config-value">${config.selectedLevel}</div></div>
            <div class="config-item"><div class="config-label">Tri</div><div class="config-value">${config.sortBy}</div></div>
        </div>
    </div>
    
    <table class="results-table">
        <thead>
            <tr>
                <th style="width: 8%">#</th>
                <th style="width: ${config.showBestScore ? '18%' : '22%'}">Classe</th>
                <th style="width: ${config.showBestScore ? '14%' : '17%'}">Moyenne</th>
                ${config.showBestScore ? '<th style="width: 14%">Meilleur Score</th>' : ''}
                <th style="width: ${config.showBestScore ? '14%' : '17%'}">Participation</th>
                <th style="width: ${config.showBestScore ? '12%' : '14%'}">Excellents</th>
                <th style="width: ${config.showBestScore ? '12%' : '16%'}">Tests</th>
                <th style="width: ${config.showBestScore ? '8%' : '12%'}">Élèves</th>
            </tr>
        </thead>
        <tbody>
            ${challengeData.map((classe, index) => {
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const avgClass = (classe.averageScore || 0) >= 85 ? 'metric-excellent' : 
                                (classe.averageScore || 0) >= 70 ? 'metric-good' : 
                                (classe.averageScore || 0) >= 55 ? 'metric-average' : 'metric-low';
                const participationClass = (classe.participationRate || 0) >= 80 ? 'metric-excellent' : 
                                          (classe.participationRate || 0) >= 60 ? 'metric-good' : 
                                          (classe.participationRate || 0) >= 40 ? 'metric-average' : 'metric-low';
                
                return `
                <tr>
                    <td class="rank-cell ${rankClass}">${rankIcon} ${index + 1}</td>
                    <td class="class-cell">${classe.classDisplayName}</td>
                    <td class="${avgClass}">${config.showBestScore ? formatTestValue(classe.averageScore, config.selectedTestName, config.selectedTestUnit) : Math.round(classe.averageScore || 0) + '/100'}</td>
                    ${config.showBestScore ? `<td>${formatTestValue(classe.bestScore, config.selectedTestName, config.selectedTestUnit)}</td>` : ''}
                    <td class="${participationClass}">${Math.round(classe.participationRate || 0)}%</td>
                    <td class="metric-excellent">${classe.excellentCount || 0}</td>
                    <td>${classe.completedTests || 0}/${classe.totalTests || 0}</td>
                    <td>${classe.totalStudents || 0}</td>
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  };

  // ============================================================================
  // INTERFACE
  // ============================================================================

  const getMedalIcon = (position) => {
    switch (position) {
      case 0: return <Trophy className="text-yellow-500" size={24} />;
      case 1: return <Medal className="text-gray-400" size={24} />;
      case 2: return <Award className="text-amber-600" size={24} />;
      default: return <Star className="text-blue-500" size={16} />;
    }
  };

  const getEncouragingMessage = (position, totalClasses, data) => {
    if (totalClasses === 1) return "Seule classe participante - Bravo !";
    
    switch (position) {
      case 0: return "🏆 Champions ! Félicitations à toute la classe !";
      case 1: return "🥈 Excellente performance ! Très proche du sommet !";
      case 2: return "🥉 Très bon travail ! Sur le podium !";
      default:
        if (data.participation >= 80) return "💪 Excellent engagement !";
        if (data.average > 60) return "👏 Beau travail ! Continuez !";
        return "🌱 En progression !";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
          <p className="text-gray-600">Calcul avec notation dynamique...</p>
          <p className="text-xs text-gray-500 mt-2">Premier calcul : ~30-60s • Suivants : instantané</p>
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <Trophy size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Challenges Classes</h1>
                <p className="text-blue-100">Comparaisons et défis motivants</p>
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Configuration du Challenge</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de comparaison</label>
              <select value={selectedComparison} onChange={(e) => setSelectedComparison(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="test">Par test spécifique</option>
                <option value="category">Par catégorie</option>
                <option value="participation">Participation globale</option>
              </select>
            </div>

            {selectedComparison === 'test' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test à comparer</label>
                <select value={selectedTest?.id || ''} onChange={(e) => setSelectedTest(tests.find(t => t.id === parseInt(e.target.value)))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>{test.name} ({test.category})</option>
                  ))}
                </select>
              </div>
            )}

            {selectedComparison === 'category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie à comparer</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="TOUS">Tous les tests</option>
                  {Object.entries(categories).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">Tous niveaux</option>
                <option value="6ème">6ème uniquement</option>
                <option value="5ème">5ème uniquement</option>
                <option value="4ème">4ème uniquement</option>
                <option value="3ème">3ème uniquement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Classer par</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="average">Moyenne des résultats</option>
                <option value="participation">Taux de participation</option>
                <option value="excellence">Taux d'excellence (85+)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info size={16} />
              <span>Challenge basé sur {challengeResults.length} classe{challengeResults.length !== 1 ? 's' : ''} • Cache: {Object.keys(baremesCache).length} barèmes</span>
            </div>
            <button onClick={exportChallengesPDF} disabled={challengeResults.length === 0} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              <Download size={16} />
              <span>Exporter PDF</span>
            </button>
          </div>
        </div>

        {challengeResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune donnée disponible</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {challengeResults.map((data, index) => {
              const colors = getLevelColors(data.classe.level);
              const message = getEncouragingMessage(index, challengeResults.length, data);
              
              return (
                <div key={data.classe.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    index === 0 ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-white' :
                    index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-white' :
                    index === 2 ? 'border-amber-600 bg-gradient-to-r from-amber-50 to-white' :
                    colors.border
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                        {getMedalIcon(index)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{data.classe.name} ({data.classe.level})</h3>
                        <p className="text-green-600 font-medium">{message}</p>
                      </div>
                    </div>

                    {selectedComparison === 'test' && data.bestScore !== null ? (
                      <div className="grid grid-cols-5 gap-6 text-center">
                        <div><div className="text-2xl font-bold text-blue-600">{formatTestValue(data.average, selectedTest?.name, selectedTest?.unit)}</div><div className="text-xs text-gray-500">Moyenne</div></div>
                        <div><div className="text-2xl font-bold text-indigo-600">{formatTestValue(data.bestScore, selectedTest?.name, selectedTest?.unit)}</div><div className="text-xs text-gray-500">Meilleur score</div></div>
                        <div><div className="text-2xl font-bold text-green-600">{data.participation}%</div><div className="text-xs text-gray-500">Participation</div></div>
                        <div><div className="text-2xl font-bold text-purple-600">{data.excellentCount}</div><div className="text-xs text-gray-500">Excellents</div></div>
                        <div><div className="text-2xl font-bold text-gray-600">{data.studentsCount}</div><div className="text-xs text-gray-500">Élèves</div></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-8 text-center">
                        <div><div className="text-2xl font-bold text-blue-600">{Math.round(data.average)}/100</div><div className="text-xs text-gray-500">Moyenne classe</div></div>
                        <div><div className="text-2xl font-bold text-green-600">{data.participation}%</div><div className="text-xs text-gray-500">Participation</div></div>
                        <div><div className="text-2xl font-bold text-purple-600">{data.excellentCount}</div><div className="text-xs text-gray-500">Excellents (≥85)</div></div>
                        <div><div className="text-2xl font-bold text-gray-600">{data.studentsCount}</div><div className="text-xs text-gray-500">Élèves</div></div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Participation de la classe</span>
                      <span className="text-sm font-medium text-gray-800">{data.completedTests}/{data.totalTests} tests</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-1000 ${
                          data.participation >= 90 ? 'bg-green-500' :
                          data.participation >= 70 ? 'bg-blue-500' :
                          data.participation >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} style={{ width: `${data.participation}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center border border-blue-200">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Heart className="text-red-500" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Félicitations à toutes les classes !</h3>
          </div>
          <p className="text-gray-700 max-w-3xl mx-auto">
            Chaque classe contribue à l'excellence de notre établissement. Les challenges sont l'occasion de se motiver mutuellement et de progresser ensemble !
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChallengesClasses;