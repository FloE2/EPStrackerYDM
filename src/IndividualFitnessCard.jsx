// IndividualFitnessCard.jsx - VERSION AVEC SÉLECTION DE CLASSE
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  GitBranch, 
  Users, 
  Zap, 
  Clock,
  Star,
  TrendingUp,
  Heart,
  Award,
  ChevronRight,
  Info,
  User,
  Search,
  Calendar,
  BookOpen,
  Home,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Minimize2,
  ChevronLeft,
  Download,
  ArrowLeft
} from 'lucide-react';

// Import de la configuration Supabase et du contexte année scolaire
import { supabase } from './lib/supabase.js';
import { useSchoolYear } from './contexts/SchoolYearContext.jsx';

const IndividualFitnessCard = () => {
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentResults, setStudentResults] = useState(null);
  const [studentsCount, setStudentsCount] = useState({});

  // ============================================================================
  // SYSTÈME DE NOTATION DYNAMIQUE INTÉGRÉ
  // ============================================================================

  // Fonction pour calculer les percentiles à partir des données réelles
  const calculatePercentiles = (values) => {
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    
    return {
      p10: sorted[Math.floor(n * 0.10)],
      p25: sorted[Math.floor(n * 0.25)], 
      p50: sorted[Math.floor(n * 0.50)], // médiane
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.90)]
    };
  };

  // Fonction pour déterminer la direction du test
  const getTestDirection = (testName) => {
    // Tests où un temps plus faible est meilleur
    const timeBasedTests = ['SPRINTS', '30 mètres', 'VITESSE'];
    
    // Tests où une valeur plus élevée est meilleure
    const higherIsBetterTests = [
      'COOPER', 'DEMI-COOPER', 'NAVETTE', 'RECTANGLE MAGIQUE', 
      'SAUT', 'LANCER', 'CHAISE', 'PLANCHE', 'SUSPENSION', 'POIGNÉE',
      'FOULÉES', 'TRIPLE SAUT', 'MONOPODAL', 'SOUPLESSE'
    ];

    if (timeBasedTests.some(test => testName.includes(test))) return false;
    return true; // Par défaut, plus élevé = meilleur
  };

  // Fonction pour récupérer les données réelles d'un test spécifique
  const getTestData = async (testName, studentLevel, studentGender) => {
    try {
      console.log(`Récupération des données pour: ${testName}, ${studentLevel}, ${studentGender}`);
      
      // Récupérer tous les résultats pour ce test, niveau et sexe
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
        console.warn(`Échantillon trop faible: ${results?.length || 0} résultats pour ${testName} ${studentLevel} ${studentGender}`);
        return {
          sampleSize: results?.length || 0,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      // Extraire les valeurs numériques
      const values = results.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
      
      if (values.length < 5) {
        return {
          sampleSize: values.length,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      // Calculer les percentiles
      const percentiles = calculatePercentiles(values);
      
      // Déterminer la meilleure performance
      const higherIsBetter = getTestDirection(testName);
      const bestPerformance = higherIsBetter 
        ? Math.max(...values) 
        : Math.min(...values);
      
      return {
        sampleSize: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        moyenne: values.reduce((a, b) => a + b, 0) / values.length,
        percentiles,
        bestPerformance,
        higherIsBetter,
        insufficientData: false
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
  };

  // Fonction pour déterminer la position percentile d'une valeur
  const getPercentilePosition = (value, percentiles, higherIsBetter) => {
    if (higherIsBetter) {
      if (value >= percentiles.p90) return "90e percentile et plus";
      if (value >= percentiles.p75) return "Entre 75e et 90e percentile";
      if (value >= percentiles.p50) return "Entre 50e et 75e percentile";
      if (value >= percentiles.p25) return "Entre 25e et 50e percentile";
      return "Moins de 25e percentile";
    } else {
      if (value <= percentiles.p10) return "10e percentile et moins";
      if (value <= percentiles.p25) return "Entre 10e et 25e percentile";
      if (value <= percentiles.p50) return "Entre 25e et 50e percentile";
      if (value <= percentiles.p75) return "Entre 50e et 75e percentile";
      return "Plus de 75e percentile";
    }
  };

  // Fonction de notation avec barèmes dynamiques
  const scoreTestWithDynamicBareme = async (value, testName, studentLevel, studentGender) => {
    // Récupérer les données réelles
    const testData = await getTestData(testName, studentLevel, studentGender);
    
    if (!testData) {
      console.warn(`Pas de données disponibles pour ${testName}`);
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

    const { percentiles, higherIsBetter, bestPerformance } = testData;
    
    let score;
    let level;

    if (higherIsBetter) {
      // Plus élevé = meilleur (Rectangle magique, distances, etc.)
      if (numericValue >= percentiles.p90) {
        score = Math.floor(Math.random() * 16) + 85; // 85-100pts
        level = "Excellent";
      } else if (numericValue >= percentiles.p75) {
        score = Math.floor(Math.random() * 15) + 70; // 70-84pts  
        level = "Bon";
      } else if (numericValue >= percentiles.p50) {
        score = Math.floor(Math.random() * 15) + 55; // 55-69pts
        level = "Correct";
      } else if (numericValue >= percentiles.p25) {
        score = Math.floor(Math.random() * 15) + 40; // 40-54pts
        level = "Faible";
      } else {
        score = Math.floor(Math.random() * 15) + 10; // 10-39pts
        level = "Très faible";
      }
    } else {
      // Plus faible = meilleur (temps de sprint, etc.)
      if (numericValue <= percentiles.p10) {
        score = Math.floor(Math.random() * 16) + 85;
        level = "Excellent";
      } else if (numericValue <= percentiles.p25) {
        score = Math.floor(Math.random() * 15) + 70;
        level = "Bon";
      } else if (numericValue <= percentiles.p50) {
        score = Math.floor(Math.random() * 15) + 55;
        level = "Correct";
      } else if (numericValue <= percentiles.p75) {
        score = Math.floor(Math.random() * 15) + 40;
        level = "Faible";
      } else {
        score = Math.floor(Math.random() * 15) + 10;
        level = "Très faible";
      }
    }

    return {
      score,
      level,
      message: `Calculé sur ${testData.sampleSize} élèves`,
      method: "bareme_dynamique",
      percentilePosition: getPercentilePosition(numericValue, percentiles, higherIsBetter),
      bestPerformance,
      testData
    };
  };

  // Fonction pour le calcul des scores de catégorie avec barèmes dynamiques
  const calculateCategoryScoreWithDynamicBaremes = async (tests, studentLevel, studentGender) => {
    if (tests.length === 0) return { score: 0, details: [], hasInsufficientData: false };

    let totalScore = 0;
    let validTests = 0;
    let hasInsufficientData = false;
    const details = [];

    for (const test of tests) {
      const result = await scoreTestWithDynamicBareme(
        test.value, 
        test.name, 
        studentLevel, 
        studentGender
      );
      
      details.push({
        testName: test.name,
        value: test.value,
        unit: test.unit,
        result
      });

      if (result.score !== null && result.method !== "echantillon_insuffisant") {
        totalScore += result.score;
        validTests++;
      } else if (result.method === "echantillon_insuffisant") {
        hasInsufficientData = true;
      }
    }

    return {
      score: validTests > 0 ? Math.round(totalScore / validTests) : 0,
      details,
      hasInsufficientData,
      validTests,
      totalTests: tests.length
    };
  };

  // Configuration complète des catégories avec IDs EXACTS de votre base
  const categories = {
    ENDURANCE: {
      name: "Endurance",
      shortName: "END",
      icon: Activity,
      color: "#3b82f6",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      tests: [
        { id: 1, name: "DEMI-COOPER", shortName: "Cooper", unit: "M" },
        { id: 2, name: "RECTANGLE MAGIQUE", shortName: "Rectangle", unit: "Points" },
        { id: 20, name: "Test Cooper", shortName: "Cooper+", unit: "m" },
        { id: 23, name: "Test 6ème - Test navette Luc Léger", shortName: "Luc Léger", unit: "palier" }
      ]
    },
    FORCE: {
      name: "Force",
      shortName: "FOR",
      icon: Target,
      color: "#ef4444",
      bgColor: "from-red-50 to-red-100",
      borderColor: "border-red-200",
      tests: [
        { id: 3, name: "CHAISE DE KILLY", shortName: "Chaise", unit: "sec" },
        { id: 4, name: "PLANCHE", shortName: "Planche", unit: "sec" },
        { id: 5, name: "SUSPENSION BARRE", shortName: "Suspension", unit: "sec" },
        { id: 6, name: "POIGNÉE DE MAIN", shortName: "Poignée", unit: "kg" },
        { id: 15, name: "LANCER BALLON BASKET", shortName: "Lancer", unit: "cm" },
        { id: 24, name: "Test 6ème - Saut en longueur sans élan", shortName: "Saut", unit: "cm" }
      ]
    },
    VITESSE: {
      name: "Vitesse",
      shortName: "VIT",
      icon: Zap,
      color: "#eab308",
      bgColor: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-200",
      tests: [
        { id: 12, name: "SPRINTS 10 x 5 M", shortName: "Sprints", unit: "sec" },
        { id: 25, name: "Test 6ème - 30 mètres plat", shortName: "30m", unit: "sec" }
      ]
    },
    COORDINATION: {
      name: "Coordination",
      shortName: "COO",
      icon: GitBranch,
      color: "#a855f7",
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      tests: [
        { id: 13, name: "5 FOULÉES BONDISSANTES", shortName: "Foulées", unit: "cm" },
        { id: 14, name: "TRIPLE SAUT SUR UN PIED", shortName: "Triple saut", unit: "cm" }
      ]
    },
    EQUILIBRE: {
      name: "Équilibre",
      shortName: "EQU",
      icon: Users,
      color: "#6366f1",
      bgColor: "from-indigo-50 to-indigo-100",
      borderColor: "border-indigo-200",
      tests: [
        { id: 10, name: "ÉQUILIBRE MONOPODAL AU SOL", shortName: "Monopodal", unit: "sec" },
        { id: 11, name: "FLAMINGO SUR POUTRE", shortName: "Flamingo", unit: "nombre de tentatives" }
      ]
    },
    SOUPLESSE: {
      name: "Souplesse",
      shortName: "SOU",
      icon: Minimize2,
      color: "#22c55e",
      bgColor: "from-green-50 to-green-100",
      borderColor: "border-green-200",
      tests: [
        { id: 8, name: "SOUPLESSE ÉPAULES", shortName: "Épaules", unit: "cm" },
        { id: 9, name: "SOUPLESSE POSTÉRIEURE", shortName: "Postérieure", unit: "cm" }
      ]
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
        accent: 'bg-blue-600',
        hover: 'hover:bg-blue-100'
      },
      '5ème': { 
        primary: 'bg-emerald-500', 
        light: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-700',
        gradient: 'from-emerald-500 to-emerald-600',
        accent: 'bg-emerald-600',
        hover: 'hover:bg-emerald-100'
      },
      '4ème': { 
        primary: 'bg-orange-500', 
        light: 'bg-orange-50', 
        border: 'border-orange-200', 
        text: 'text-orange-700',
        gradient: 'from-orange-500 to-orange-600',
        accent: 'bg-orange-600',
        hover: 'hover:bg-orange-100'
      },
      '3ème': { 
        primary: 'bg-purple-500', 
        light: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700',
        gradient: 'from-purple-500 to-purple-600',
        accent: 'bg-purple-600',
        hover: 'hover:bg-purple-100'
      }
    };
    return colors[level] || colors['6ème'];
  };

  // Couleur selon le score d'évaluation
  const getEvaluationColor = (score) => {
    if (score >= 85) return "#22c55e"; // Vert - Excellent
    if (score >= 70) return "#3b82f6"; // Bleu - Bon
    if (score >= 55) return "#eab308"; // Jaune - Correct
    return "#ef4444"; // Rouge - À améliorer
  };

  // Fonction pour obtenir le niveau selon le score
  const getScoreLevel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Bon";
    if (score >= 55) return "Correct";
    return "À améliorer";
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 55) return "#eab308";
    return "#ef4444";
  };

  // Conseils par catégorie
  const getCategoryAdvice = (category, score, testsCompleted, totalTests) => {
    const completionRate = totalTests > 0 ? (testsCompleted / totalTests) * 100 : 0;
    
    const adviceMap = {
      ENDURANCE: {
        excellent: "Excellent niveau d'endurance ! Continue la pratique d'activités cardio (course, vélo, natation) 3-4 fois par semaine.",
        bon: "Bonne endurance ! Augmente progressivement la durée de tes activités cardio pour atteindre l'excellence.",
        correct: "Endurance correcte. Pratique régulièrement des activités d'endurance (marche rapide, jogging léger) 2-3 fois par semaine.",
        faible: "Travaille ton endurance avec des activités progressives : marche, montée d'escaliers, puis course légère."
      },
      FORCE: {
        excellent: "Force remarquable ! Maintiens ton niveau avec des exercices variés (pompes, tractions, gainage).",
        bon: "Bonne force musculaire ! Ajoute quelques exercices de renforcement pour progresser davantage.",
        correct: "Force correcte. Intègre des exercices simples : pompes sur genoux, gainage, squats au poids du corps.",
        faible: "Développe ta force avec des exercices adaptés : gainage facile, pompes inclinées, étirements actifs."
      },
      VITESSE: {
        excellent: "Vitesse exceptionnelle ! Continue les exercices de réactivité et les sprints courts.",
        bon: "Bonne vitesse ! Travaille la coordination avec des exercices d'agilité et de réactivité.",
        correct: "Vitesse correcte. Améliore-toi avec des petites accélérations et des exercices de coordination.",
        faible: "Développe ta vitesse avec des exercices de coordination simples et des déplacements variés."
      },
      COORDINATION: {
        excellent: "Coordination parfaite ! Continue avec des activités techniques variées (jonglage, danse, sports de raquette).",
        bon: "Bonne coordination ! Essaie de nouveaux mouvements complexes pour progresser encore.",
        correct: "Coordination correcte. Pratique des exercices d'équilibre dynamique et de précision.",
        faible: "Améliore ta coordination avec des exercices simples : marche sur ligne, lancer/rattraper, équilibres."
      },
      EQUILIBRE: {
        excellent: "Équilibre remarquable ! Maintiens ce niveau avec des défis d'équilibre plus complexes.",
        bon: "Bon équilibre ! Ajoute des variantes : yeux fermés, surfaces instables, mouvements combinés.",
        correct: "Équilibre correct. Pratique régulièrement des positions d'équilibre statique puis dynamique.",
        faible: "Travaille ton équilibre avec des exercices simples : tenir sur un pied, marcher sur une ligne."
      },
      SOUPLESSE: {
        excellent: "Souplesse exceptionnelle ! Continue les étirements quotidiens pour maintenir cette mobilité.",
        bon: "Bonne souplesse ! Étire-toi régulièrement, surtout après l'effort physique.",
        correct: "Souplesse correcte. Intègre 10-15 minutes d'étirements doux dans ta routine quotidienne.",
        faible: "Améliore ta souplesse avec des étirements doux et progressifs, 5-10 minutes par jour."
      }
    };

    let level;
    if (score >= 85) level = 'excellent';
    else if (score >= 70) level = 'bon';
    else if (score >= 55) level = 'correct';
    else level = 'faible';

    let advice = adviceMap[category]?.[level] || "Continue tes efforts dans cette catégorie !";
    
    if (completionRate < 50) {
      advice += " Complète d'abord tous les tests de cette catégorie pour un bilan plus précis.";
    }
    
    return advice;
  };

  // Chargement des données - CORRIGÉ
  useEffect(() => {
    if (selectedSchoolYear) {
      loadClassesAndCounts();
    }
  }, [selectedSchoolYear]);

  // Chargement des élèves quand une classe est sélectionnée
  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadStudentsForClass(selectedClass.id);
    }
  }, [selectedClass, selectedSchoolYear]);

  // Chargement des classes et comptage des élèves
  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("DEBUG - Chargement classes pour l'année:", selectedSchoolYear);

      // Charger les classes pour cette année
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_year', selectedSchoolYear)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Reset sélections si classe n'existe plus
      if (selectedClass && !classesData.find(c => c.id === selectedClass.id)) {
        setSelectedClass(null);
        setSelectedStudent(null);
        setStudents([]);
        setStudentResults(null);
      }

      // Compter les élèves par classe
      const counts = {};
      for (const classe of classesData) {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedSchoolYear);
        
        if (!error) {
          counts[classe.id] = count || 0;
        }
      }
      setStudentsCount(counts);

      console.log("DEBUG - Classes chargées:", classesData?.length || 0);

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des élèves d'une classe
  const loadStudentsForClass = async (classId) => {
    try {
      setLoading(true);
      setError(null);

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          classes!inner(id, name, level)
        `)
        .eq('class_id', classId)
        .eq('school_year', selectedSchoolYear)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      console.log("DEBUG - Élèves chargés pour la classe:", studentsData?.length || 0);

    } catch (err) {
      console.error('Erreur lors du chargement des élèves:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction principale pour traiter les résultats d'un élève avec barèmes dynamiques
  const processStudentResultsWithDynamicBaremes = async (results, student) => {
    console.log("processStudentResults - Student reçu:", student);
    console.log("processStudentResults - Results reçus:", results);
    
    const categoryScores = {};
    
    // Initialiser les catégories
    Object.keys(categories).forEach(catKey => {
      categoryScores[catKey] = { 
        score: 0, 
        tests: [], 
        level: "Non évalué",
        testsCompleted: 0,
        totalTests: categories[catKey].tests.length,
        completionPercentage: 0,
        hasInsufficientData: false,
        details: []
      };
    });

    // Grouper les résultats par catégorie
    results.forEach(result => {
      const testCategory = result.tests.category;
      if (categoryScores[testCategory]) {
        categoryScores[testCategory].tests.push({
          name: result.tests.name,
          value: result.value,
          unit: result.tests.unit
        });
        categoryScores[testCategory].testsCompleted++;
      }
    });

    // Calculer les scores de chaque catégorie
    for (const categoryName of Object.keys(categoryScores)) {
      const categoryData = categoryScores[categoryName];
      const testsCount = categoryData.testsCompleted;
      const totalTests = categoryData.totalTests;
      
      categoryData.completionPercentage = totalTests > 0 
        ? Math.round((testsCount / totalTests) * 100) 
        : 0;

      if (testsCount > 0) {
        try {
          const studentLevel = student?.classes?.level;
          const studentGender = student?.gender;
          
          if (studentLevel && studentGender) {
            // Calcul avec barèmes dynamiques
            const result = await calculateCategoryScoreWithDynamicBaremes(
              categoryData.tests, 
              studentLevel, 
              studentGender
            );
            
            categoryData.score = result.score;
            categoryData.hasInsufficientData = result.hasInsufficientData;
            categoryData.details = result.details;
            categoryData.level = getScoreLevel(result.score);
          } else {
            categoryData.score = 50;
            categoryData.level = "Correct";
          }
        } catch (error) {
          console.error(`Erreur calcul dynamique pour ${categoryName}:`, error);
          categoryData.score = 50;
          categoryData.level = "Correct";
        }
      }
    }

    return categoryScores;
  };

  // Fonction de chargement des résultats d'un élève - CORRIGÉE
  const loadStudentResults = async (studentId, student) => {
    try {
      setLoading(true);
      
      console.log("DEBUG - loadStudentResults");
      console.log("- studentId:", studentId);
      console.log("- student passé en paramètre:", student);
      console.log("- selectedSchoolYear:", selectedSchoolYear);
  
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          tests!inner(name, category, unit),
          students!inner(school_year)
        `)
        .eq('student_id', studentId)
        .eq('students.school_year', selectedSchoolYear);
  
      if (resultsError) throw resultsError;
      
      console.log("DEBUG - Résultats bruts:", results);
      console.log("DEBUG - Nombre de résultats:", results?.length || 0);
  
      console.log("DEBUG - Student avant traitement:", student);
  
      // Utiliser le paramètre student au lieu de selectedStudent
      const processedResults = await processStudentResultsWithDynamicBaremes(
        results || [], 
        student  // ← CORRECTION ICI
      );
      
      console.log("DEBUG - Processed results:", processedResults);
      
      setStudentResults(processedResults);
  
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Composant jauge circulaire
  const CircularGauge = ({ score, color, size = 100 }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
    );
  };

  // Fonction d'export PDF
  const exportToPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Vue de sélection des classes (inspirée de ResultsEntrySupabase)
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Fiches Individuelles - EPS SANTÉ</h1>
            <p className="text-gray-600">Sélectionnez une classe pour consulter les fiches individuelles des élèves</p>
          </div>

          {/* Affichage année scolaire */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <Calendar className="text-blue-600" size={20} />
              <span className="text-gray-700">Fiches individuelles pour</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedSchoolYear}
              </span>
              {selectedSchoolYear === currentSchoolYear && (
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                  Année courante
                </span>
              )}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Notation dynamique
              </span>
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
                            className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg ${colors.light} ${colors.border} ${colors.hover}`}
                          >
                            <div className={`text-2xl font-bold mb-4 ${colors.text}`}>
                              {classe.level.charAt(0)}{classe.name}
                            </div>
                            
                            <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80 mb-3`}>
                              <Users size={16} />
                              <span>{studentCount} élève{studentCount !== 1 ? 's' : ''}</span>
                            </div>
                            
                            <div className={`text-sm ${colors.text} opacity-75`}>
                              Cliquer pour voir les élèves
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

  // Vue de sélection des élèves d'une classe
  const StudentSelectionView = () => {
    const colors = getLevelColors(selectedClass.level);
    
    const filteredStudents = students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setSearchTerm('');
                    setStudents([]);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux classes</span>
                </button>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${colors.accent} rounded-xl shadow-md`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      Fiches Individuelles - {selectedClass.level.charAt(0)}{selectedClass.name}
                    </h1>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-600">Collège Yves du Manoir</span>
                      <span className="text-gray-400">•</span>
                      <Calendar size={14} className="text-blue-600" />
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {selectedSchoolYear}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Notation dynamique
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`text-sm ${colors.text} font-medium`}>
                {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Liste des élèves */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Chargement des élèves...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={32} />
              <p className="text-gray-600 mb-2">Aucun élève trouvé</p>
              {searchTerm && (
                <p className="text-gray-500 text-sm">Essayez de modifier votre recherche</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => {
                return (
                  <div
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      loadStudentResults(student.id, student);
                    }}
                    className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-l-4 ${colors.accent}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 ${colors.light} rounded-xl flex items-center justify-center`}>
                        <User className={`${colors.text}`} size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className={`text-sm ${colors.text} font-medium`}>
                          {student.classes.name} • {student.classes.level}
                        </p>
                        <p className="text-xs text-gray-500">
                          {student.gender === 'M' ? 'Garçon' : 'Fille'}
                        </p>
                      </div>
                      <ChevronRight className="text-gray-400" size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Interface de la fiche avec système dynamique intégré
  const StudentFitnessCardView = () => {
    const colors = selectedStudent?.classes ? getLevelColors(selectedStudent.classes.level) : getLevelColors('6ème');
    const globalScore = studentResults ? (() => {
      const categoriesWithResults = Object.values(studentResults).filter(cat => cat.score > 0);
      if (categoriesWithResults.length === 0) return 0;
      return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
    })() : 0;

    // Vérification de sécurité
    if (!selectedStudent || !selectedStudent.classes) {
      return (
        <div className="min-h-screen bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Chargement des données de l'élève...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header avec boutons */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setSelectedStudent(null);
                setStudentResults(null);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <ChevronLeft size={16} />
              <span>Retour aux élèves</span>
            </button>

            <button
              onClick={exportToPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              <Download size={16} />
              <span>Exporter en PDF</span>
            </button>
          </div>

          {/* En-tête élève */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className={`w-20 h-20 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center text-white`}>
                  <User size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${colors.gradient} text-white`}>
                      {selectedStudent.classes.name}
                    </span>
                    <span>{selectedStudent.classes.level}</span>
                    <span>{selectedStudent.gender === 'M' ? 'Garçon' : 'Fille'}</span>
                    <span>• Année {selectedSchoolYear}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Notation dynamique en temps réel
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: getScoreColor(globalScore) }}>
                  {globalScore}/100
                </div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">
                  Score global
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Calcul des barèmes dynamiques...</p>
            </div>
          ) : (
            /* Cartes de catégories avec système dynamique intégré */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categories).map(([key, category]) => {
                const result = studentResults?.[key] || { 
                  score: 0, 
                  tests: [], 
                  testsCompleted: 0, 
                  totalTests: category.tests.length,
                  details: []
                };
                
                const IconComponent = category.icon;
                const evaluationColor = getEvaluationColor(result.score);
                
                return (
                  <div key={key} className={`bg-gradient-to-br ${category.bgColor} rounded-lg shadow-md border ${category.borderColor} p-4`}>
                    {/* En-tête de catégorie */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="p-2 rounded-lg text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm" style={{ color: category.color }}>
                            {category.name}
                          </h3>
                          <p className="text-xs text-gray-600">{result.level}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {result.testsCompleted}/{result.totalTests}
                      </span>
                    </div>

                    {/* Jauge circulaire */}
                    <div className="flex justify-center mb-4">
                      <CircularGauge score={result.score} color={evaluationColor} size={80} />
                    </div>

                    {/* Barres des tests individuels avec détails dynamiques */}
                    <div className="space-y-2 mb-4">
                      {category.tests.map((test, index) => {
                        const testDetail = result.details?.find(d => d.testName === test.name);
                        const hasResult = !!testDetail;
                        
                        let testScore = 0;
                        let bestPerformance = null;
                        let sampleMessage = "";
                        let percentilePosition = "";
                        
                        if (hasResult && testDetail.result) {
                          if (testDetail.result.method === "echantillon_insuffisant") {
                            testScore = 0;
                            sampleMessage = testDetail.result.message;
                          } else {
                            testScore = testDetail.result.score || 0;
                            bestPerformance = testDetail.result.bestPerformance;
                            sampleMessage = testDetail.result.message;
                            percentilePosition = testDetail.result.percentilePosition;
                          }
                        }
                        
                        const testEvaluationColor = hasResult && testScore > 0 ? getEvaluationColor(testScore) : "#d1d5db";
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-700">
                                {test.shortName}
                              </span>
                              <span className="text-xs text-gray-600">
                                {hasResult ? `${testDetail.value} ${testDetail.unit}` : '-'}
                              </span>
                            </div>
                            
                            {/* Barre de progression */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full transition-all duration-1000"
                                style={{ 
                                  width: hasResult && testScore > 0 ? `${testScore}%` : '0%',
                                  backgroundColor: testEvaluationColor
                                }}
                              ></div>
                            </div>
                            
                            {/* Informations détaillées dynamiques */}
                            {hasResult && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {testDetail.result.method === "echantillon_insuffisant" ? (
                                  <span className="text-orange-600 font-medium">{sampleMessage}</span>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="text-blue-600">{sampleMessage}</div>
                                    {bestPerformance && (
                                      <div className="text-green-600 font-medium">
                                        Record: {bestPerformance} {testDetail.unit}
                                      </div>
                                    )}
                                    {percentilePosition && (
                                      <div className="text-purple-600">
                                        {percentilePosition}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Conseil personnalisé */}
                    <div className="bg-white/70 rounded-lg p-3 backdrop-blur-sm">
                      <div className="flex items-start space-x-2">
                        <Info size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="text-xs font-semibold text-gray-800 mb-1">Conseil personnalisé</h5>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {getCategoryAdvice(key, result.score, result.testsCompleted, result.totalTests)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Message de conclusion */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Heart className="text-red-500" size={20} />
              <h3 className="text-lg font-bold text-gray-800">
                Recommandations pour {selectedStudent.first_name}
              </h3>
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto">
              {globalScore >= 85 ? 
                "Excellente condition physique ! Continue à pratiquer une activité physique régulière pour maintenir ce niveau exceptionnel selon les recommandations OMS (60 min/jour)." :
              globalScore >= 70 ? 
                "Bon niveau de condition physique. Quelques efforts supplémentaires t'aideront à atteindre les recommandations OMS de 60 minutes d'activité quotidienne." :
              globalScore >= 55 ? 
                "Tu as de bonnes bases ! Avec de la régularité dans tes activités physiques, tu atteindras facilement les 60 minutes recommandées par l'OMS." :
                "Chaque mouvement compte ! Commence par de petites activités quotidiennes pour progresser vers les 60 minutes recommandées par l'OMS."}
            </p>
            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><strong>Système de notation dynamique :</strong> Les scores sont calculés en temps réel selon les performances actuelles des élèves de même niveau et sexe de votre établissement. Cette approche garantit une évaluation toujours adaptée et équitable, avec un minimum de 5 élèves requis par barème.</p>
            </div>
          </div>
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
          <button
            onClick={loadClassesAndCounts}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading && !selectedClass && !selectedStudent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
          <span className="text-gray-600">Chargement des classes...</span>
        </div>
      </div>
    );
  }

  // Navigation des vues
  if (!selectedClass) {
    return <ClassSelectionView />;
  }

  if (!selectedStudent) {
    return <StudentSelectionView />;
  }

  return <StudentFitnessCardView />;
};

export default IndividualFitnessCard;