// ChallengesClasses.jsx - VERSION AVEC EXPORT PDF INTÉGRÉ ET CORRECTION DES UNITÉS
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

  // ============================================================================
  // FONCTIONS UTILITAIRES POUR LES UNITÉS
  // ============================================================================

  // Fonction pour déterminer l'unité d'affichage d'un test
  const getTestDisplayUnit = (testName, testUnit) => {
    if (!testName && !testUnit) return '';
    
    // Détecter les tests de temps (où on affiche en secondes)
    const timeTests = ['SPRINTS', 'VITESSE', '30 mètres', '30m'];
    const isTimeTest = timeTests.some(keyword => 
      testName?.toUpperCase().includes(keyword.toUpperCase())
    );
    
    if (isTimeTest || testUnit === 'secondes' || testUnit === 's') {
      return 's';
    }
    
    // Détecter les tests de distance (où on affiche en mètres)
    const distanceTests = ['DEMI-COOPER', 'ENDURANCE', 'COOPER', 'VAMEVAL'];
    const isDistanceTest = distanceTests.some(keyword => 
      testName?.toUpperCase().includes(keyword.toUpperCase())
    );
    
    if (isDistanceTest || testUnit === 'mètres' || testUnit === 'm') {
      return 'm';
    }
    
    // Détecter les tests de saut (où on affiche en centimètres)
    const jumpTests = ['SAUT', 'LONGUEUR'];
    const isJumpTest = jumpTests.some(keyword => 
      testName?.toUpperCase().includes(keyword.toUpperCase())
    );
    
    if (isJumpTest || testUnit === 'centimètres' || testUnit === 'cm') {
      return 'cm';
    }
    
    // Par défaut, on suppose que c'est un score transformé
    return '/100';
  };

  // Fonction pour formater une valeur avec son unité
  const formatTestValue = (value, testName, testUnit) => {
    if (value === null || value === undefined) return '—';
    
    const unit = getTestDisplayUnit(testName, testUnit);
    const roundedValue = Math.round(value * 100) / 100;
    
    // Pour les unités physiques, on affiche la valeur avec l'unité
    if (unit === 'm' || unit === 'cm' || unit === 's') {
      return `${roundedValue} ${unit}`;
    }
    
    // Pour les scores sur 100, on garde l'affichage actuel
    return `${Math.round(value)}${unit}`;
  };

  // ============================================================================
  // FONCTION D'EXPORT PDF INTÉGRÉE
  // ============================================================================

  // Fonction principale d'export PDF
  const exportChallengesPDF = () => {
    if (!challengeResults || challengeResults.length === 0) {
      alert('Aucune donnée à exporter. Veuillez d\'abord configurer et lancer un challenge.');
      return;
    }
    
    // Préparer les données pour l'export
    const exportData = challengeResults.map((data, index) => ({
      rank: index + 1,
      classDisplayName: `${data.classe.level}${data.classe.name}`,
      level: data.classe.level,
      name: data.classe.name,
      averageScore: data.average || 0,
      bestScore: data.bestScore || 0,
      participationRate: data.participation || 0,
      excellentCount: data.excellentCount || 0,
      completedTests: data.completedTests || 0,
      totalTests: data.totalTests || 0,
      totalStudents: data.studentsCount || 0
    }));

    // Configuration pour l'export avec les informations du test
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
      totalResults: results.length
    };
    
    // Générer et afficher le PDF
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

  // Fonctions utilitaires pour les labels
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

  // Génération du HTML pour l'impression
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
        /* Reset et configuration de base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Configuration page A4 */
        @page {
            size: A4;
            margin: 15mm;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #333;
            background: white;
        }
        
        /* Header */
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #4F46E5;
        }
        
        .header h1 {
            font-size: 24px;
            color: #4F46E5;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .header .subtitle {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 8px;
        }
        
        .header .info-line {
            font-size: 12px;
            color: #374151;
        }
        
        /* Configuration du challenge */
        .config-section {
            background: #F9FAFB;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #E5E7EB;
        }
        
        .config-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 8px;
        }
        
        .config-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
        }
        
        .config-item {
            text-align: center;
        }
        
        .config-label {
            font-size: 10px;
            color: #6B7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .config-value {
            font-size: 12px;
            font-weight: bold;
            color: #111827;
        }
        
        /* Tableau des résultats */
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
        }
        
        .results-table th {
            background: #4F46E5;
            color: white;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
        }
        
        .results-table td {
            padding: 6px;
            text-align: center;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .results-table tr:nth-child(even) {
            background: #F9FAFB;
        }
        
        /* Styles pour le rang */
        .rank-cell {
            font-weight: bold;
            font-size: 12px;
        }
        
        .rank-1 { color: #FFD700; }
        .rank-2 { color: #C0C0C0; }
        .rank-3 { color: #CD7F32; }
        
        /* Classe */
        .class-cell {
            font-weight: bold;
            font-size: 11px;
        }
        
        /* Métriques */
        .metric-excellent { color: #059669; font-weight: bold; }
        .metric-good { color: #0EA5E9; font-weight: bold; }
        .metric-average { color: #F59E0B; font-weight: bold; }
        .metric-low { color: #DC2626; font-weight: bold; }
        
        /* Message de félicitations */
        .congratulations {
            background: linear-gradient(135deg, #FEF3C7, #FDE68A);
            border: 2px solid #F59E0B;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            margin-bottom: 15px;
        }
        
        .congratulations h3 {
            color: #92400E;
            font-size: 13px;
            margin-bottom: 4px;
        }
        
        .congratulations p {
            color: #B45309;
            font-size: 10px;
        }
        
        /* Statistiques résumées */
        .summary-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .stat-card {
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 16px;
            font-weight: bold;
            color: #4F46E5;
        }
        
        .stat-label {
            font-size: 9px;
            color: #6B7280;
            text-transform: uppercase;
            margin-top: 2px;
        }
        
        /* Footer */
        .footer {
            position: fixed;
            bottom: 10mm;
            left: 15mm;
            right: 15mm;
            text-align: center;
            font-size: 8px;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
            padding-top: 5px;
        }
        
        /* Masquer les éléments non imprimables */
        @media print {
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>🏆 Challenge Classes - EPS SANTÉ</h1>
        <div class="subtitle">Comparaisons et défis motivants entre classes</div>
        <div class="info-line">
            ${config.establishmentName || 'Collège Yves du Manoir'} • Année ${config.schoolYear} • 
            Édité le ${currentDate}
        </div>
    </div>
    
    <!-- Configuration du challenge -->
    <div class="config-section">
        <div class="config-title">Configuration du Challenge</div>
        <div class="config-grid">
            <div class="config-item">
                <div class="config-label">Type de comparaison</div>
                <div class="config-value">${config.comparisonType}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Test à comparer</div>
                <div class="config-value">${config.selectedTest}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Niveau</div>
                <div class="config-value">${config.selectedLevel}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Classer par</div>
                <div class="config-value">${config.sortBy}</div>
            </div>
        </div>
    </div>
    
    <!-- Message de félicitations pour le leader -->
    ${challengeData.length > 0 ? `
    <div class="congratulations">
        <h3>🏆 Champions ! Félicitations à toute la classe !</h3>
        <p>${challengeData[0].classDisplayName} domine ce challenge avec un excellent niveau de participation et de performance !</p>
    </div>
    ` : ''}
    
    <!-- Statistiques résumées -->
    <div class="summary-stats">
        <div class="stat-card">
            <div class="stat-number">${challengeData.length}</div>
            <div class="stat-label">Classes participantes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${challengeData.reduce((sum, c) => sum + (c.totalStudents || 0), 0)}</div>
            <div class="stat-label">Élèves au total</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${challengeData.length > 0 ? Math.round(challengeData.reduce((sum, c) => sum + (c.participationRate || 0), 0) / challengeData.length) : 0}%</div>
            <div class="stat-label">Participation moyenne</div>
        </div>
    </div>
    
    <!-- Tableau des résultats -->
    <table class="results-table">
        <thead>
            <tr>
                <th style="width: 8%">#</th>
                <th style="width: 20%">Classe</th>
                <th style="width: 12%">Moyenne</th>
                <th style="width: 15%">Meilleur Score</th>
                <th style="width: 12%">Participation</th>
                <th style="width: 10%">Excellents</th>
                <th style="width: 13%">Tests Réalisés</th>
                <th style="width: 10%">Élèves</th>
            </tr>
        </thead>
        <tbody>
            ${challengeData.map((classe, index) => {
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                
                // Déterminer les classes CSS pour les métriques
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
                    <td class="${avgClass}">${formatTestValue(classe.averageScore, config.selectedTestName, config.selectedTestUnit)}</td>
                    <td class="${classe.bestScore >= 85 ? 'metric-excellent' : 'metric-good'}">${formatTestValue(classe.bestScore, config.selectedTestName, config.selectedTestUnit)}</td>
                    <td class="${participationClass}">${Math.round(classe.participationRate || 0)}%</td>
                    <td class="metric-excellent">${classe.excellentCount || 0}</td>
                    <td>${classe.completedTests || 0}/${classe.totalTests || 0}</td>
                    <td>${classe.totalStudents || 0}</td>
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>
    
    <!-- Message motivant -->
    <div style="background: #EBF8FF; border: 1px solid #3182CE; border-radius: 6px; padding: 10px; text-align: center; margin-bottom: 15px;">
        <p style="color: #2C5AA0; font-size: 11px; font-weight: 500;">
            💪 L'activité physique régulière améliore la santé, la concentration et le bien-être. 
            Objectif OMS : 60 minutes d'activité physique par jour pour les jeunes !
        </p>
    </div>
    
    <!-- Notes méthodologiques -->
    <div style="background: #F7FAFC; border: 1px solid #CBD5E0; border-radius: 4px; padding: 8px; margin-bottom: 10px;">
        <p style="font-size: 8px; color: #4A5568; line-height: 1.4;">
            <strong>Méthodologie :</strong> Système de notation dynamique basé sur les percentiles de performance 
            des élèves de même niveau et sexe. Excellent ≥85pts, Bon ≥70pts, Correct ≥55pts. 
            Challenge généré le ${currentDate} avec ${config.totalResults || 0} résultats analysés.
        </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
        Document généré automatiquement par EPS Tracker YDM • 
        ${config.establishmentName || 'Collège Yves du Manoir'} • 
        ${currentDate}
    </div>
</body>
</html>
    `;
  };

  // ============================================================================
  // RESTE DU CODE ORIGINAL INCHANGÉ
  // ============================================================================

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
              onClick={exportChallengesPDF}
              disabled={challengeResults.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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

                    {/* Statistiques - 5 colonnes */}
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