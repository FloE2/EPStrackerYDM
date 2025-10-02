// IndividualFitnessCard.jsx - VERSION AVEC GESTION DES DISPENSES
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
  
  // États pour le chargement dynamique
  const [allTests, setAllTests] = useState([]);
  const [categories, setCategories] = useState({});
  const [testsLoading, setTestsLoading] = useState(true);

  // ============================================================================
  // SYSTÈME DE NOTATION DYNAMIQUE DÉTERMINISTE
  // ============================================================================

  const calculatePercentiles = (values) => {
    const sorted = values.sort((a, b) => a - b);
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
    const timeBasedTests = ['SPRINTS 10 x 5', '30 mètres','FLAMINGO'];
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
        return {
          sampleSize: results?.length || 0,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      // Filtrer les valeurs "DISP" et "dispensé" avant l'analyse
      const values = results
        .map(r => r.value)
        .filter(v => v !== 'DISP' && v !== 'dispensé')
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));
      
      if (values.length < 5) {
        return {
          sampleSize: values.length,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      const percentiles = calculatePercentiles(values);
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
        insufficientData: false,
        allValues: values
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
  };

  const calculateDeterministicScore = (value, percentiles, higherIsBetter, min, max) => {
    const numericValue = parseFloat(value);
    
    if (higherIsBetter) {
      if (numericValue >= percentiles.p90) {
        const range = max - percentiles.p90;
        if (range === 0) return 100;
        const position = (numericValue - percentiles.p90) / range;
        return Math.round(85 + position * 15);
      } else if (numericValue >= percentiles.p75) {
        const range = percentiles.p90 - percentiles.p75;
        if (range === 0) return 77;
        const position = (numericValue - percentiles.p75) / range;
        return Math.round(70 + position * 14);
      } else if (numericValue >= percentiles.p50) {
        const range = percentiles.p75 - percentiles.p50;
        if (range === 0) return 62;
        const position = (numericValue - percentiles.p50) / range;
        return Math.round(55 + position * 14);
      } else if (numericValue >= percentiles.p25) {
        const range = percentiles.p50 - percentiles.p25;
        if (range === 0) return 47;
        const position = (numericValue - percentiles.p25) / range;
        return Math.round(40 + position * 14);
      } else {
        const range = percentiles.p25 - min;
        if (range === 0) return 25;
        const position = Math.max(0, (numericValue - min) / range);
        return Math.round(10 + position * 29);
      }
    } else {
      if (numericValue <= percentiles.p10) {
        const range = percentiles.p10 - min;
        if (range === 0) return 100;
        const position = (percentiles.p10 - numericValue) / range;
        return Math.round(85 + position * 15);
      } else if (numericValue <= percentiles.p25) {
        const range = percentiles.p25 - percentiles.p10;
        if (range === 0) return 77;
        const position = (percentiles.p25 - numericValue) / range;
        return Math.round(70 + position * 14);
      } else if (numericValue <= percentiles.p50) {
        const range = percentiles.p50 - percentiles.p25;
        if (range === 0) return 62;
        const position = (percentiles.p50 - numericValue) / range;
        return Math.round(55 + position * 14);
      } else if (numericValue <= percentiles.p75) {
        const range = percentiles.p75 - percentiles.p50;
        if (range === 0) return 47;
        const position = (percentiles.p75 - numericValue) / range;
        return Math.round(40 + position * 14);
      } else {
        const range = max - percentiles.p75;
        if (range === 0) return 25;
        const position = Math.max(0, (max - numericValue) / range);
        return Math.round(10 + position * 29);
      }
    }
  };

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

    const { percentiles, higherIsBetter, bestPerformance, min, max } = testData;
    
    const score = calculateDeterministicScore(numericValue, percentiles, higherIsBetter, min, max);
    
    let level;
    if (score >= 85) level = "Excellent";
    else if (score >= 70) level = "Bon";
    else if (score >= 55) level = "Correct";
    else if (score >= 40) level = "Faible";
    else level = "Très faible";

    return {
      score,
      level,
      message: `Calculé sur ${testData.sampleSize} élèves`,
      method: "bareme_dynamique_deterministe",
      percentilePosition: getPercentilePosition(numericValue, percentiles, higherIsBetter),
      bestPerformance,
      testData
    };
  };

  // FONCTION CORRIGÉE : Calcul des scores de catégorie SANS les dispenses
  const calculateCategoryScoreWithDynamicBaremes = async (tests, studentLevel, studentGender) => {
    if (tests.length === 0) return { score: 0, details: [], hasInsufficientData: false };

    let totalScore = 0;
    let validTests = 0;
    let hasInsufficientData = false;
    const details = [];

    for (const test of tests) {
      // Vérifier si le test est dispensé
      const isDispensed = test.value === 'DISP' || test.value === 'dispensé';
      
      let result;
      if (isDispensed) {
        // Pour les dispensés, on crée un résultat spécial sans score
        result = {
          score: null,
          message: "Dispensé",
          method: "dispense"
        };
      } else {
        // Calcul normal pour les tests non-dispensés
        result = await scoreTestWithDynamicBareme(
          test.value, 
          test.name, 
          studentLevel, 
          studentGender
        );
      }
      
      details.push({
        testName: test.name,
        value: test.value,
        unit: test.unit,
        result
      });

      // On ne compte que les tests non-dispensés avec un score valide
      if (!isDispensed && result.score !== null && result.method !== "echantillon_insuffisant") {
        totalScore += result.score;
        validTests++;
      } else if (!isDispensed && result.method === "echantillon_insuffisant") {
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

  // Configuration de base des catégories
  const baseCategoryConfig = {
    ENDURANCE: {
      name: "Endurance",
      shortName: "END",
      icon: Activity,
      color: "#3b82f6",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200"
    },
    FORCE: {
      name: "Force",
      shortName: "FOR",
      icon: Target,
      color: "#ef4444",
      bgColor: "from-red-50 to-red-100",
      borderColor: "border-red-200"
    },
    VITESSE: {
      name: "Vitesse",
      shortName: "VIT",
      icon: Zap,
      color: "#eab308",
      bgColor: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-200"
    },
    COORDINATION: {
      name: "Coordination",
      shortName: "COO",
      icon: GitBranch,
      color: "#a855f7",
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200"
    },
    EQUILIBRE: {
      name: "Équilibre",
      shortName: "EQU",
      icon: Users,
      color: "#6366f1",
      bgColor: "from-indigo-50 to-indigo-100",
      borderColor: "border-indigo-200"
    },
    SOUPLESSE: {
      name: "Souplesse",
      shortName: "SOU",
      icon: Minimize2,
      color: "#22c55e",
      bgColor: "from-green-50 to-green-100",
      borderColor: "border-green-200"
    }
  };

  const loadAllTests = async () => {
    try {
      setTestsLoading(true);

      const { data: testsData, error } = await supabase
        .from('tests')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setAllTests(testsData || []);

      const dynamicCategories = {};
      
      Object.keys(baseCategoryConfig).forEach(categoryKey => {
        dynamicCategories[categoryKey] = {
          ...baseCategoryConfig[categoryKey],
          tests: []
        };
      });

      testsData?.forEach(test => {
        if (dynamicCategories[test.category]) {
          dynamicCategories[test.category].tests.push({
            id: test.id,
            name: test.name,
            shortName: test.name.length > 15 ? test.name.substring(0, 12) + '...' : test.name,
            unit: test.unit || ''
          });
        }
      });

      setCategories(dynamicCategories);

    } catch (err) {
      console.error('Erreur lors du chargement des tests:', err);
      setError(`Erreur lors du chargement des tests: ${err.message}`);
    } finally {
      setTestsLoading(false);
    }
  };

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

  const getEvaluationColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 55) return "#eab308";
    return "#ef4444";
  };

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

  const getCategoryAdviceShort = (category, score) => {
    const shortAdvice = {
      ENDURANCE: {
        excellent: "Continue cardio 3-4x/sem.",
        bon: "Augmente durée progressivement.",
        correct: "Jogging léger 2-3x/sem.",
        faible: "Marche, escaliers, course légère."
      },
      FORCE: {
        excellent: "Maintiens avec exercices variés.",
        bon: "Ajoute renforcement.",
        correct: "Pompes, gainage, squats.",
        faible: "Gainage facile, pompes inclinées."
      },
      VITESSE: {
        excellent: "Continue réactivité, sprints.",
        bon: "Travaille agilité.",
        correct: "Petites accélérations.",
        faible: "Coordination simple."
      },
      COORDINATION: {
        excellent: "Activités techniques variées.",
        bon: "Nouveaux mouvements complexes.",
        correct: "Équilibre dynamique.",
        faible: "Marche ligne, équilibres."
      },
      EQUILIBRE: {
        excellent: "Défis équilibre complexes.",
        bon: "Yeux fermés, surfaces instables.",
        correct: "Équilibre statique/dynamique.",
        faible: "Un pied, marche ligne."
      },
      SOUPLESSE: {
        excellent: "Étirements quotidiens.",
        bon: "Étirements après effort.",
        correct: "10-15 min étirements/jour.",
        faible: "Étirements doux 5-10 min."
      }
    };

    let level;
    if (score >= 85) level = 'excellent';
    else if (score >= 70) level = 'bon';
    else if (score >= 55) level = 'correct';
    else level = 'faible';

    return shortAdvice[category]?.[level] || "Continue tes efforts !";
  };

  // Fonction pour générer le HTML optimisé A4 avec gestion des dispenses
  const generateOptimizedHTML = (student, results, globalScore) => {
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
    <title>Fiche EPS - ${student.first_name} ${student.last_name}</title>
    <style>
        @page { size: A4; margin: 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 10px; line-height: 1.3; color: #333; background: #f9fafb; }
        
        .header { background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .student-info h1 { font-size: 20px; color: #1f2937; margin-bottom: 4px; }
        .student-details { font-size: 9px; color: #6b7280; }
        .global-score-badge { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 8px; }
        .global-score-badge .score { font-size: 24px; font-weight: bold; }
        .global-score-badge .label { font-size: 8px; opacity: 0.9; text-transform: uppercase; }
        
        .categories-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        
        .category-card { border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .category-card.endurance { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; }
        .category-card.force { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; }
        .category-card.vitesse { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #eab308; }
        .category-card.coordination { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-left: 4px solid #a855f7; }
        .category-card.equilibre { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border-left: 4px solid #6366f1; }
        .category-card.souplesse { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #22c55e; }
        
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .category-title-section { display: flex; align-items: center; gap: 8px; }
        .category-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .endurance .category-icon { background: #3b82f6; }
        .force .category-icon { background: #ef4444; }
        .vitesse .category-icon { background: #eab308; }
        .coordination .category-icon { background: #a855f7; }
        .equilibre .category-icon { background: #6366f1; }
        .souplesse .category-icon { background: #22c55e; }
        
        .category-info h3 { font-size: 12px; font-weight: bold; color: #1f2937; margin-bottom: 2px; }
        .category-info p { font-size: 8px; color: #6b7280; }
        
        .circular-gauge { position: relative; width: 60px; height: 60px; display: inline-block; }
        .gauge-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; }
        .gauge-score { font-size: 16px; font-weight: bold; display: block; line-height: 1; }
        .gauge-label { font-size: 7px; color: #6b7280; display: block; }
        
        .tests-list { margin-bottom: 8px; }
        .test-row { margin-bottom: 6px; }
        .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .test-name { font-size: 9px; font-weight: 500; color: #374151; }
        .test-value { font-size: 9px; color: #1f2937; font-weight: 600; }
        .test-value.dispensed { color: #f59e0b; font-style: italic; }
        
        .progress-bar { width: 100%; height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
        
        .advice-box { background: rgba(255,255,255,0.7); border-radius: 6px; padding: 8px; display: flex; gap: 6px; align-items: start; }
        .advice-icon { width: 16px; height: 16px; border-radius: 50%; background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #3b82f6; flex-shrink: 0; }
        .advice-content h4 { font-size: 8px; font-weight: bold; color: #1f2937; margin-bottom: 2px; }
        .advice-content p { font-size: 8px; color: #4b5563; line-height: 1.4; }
        
        .footer { background: white; border-radius: 8px; padding: 10px; margin-top: 10px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .footer h3 { font-size: 11px; font-weight: bold; color: #1f2937; margin-bottom: 4px; }
        .footer p { font-size: 9px; color: #6b7280; line-height: 1.4; }
        .footer-meta { font-size: 7px; color: #9ca3af; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <div class="student-info">
            <h1>${student.first_name} ${student.last_name}</h1>
            <div class="student-details">
                ${student.classes.level}${student.classes.name} • ${student.gender === 'M' ? 'Garçon' : 'Fille'} • 
                Année ${selectedSchoolYear} • Collège Yves du Manoir
            </div>
        </div>
        <div class="global-score-badge">
            <div class="score">${globalScore}/100</div>
            <div class="label">Score Global</div>
        </div>
    </div>
    
    <div class="categories-grid">
        ${Object.entries(categories).map(([key, category]) => {
          const result = results?.[key] || { 
            score: 0, 
            tests: [], 
            testsCompleted: 0, 
            totalTests: category.tests?.length || 0,
            details: [],
            level: "Non évalué"
          };
          
          const categoryClass = key.toLowerCase();
          const scoreColor = getEvaluationColor(result.score);
          const circumference = 2 * Math.PI * 22;
          const strokeDashoffset = circumference - (result.score / 100) * circumference;
          
          return `
          <div class="category-card ${categoryClass}">
            <div class="category-header">
              <div class="category-title-section">
                <div class="category-icon">${category.shortName}</div>
                <div class="category-info">
                  <h3>${category.name}</h3>
                  <p>${result.testsCompleted}/${result.totalTests} • ${result.level}</p>
                </div>
              </div>
              
              <div class="circular-gauge">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                  <circle cx="30" cy="30" r="22" fill="none" 
                    stroke="${scoreColor}" 
                    stroke-width="6" 
                    stroke-linecap="round"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${strokeDashoffset}"
                    transform="rotate(-90 30 30)"/>
                </svg>
                <div class="gauge-text">
                  <span class="gauge-score" style="color: ${scoreColor}">${result.score}</span>
                  <span class="gauge-label">/100</span>
                </div>
              </div>
            </div>
            
            <div class="tests-list">
              ${category.tests?.slice(0, 4).map(test => {
                const testDetail = result.details?.find(d => d.testName === test.name);
                const hasResult = !!testDetail;
                const isDispensed = hasResult && (testDetail.value === 'DISP' || testDetail.value === 'dispensé');
                
                let testScore = 0;
                
                if (hasResult && testDetail.result && !isDispensed) {
                  if (testDetail.result.method !== "echantillon_insuffisant") {
                    testScore = testDetail.result.score || 0;
                  }
                }
                
                const testColor = hasResult && testScore > 0 ? getEvaluationColor(testScore) : "#d1d5db";
                const displayValue = hasResult ? 
                  (isDispensed ? 'Dispensé' : `${testDetail.value} ${testDetail.unit}`) : 
                  '-';
                
                return `
                <div class="test-row">
                  <div class="test-header">
                    <span class="test-name">${test.shortName}</span>
                    <span class="test-value ${isDispensed ? 'dispensed' : ''}">${displayValue}</span>
                  </div>
                  <div class="progress-bar">
                    <div style="height: 100%; width: ${testScore}%; background: ${testColor}; border-radius: 3px;"></div>
                  </div>
                </div>
                `;
              }).join('') || '<div class="test-row"><span class="test-name">Aucun test</span></div>'}
            </div>
            
            <div class="advice-box">
              <div class="advice-icon">i</div>
              <div class="advice-content">
                <h4>Conseil personnalisé</h4>
                <p>${getCategoryAdviceShort(key, result.score)}</p>
              </div>
            </div>
          </div>
          `;
        }).join('')}
    </div>
    
    <div class="footer">
        <h3>Recommandation pour ${student.first_name}</h3>
        <p>
            ${globalScore >= 85 ? 
              "Excellente condition physique ! Maintiens ce niveau avec 60 min d'activité quotidienne (OMS)." :
            globalScore >= 70 ? 
              "Bon niveau ! Quelques efforts supplémentaires pour atteindre 60 min/jour (OMS)." :
            globalScore >= 55 ? 
              "Bonnes bases ! Avec de la régularité, tu atteindras les 60 min recommandées." :
              "Chaque effort compte ! Commence progressivement vers 60 min/jour."}
        </p>
        <div class="footer-meta">
            Système de notation déterministe • Généré le ${currentDate} • EPS Tracker YDM
        </div>
    </div>
</body>
</html>
    `;
  };

  const exportToPDF = () => {
    if (!selectedStudent || !studentResults) {
      alert('Aucune donnée à exporter pour cet élève.');
      return;
    }

    const globalScore = (() => {
      const categoriesWithResults = Object.values(studentResults).filter(cat => cat.score > 0);
      if (categoriesWithResults.length === 0) return 0;
      return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
    })();

    const printContent = generateOptimizedHTML(selectedStudent, studentResults, globalScore);
    
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

  const exportAllClassPDFs = async () => {
    if (!students || students.length === 0) {
      alert('Aucun élève dans cette classe.');
      return;
    }

    try {
      setLoading(true);
      
      const allPagesHTML = [];
      
      for (const student of students) {
        const { data: results, error: resultsError } = await supabase
          .from('results')
          .select(`
            *,
            tests!inner(name, category, unit),
            students!inner(school_year)
          `)
          .eq('student_id', student.id)
          .eq('students.school_year', selectedSchoolYear);

        if (resultsError) {
          console.error(`Erreur pour ${student.first_name} ${student.last_name}:`, resultsError);
          continue;
        }

        const processedResults = await processStudentResultsWithDynamicBaremes(results || [], student);
        
        const globalScore = (() => {
          const categoriesWithResults = Object.values(processedResults).filter(cat => cat.score > 0);
          if (categoriesWithResults.length === 0) return 0;
          return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
        })();

        const studentHTML = generateOptimizedHTML(student, processedResults, globalScore);
        
        const bodyMatch = studentHTML.match(/<body>([\s\S]*)<\/body>/);
        if (bodyMatch) {
          allPagesHTML.push(`
            <div class="student-page" style="page-break-after: always;">
              ${bodyMatch[1]}
            </div>
          `);
        }
      }

      const currentDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });

      const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fiches EPS - ${selectedClass.level}${selectedClass.name} - ${selectedSchoolYear}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 9px; line-height: 1.2; color: #333; background: white; }
        .student-page { min-height: 100vh; position: relative; }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body>
    ${allPagesHTML.join('\n')}
    
    <div style="page-break-before: always; padding: 20px; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1f2937;">
          Fiches EPS - ${selectedClass.level}${selectedClass.name}
        </h1>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
          Année scolaire ${selectedSchoolYear} • Collège Yves du Manoir
        </p>
        <p style="font-size: 12px; color: #9ca3af;">
          Document généré le ${currentDate} • ${students.length} élève${students.length > 1 ? 's' : ''} • 
          Système de notation déterministe
        </p>
    </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(fullHTML);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

    } catch (err) {
      console.error('Erreur lors de l\'export des fiches:', err);
      alert(`Erreur lors de l'export: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchoolYear) {
      loadAllTests();
      loadClassesAndCounts();
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadStudentsForClass(selectedClass.id);
    }
  }, [selectedClass, selectedSchoolYear]);

  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_year', selectedSchoolYear)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      if (selectedClass && !classesData.find(c => c.id === selectedClass.id)) {
        setSelectedClass(null);
        setSelectedStudent(null);
        setStudents([]);
        setStudentResults(null);
      }

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

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

    } catch (err) {
      console.error('Erreur lors du chargement des élèves:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // FONCTION CORRIGÉE : Ne compte que les tests NON dispensés
  const processStudentResultsWithDynamicBaremes = async (results, student) => {
    const categoryScores = {};
    
    Object.keys(categories).forEach(catKey => {
      categoryScores[catKey] = { 
        score: 0, 
        tests: [], 
        level: "Non évalué",
        testsCompleted: 0,
        totalTests: categories[catKey]?.tests?.length || 0,
        completionPercentage: 0,
        hasInsufficientData: false,
        details: []
      };
    });

    results.forEach(result => {
      const testCategory = result.tests.category;
      const isDispensed = result.value === 'DISP' || result.value === 'dispensé';
      
      if (categoryScores[testCategory]) {
        // On ajoute tous les résultats (y compris dispensés) pour l'affichage
        categoryScores[testCategory].tests.push({
          name: result.tests.name,
          value: result.value,
          unit: result.tests.unit
        });
        
        // Mais on ne compte que les tests NON-dispensés pour le compteur
        if (!isDispensed) {
          categoryScores[testCategory].testsCompleted++;
        }
      }
    });

    for (const categoryName of Object.keys(categoryScores)) {
      const categoryData = categoryScores[categoryName];
      const testsCount = categoryData.testsCompleted;
      const totalTests = categoryData.totalTests;
      
      categoryData.completionPercentage = totalTests > 0 
        ? Math.round((testsCount / totalTests) * 100) 
        : 0;

      if (testsCount > 0 || categoryData.tests.length > 0) {
        try {
          const studentLevel = student?.classes?.level;
          const studentGender = student?.gender;
          
          if (studentLevel && studentGender) {
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

  const loadStudentResults = async (studentId, student) => {
    try {
      setLoading(true);
  
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

      const processedResults = await processStudentResultsWithDynamicBaremes(
        results || [], 
        student
      );
      
      setStudentResults(processedResults);
  
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Fiches Individuelles - EPS SANTÉ</h1>
            <p className="text-gray-600">Sélectionnez une classe pour consulter les fiches individuelles des élèves</p>
          </div>

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
            </div>
          </div>

          {testsLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-6">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Chargement des tests dynamique...
              </h3>
            </div>
          )}

          {!testsLoading && classes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
              <BookOpen size={64} className="mx-auto text-yellow-500 mb-6" />
              <h3 className="text-2xl font-semibold text-yellow-800 mb-4">
                Aucune classe pour {selectedSchoolYear}
              </h3>
            </div>
          ) : !testsLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {Object.entries(classesByLevel).map(([level, levelClasses]) => (
                levelClasses.length > 0 && (
                  <div key={level} className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                        <h2 className={`text-xl font-bold ${getLevelColors(level).text}`}>
                          {level}
                        </h2>
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                      </div>
                    </div>
                    
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

  const StudentSelectionView = () => {
    const colors = getLevelColors(selectedClass.level);
    
    const filteredStudents = students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
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
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportAllClassPDFs}
                  disabled={loading || students.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-md transition-all ${
                    loading || students.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                  }`}
                >
                  <Download size={16} />
                  <span>{loading ? 'Export en cours...' : `Exporter toute la classe (${students.length})`}</span>
                </button>
                <div className={`text-sm ${colors.text} font-medium`}>
                  {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

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

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Chargement des élèves...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={32} />
              <p className="text-gray-600 mb-2">Aucun élève trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => (
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
                    </div>
                    <ChevronRight className="text-gray-400" size={16} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const StudentFitnessCardView = () => {
    const colors = selectedStudent?.classes ? getLevelColors(selectedStudent.classes.level) : getLevelColors('6ème');
    const globalScore = studentResults ? (() => {
      const categoriesWithResults = Object.values(studentResults).filter(cat => cat.score > 0);
      if (categoriesWithResults.length === 0) return 0;
      return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
    })() : 0;

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categories).map(([key, category]) => {
                const result = studentResults?.[key] || { 
                  score: 0, 
                  tests: [], 
                  testsCompleted: 0, 
                  totalTests: category.tests?.length || 0,
                  details: []
                };
                
                const IconComponent = category.icon;
                const evaluationColor = getEvaluationColor(result.score);
                
                return (
                  <div key={key} className={`bg-gradient-to-br ${category.bgColor} rounded-lg shadow-md border ${category.borderColor} p-4`}>
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

                    <div className="flex justify-center mb-4">
                      <CircularGauge score={result.score} color={evaluationColor} size={80} />
                    </div>

                    <div className="space-y-2 mb-4">
                      {category.tests?.map((test, index) => {
                        const testDetail = result.details?.find(d => d.testName === test.name);
                        const hasResult = !!testDetail;
                        const isDispensed = hasResult && (testDetail.value === 'DISP' || testDetail.value === 'dispensé');
                        
                        let testScore = 0;
                        
                        if (hasResult && testDetail.result && !isDispensed) {
                          if (testDetail.result.method !== "echantillon_insuffisant") {
                            testScore = testDetail.result.score || 0;
                          }
                        }
                        
                        const testEvaluationColor = hasResult && testScore > 0 ? getEvaluationColor(testScore) : "#d1d5db";
                        const displayValue = hasResult ? 
                          (isDispensed ? 'Dispensé' : `${testDetail.value} ${testDetail.unit}`) : 
                          '-';
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-700">
                                {test.shortName}
                              </span>
                              <span className={`text-xs ${isDispensed ? 'text-amber-600 italic' : 'text-gray-600'}`}>
                                {displayValue}
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full transition-all duration-1000"
                                style={{ 
                                  width: hasResult && testScore > 0 ? `${testScore}%` : '0%',
                                  backgroundColor: testEvaluationColor
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

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
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              loadAllTests();
              loadClassesAndCounts();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if ((loading || testsLoading) && !selectedClass && !selectedStudent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
          <span className="text-gray-600">
            {testsLoading ? 'Chargement dynamique des tests...' : 'Chargement des classes...'}
          </span>
        </div>
      </div>
    );
  }

  if (!selectedClass) {
    return <ClassSelectionView />;
  }

  if (!selectedStudent) {
    return <StudentSelectionView />;
  }

  return <StudentFitnessCardView />;
};

export default IndividualFitnessCard;