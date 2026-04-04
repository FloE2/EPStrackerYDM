// TrendAnalysis.jsx
// Analyse des tendances de condition physique — comparaison des cohortes dans le temps
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Info,
  Activity, Target, GitBranch, Zap, Users, Minimize2,
  RefreshCw, BarChart3, Calendar, ChevronDown, ChevronUp,
  Award, AlertCircle
} from 'lucide-react';
import { supabase } from './lib/supabase.js';

// ─── Constantes ────────────────────────────────────────────────────────────────

const LEVEL_ORDER = ['6ème', '5ème', '4ème', '3ème'];
const LEVEL_COLORS = {
  '6ème': '#3b82f6',
  '5ème': '#22c55e',
  '4ème': '#f97316',
  '3ème': '#a855f7',
};

const CATEGORIES = {
  ENDURANCE:    { name: 'Endurance',    color: '#3b82f6', icon: Activity   },
  FORCE:        { name: 'Force',        color: '#dc2626', icon: Target     },
  VITESSE:      { name: 'Vitesse',      color: '#eab308', icon: Zap        },
  COORDINATION: { name: 'Coordination', color: '#a855f7', icon: GitBranch  },
  EQUILIBRE:    { name: 'Équilibre',    color: '#6366f1', icon: Users      },
  SOUPLESSE:    { name: 'Souplesse',    color: '#22c55e', icon: Minimize2  },
};

const SCORE_BANDS = [
  { label: 'Excellent',   min: 85,  max: 100, color: '#22c55e', bg: '#dcfce7' },
  { label: 'Bon',         min: 70,  max: 84,  color: '#3b82f6', bg: '#dbeafe' },
  { label: 'Correct',     min: 55,  max: 69,  color: '#eab308', bg: '#fef9c3' },
  { label: 'À améliorer', min: 0,   max: 54,  color: '#ef4444', bg: '#fee2e2' },
];

// ─── Logique de scoring identique aux autres composants ───────────────────────

const getTestDirection = (testName) => {
  const timeBased = ['SPRINTS 10 x 5', '30 mètres', 'FLAMINGO'];
  return !timeBased.some(t => testName.toUpperCase().includes(t.toUpperCase()));
};

const calcPercentiles = (vals) => {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  return {
    p25: s[Math.floor(n * 0.25)] ?? s[0],
    p50: s[Math.floor(n * 0.50)] ?? s[0],
    p75: s[Math.floor(n * 0.75)] ?? s[n - 1],
    p90: s[Math.floor(n * 0.90)] ?? s[n - 1],
    p10: s[Math.floor(n * 0.10)] ?? s[0],
  };
};

const calcScore = (value, percentiles, higherIsBetter, min, max) => {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (higherIsBetter) {
    if (v >= percentiles.p90) { const r = max - percentiles.p90; if (!r) return 100; return Math.round(85 + (v - percentiles.p90) / r * 15); }
    if (v >= percentiles.p75) { const r = percentiles.p90 - percentiles.p75; if (!r) return 77; return Math.round(70 + (v - percentiles.p75) / r * 14); }
    if (v >= percentiles.p50) { const r = percentiles.p75 - percentiles.p50; if (!r) return 62; return Math.round(55 + (v - percentiles.p50) / r * 14); }
    if (v >= percentiles.p25) { const r = percentiles.p50 - percentiles.p25; if (!r) return 47; return Math.round(40 + (v - percentiles.p25) / r * 14); }
    const r = percentiles.p25 - min; if (!r) return 25; return Math.round(10 + Math.max(0, (v - min) / r) * 29);
  } else {
    if (v <= percentiles.p10) { const r = percentiles.p10 - min; if (!r) return 100; return Math.round(85 + (percentiles.p10 - v) / r * 15); }
    if (v <= percentiles.p25) { const r = percentiles.p25 - percentiles.p10; if (!r) return 77; return Math.round(70 + (percentiles.p25 - v) / r * 14); }
    if (v <= percentiles.p50) { const r = percentiles.p50 - percentiles.p25; if (!r) return 62; return Math.round(55 + (percentiles.p50 - v) / r * 14); }
    if (v <= percentiles.p75) { const r = percentiles.p75 - percentiles.p50; if (!r) return 47; return Math.round(40 + (percentiles.p75 - v) / r * 14); }
    const r = max - percentiles.p75; if (!r) return 25; return Math.round(10 + Math.max(0, (max - v) / r) * 29);
  }
};

// Score d'un élève par rapport à la COHORTE GLOBALE (tous niveaux confondus)
// Cela permet de comparer les niveaux entre eux
const scoreVsGlobalCohort = (value, allValues, higherIsBetter) => {
  const numericValues = allValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (numericValues.length < 5) return null;
  const percentiles = calcPercentiles(numericValues);
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  return calcScore(value, percentiles, higherIsBetter, min, max);
};

// ─── Composants UI ─────────────────────────────────────────────────────────────

const InsightCard = ({ icon: Icon, title, value, delta, color, description }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '15' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      {delta !== undefined && delta !== null && (
        <span className={`text-xs font-bold flex items-center gap-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta >= 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
    {description && <p className="text-xs text-gray-500 leading-relaxed">{description}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></div>
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-indigo-50 rounded-lg">
      <Icon size={18} className="text-indigo-600" />
    </div>
    <div>
      <h2 className="font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Composant principal ───────────────────────────────────────────────────────

const TrendAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [cohortData, setCohortData] = useState([]); // [{schoolYear, level, avgScore, categoryScores, studentCount, ...}]
  const [schoolYears, setSchoolYears] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [expandedInsights, setExpandedInsights] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Charger tous les tests
      setProgress('Chargement des tests...');
      const { data: tests } = await supabase.from('tests').select('id, name, category, unit');
      if (!tests?.length) throw new Error('Aucun test trouvé');

      // 2. Charger toutes les classes avec leur année et niveau
      setProgress('Chargement des classes...');
      const { data: classes } = await supabase
        .from('classes').select('id, name, level, school_year');
      if (!classes?.length) throw new Error('Aucune classe trouvée');

      // 3. Charger TOUS les résultats valides (pas absent, pas dispensé)
      setProgress('Chargement des résultats...');
      const { data: results } = await supabase
        .from('results')
        .select(`
          value, test_id, student_id,
          tests!inner(id, name, category, unit),
          students!inner(id, gender, school_year, class_id, classes!inner(level))
        `)
        .eq('absent', false)
        .eq('dispensed', false)
        .not('value', 'is', null);

      if (!results?.length) throw new Error('Aucun résultat trouvé');

      // 4. Organiser les données par (schoolYear, level, testName)
      setProgress('Calcul des statistiques...');

      // Construire un index global par testName → toutes les valeurs (pour scoring global)
      const globalTestValues = {};
      results.forEach(r => {
        const testName = r.tests?.name;
        if (!testName) return;
        const val = parseFloat(r.value);
        if (isNaN(val)) return;
        if (!globalTestValues[testName]) globalTestValues[testName] = [];
        globalTestValues[testName].push(val);
      });

      // Regrouper par (schoolYear, level)
      const groupMap = {}; // key: "2025-2026__6ème"
      results.forEach(r => {
        const schoolYear = r.students?.school_year;
        const level = r.students?.classes?.level;
        const studentId = r.student_id;
        const gender = r.students?.gender;
        const testName = r.tests?.name;
        const category = r.tests?.category;
        const value = r.value;
        if (!schoolYear || !level || !testName) return;

        const key = `${schoolYear}__${level}`;
        if (!groupMap[key]) {
          groupMap[key] = {
            schoolYear, level,
            students: new Set(),
            // testName → [values]
            testValues: {},
            // category → [scores]
            categoryScores: {},
            genderBreakdown: { M: new Set(), F: new Set() }
          };
        }
        groupMap[key].students.add(studentId);
        if (gender === 'M') groupMap[key].genderBreakdown.M.add(studentId);
        if (gender === 'F') groupMap[key].genderBreakdown.F.add(studentId);
        if (!groupMap[key].testValues[testName]) groupMap[key].testValues[testName] = [];
        groupMap[key].testValues[testName].push(parseFloat(value));
      });

      // 5. Pour chaque groupe, calculer les scores vs cohorte globale
      setProgress('Normalisation des scores...');
      const computed = [];

      for (const [key, group] of Object.entries(groupMap)) {
        const catScores = {};
        const catCounts = {};

        for (const [testName, values] of Object.entries(group.testValues)) {
          const allValues = globalTestValues[testName] || [];
          const higherIsBetter = getTestDirection(testName);
          const category = results.find(r => r.tests?.name === testName)?.tests?.category;
          if (!category) continue;

          const testScores = values
            .map(v => scoreVsGlobalCohort(v, allValues, higherIsBetter))
            .filter(s => s !== null);

          if (!testScores.length) continue;
          const avgTestScore = testScores.reduce((a, b) => a + b, 0) / testScores.length;

          if (!catScores[category]) { catScores[category] = 0; catCounts[category] = 0; }
          catScores[category] += avgTestScore;
          catCounts[category]++;
        }

        // Score moyen par catégorie
        const finalCatScores = {};
        for (const cat of Object.keys(CATEGORIES)) {
          finalCatScores[cat] = catCounts[cat] > 0
            ? Math.round(catScores[cat] / catCounts[cat])
            : null;
        }

        // Score global = moyenne des catégories avec données
        const validCats = Object.values(finalCatScores).filter(s => s !== null);
        const globalScore = validCats.length > 0
          ? Math.round(validCats.reduce((a, b) => a + b, 0) / validCats.length)
          : null;

        // Nombre de tests disponibles vs possibles pour ce groupe
        const testsAvailable = Object.keys(group.testValues).length;
        const totalPossible = tests.length;
        const completionRate = Math.round((testsAvailable / totalPossible) * 100);

        // Distribution des scores (nécessite les scores individuels par étudiant)
        // On approxime avec le score global
        const studentCount = group.students.size;

        computed.push({
          schoolYear: group.schoolYear,
          level: group.level,
          globalScore,
          categoryScores: finalCatScores,
          studentCount,
          completionRate,
          testsAvailable,
          totalPossible,
          genderBreakdown: {
            M: group.genderBreakdown.M.size,
            F: group.genderBreakdown.F.size
          }
        });
      }

      // Trier
      computed.sort((a, b) => {
        const yearDiff = a.schoolYear.localeCompare(b.schoolYear);
        if (yearDiff !== 0) return yearDiff;
        return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      });

      const years = [...new Set(computed.map(c => c.schoolYear))].sort();
      const levels = [...new Set(computed.map(c => c.level))]
        .sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));

      setCohortData(computed);
      setSchoolYears(years);
      setAvailableLevels(levels);

    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ── Données pour les graphiques ──────────────────────────────────────────────

  // Score global par niveau (vue transversale — dernière année)
  const latestYear = schoolYears[schoolYears.length - 1];
  const latestData = cohortData.filter(c => c.schoolYear === latestYear);
  const crossSectionalData = LEVEL_ORDER
    .filter(l => availableLevels.includes(l))
    .map(level => {
      const d = latestData.find(c => c.level === level);
      return { level, score: d?.globalScore ?? null, students: d?.studentCount ?? 0 };
    }).filter(d => d.score !== null);

  // Données longitudinales (un niveau sur plusieurs années)
  const longitudinalData = schoolYears.map(year => {
    const entry = { year };
    LEVEL_ORDER.forEach(level => {
      const d = cohortData.find(c => c.schoolYear === year && c.level === level);
      entry[level] = d?.globalScore ?? null;
    });
    return entry;
  });

  // Scores par catégorie par niveau (dernière année)
  const categoryByLevelData = Object.keys(CATEGORIES).map(cat => {
    const entry = { cat: CATEGORIES[cat].name };
    LEVEL_ORDER.forEach(level => {
      const d = latestData.find(c => c.level === level);
      entry[level] = d?.categoryScores[cat] ?? null;
    });
    return entry;
  });

  // Radar multi-niveaux (dernière année)
  const radarData = Object.keys(CATEGORIES).map(cat => {
    const entry = { cat: CATEGORIES[cat].name.slice(0, 6) };
    LEVEL_ORDER.forEach(level => {
      const d = latestData.find(c => c.level === level);
      entry[level] = d?.categoryScores[cat] ?? 0;
    });
    return entry;
  });

  // ── Insights automatiques ─────────────────────────────────────────────────────

  const generateInsights = () => {
    const insights = [];
    if (crossSectionalData.length < 2) return insights;

    const sixieme = crossSectionalData.find(d => d.level === '6ème');
    const troisieme = crossSectionalData.find(d => d.level === '3ème');

    // Tendance transversale
    if (sixieme && troisieme) {
      const diff = troisieme.score - sixieme.score;
      if (diff < -5) {
        insights.push({
          type: 'warning',
          icon: TrendingDown,
          color: '#ef4444',
          text: `⚠️ Les 3ème affichent un score moyen de ${diff} points inférieur aux 6ème (${troisieme.score} vs ${sixieme.score}/100). Cela suggère une dégradation de la condition physique au fil du collège.`
        });
      } else if (diff > 5) {
        insights.push({
          type: 'positive',
          icon: TrendingUp,
          color: '#22c55e',
          text: `✅ Les 3ème affichent un score moyen de +${diff} points supérieur aux 6ème (${troisieme.score} vs ${sixieme.score}/100). La condition physique s'améliore au fil du collège.`
        });
      } else {
        insights.push({
          type: 'neutral',
          icon: Minus,
          color: '#6b7280',
          text: `➡️ Peu de différence entre 6ème et 3ème (${sixieme.score} vs ${troisieme.score}/100). La condition physique reste stable sur le collège.`
        });
      }
    }

    // Catégorie la plus en baisse entre 6ème et 3ème
    const sixiemeData = latestData.find(c => c.level === '6ème');
    const troisiemeData = latestData.find(c => c.level === '3ème');
    if (sixiemeData && troisiemeData) {
      const catDeltas = Object.keys(CATEGORIES)
        .map(k => ({
          cat: k,
          delta: (troisiemeData.categoryScores[k] ?? 0) - (sixiemeData.categoryScores[k] ?? 0)
        }))
        .filter(d => sixiemeData.categoryScores[d.cat] !== null && troisiemeData.categoryScores[d.cat] !== null)
        .sort((a, b) => a.delta - b.delta);

      if (catDeltas.length > 0) {
        const worst = catDeltas[0];
        const best = catDeltas[catDeltas.length - 1];
        if (worst.delta < -3) {
          insights.push({
            type: 'warning',
            icon: AlertTriangle,
            color: '#f97316',
            text: `📉 La catégorie qui chute le plus entre 6ème et 3ème : ${CATEGORIES[worst.cat].name} (${worst.delta > 0 ? '+' : ''}${worst.delta} points). C'est là que le déclin est le plus marqué.`
          });
        }
        if (best.delta > 3) {
          insights.push({
            type: 'positive',
            icon: TrendingUp,
            color: '#22c55e',
            text: `📈 Meilleure progression entre 6ème et 3ème : ${CATEGORIES[best.cat].name} (+${best.delta} points). Les élèves progressent dans cette qualité physique.`
          });
        }
      }
    }

    // Données longitudinales si disponibles
    if (schoolYears.length > 1) {
      const sixiemeYears = cohortData.filter(c => c.level === '6ème').sort((a, b) => a.schoolYear.localeCompare(b.schoolYear));
      if (sixiemeYears.length >= 2) {
        const first = sixiemeYears[0];
        const last = sixiemeYears[sixiemeYears.length - 1];
        const diff = (last.globalScore ?? 0) - (first.globalScore ?? 0);
        if (Math.abs(diff) > 2) {
          insights.push({
            type: diff < 0 ? 'warning' : 'positive',
            icon: diff < 0 ? TrendingDown : TrendingUp,
            color: diff < 0 ? '#ef4444' : '#22c55e',
            text: `📊 Les entrants de 6ème ont un score moyen de ${diff > 0 ? '+' : ''}${diff} points en ${last.schoolYear} par rapport à ${first.schoolYear} (${last.globalScore} vs ${first.globalScore}/100). ${diff < 0 ? 'Le niveau des nouveaux entrants diminue.' : 'Le niveau des nouveaux entrants augmente.'}`
          });
        }
      }
    }

    if (schoolYears.length === 1) {
      insights.push({
        type: 'info',
        icon: Info,
        color: '#3b82f6',
        text: `ℹ️ Vue transversale 2025-2026 uniquement. Dès l'année prochaine, les comparaisons longitudinales seront disponibles pour confirmer ou infirmer les tendances observées.`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-700 font-medium text-lg mb-2">Analyse des cohortes en cours</p>
          <p className="text-gray-400 text-sm">{progress}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={loadAllData} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── En-tête ── */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <BarChart3 size={28} />
                Évolution de la Condition Physique — Analyse des Cohortes
              </h1>
              <p className="text-indigo-200 text-sm max-w-2xl">
                Cette page compare les niveaux de condition physique entre cohortes et dans le temps.
                Les scores sont calculés par rapport à la performance globale de tous les élèves
                (cohorte universelle), permettant des comparaisons valides entre niveaux et entre années.
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm transition-colors flex-shrink-0 ml-4"
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>

          <div className="flex gap-4 mt-5 flex-wrap">
            <div className="bg-white bg-opacity-15 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold">{cohortData.reduce((a, b) => a + b.studentCount, 0)}</div>
              <div className="text-xs text-indigo-200">élèves analysés</div>
            </div>
            <div className="bg-white bg-opacity-15 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold">{schoolYears.length}</div>
              <div className="text-xs text-indigo-200">année{schoolYears.length > 1 ? 's' : ''} scolaire{schoolYears.length > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white bg-opacity-15 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold">{availableLevels.length}</div>
              <div className="text-xs text-indigo-200">niveau{availableLevels.length > 1 ? 's' : ''} de collège</div>
            </div>
            <div className="bg-white bg-opacity-15 rounded-xl px-4 py-3">
              <div className="text-xs text-indigo-200 mb-1">Données disponibles</div>
              <div className="text-sm font-bold">{schoolYears.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* ── Insights automatiques ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedInsights(e => !e)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Award size={18} className="text-indigo-600" />
              <span className="font-bold text-gray-800">Ce que les données révèlent</span>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{insights.length} analyse{insights.length > 1 ? 's' : ''}</span>
            </div>
            {expandedInsights ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {expandedInsights && (
            <div className="px-6 pb-5 space-y-3">
              {insights.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <div key={i}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: ins.color + '10', border: `1px solid ${ins.color}30` }}>
                    <Icon size={18} style={{ color: ins.color }} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{ins.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Vue transversale : score global par niveau ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <SectionTitle
            icon={BarChart3}
            title={`Score global moyen par niveau — ${latestYear}`}
            subtitle="Comparaison des niveaux de forme entre 6ème et 3ème (même année scolaire). Score /100 calculé vs la cohorte universelle."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={crossSectionalData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="level" tick={{ fontSize: 13, fontWeight: 600 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke="#d1d5db" strokeDasharray="4 2" label={{ value: 'Médiane', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }} />
                <Bar dataKey="score" name="Score moyen /100" radius={[6, 6, 0, 0]}>
                  {crossSectionalData.map((entry) => (
                    <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Tableau récapitulatif */}
            <div className="space-y-3">
              {crossSectionalData.map((d, i) => {
                const prev = i > 0 ? crossSectionalData[i - 1] : null;
                const delta = prev ? d.score - prev.score : null;
                const scoreBand = SCORE_BANDS.find(b => d.score >= b.min && d.score <= b.max);
                return (
                  <div key={d.level} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: LEVEL_COLORS[d.level] }}></div>
                    <div className="font-bold w-14" style={{ color: LEVEL_COLORS[d.level] }}>{d.level}</div>
                    <div className="text-2xl font-bold text-gray-800 w-16">{d.score}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{ width: `${d.score}%`, backgroundColor: LEVEL_COLORS[d.level] }}></div>
                      </div>
                    </div>
                    {scoreBand && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: scoreBand.bg, color: scoreBand.color }}>
                        {scoreBand.label}
                      </span>
                    )}
                    {delta !== null && (
                      <span className={`text-sm font-bold w-14 text-right flex-shrink-0 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {delta >= 0 ? '▲ +' : '▼ '}{delta}
                      </span>
                    )}
                    <div className="text-xs text-gray-400 w-20 text-right flex-shrink-0">{d.students} élèves</div>
                  </div>
                );
              })}
              {crossSectionalData.length >= 2 && (() => {
                const first = crossSectionalData[0];
                const last = crossSectionalData[crossSectionalData.length - 1];
                const total = last.score - first.score;
                return (
                  <div className={`p-3 rounded-xl text-sm font-medium text-center ${total < 0 ? 'bg-red-50 text-red-700 border border-red-200' : total > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                    Écart total {first.level} → {last.level} : <strong>{total > 0 ? '+' : ''}{total} points</strong>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Scores par catégorie par niveau ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <SectionTitle
            icon={Activity}
            title="Scores par qualité physique et par niveau"
            subtitle="Identifier quelle qualité physique décline le plus selon le niveau. Score /100 calculé vs cohorte universelle."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryByLevelData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="cat" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {LEVEL_ORDER.filter(l => availableLevels.includes(l)).map(level => (
                  <Bar key={level} dataKey={level} fill={LEVEL_COLORS[level]} radius={[3, 3, 0, 0]} maxBarSize={30} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Heatmap catégorie x niveau */}
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Catégorie</th>
                      {LEVEL_ORDER.filter(l => availableLevels.includes(l)).map(l => (
                        <th key={l} className="px-3 py-2 text-center text-xs font-bold" style={{ color: LEVEL_COLORS[l] }}>{l}</th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold">Δ 6→3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(CATEGORIES).map(([catKey, catMeta]) => {
                      const levels = LEVEL_ORDER.filter(l => availableLevels.includes(l));
                      const scores = levels.map(l => {
                        const d = latestData.find(c => c.level === l);
                        return d?.categoryScores[catKey] ?? null;
                      });
                      const firstScore = scores.find(s => s !== null);
                      const lastScore = [...scores].reverse().find(s => s !== null);
                      const delta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

                      return (
                        <tr key={catKey} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catMeta.color }}></div>
                              <span className="font-medium text-gray-700">{catMeta.name}</span>
                            </div>
                          </td>
                          {scores.map((score, i) => {
                            const band = score !== null ? SCORE_BANDS.find(b => score >= b.min && score <= b.max) : null;
                            return (
                              <td key={i} className="px-3 py-2 text-center">
                                {score !== null ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{ backgroundColor: band?.bg || '#f3f4f6', color: band?.color || '#6b7280' }}>
                                    {score}
                                  </span>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            {delta !== null ? (
                              <span className={`text-sm font-bold ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {delta >= 0 ? '▲ +' : '▼ '}{delta}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Radar superposé par niveau ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <SectionTitle
            icon={Activity}
            title="Profil physique superposé par niveau"
            subtitle="Un polygone par niveau. Une zone qui rétrécit entre 6ème et 3ème indique une catégorie en déclin."
          />
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="cat" tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} tickCount={6} />
                {LEVEL_ORDER.filter(l => availableLevels.includes(l)).map((level, i, arr) => (
                  <Radar
                    key={level}
                    name={level}
                    dataKey={level}
                    stroke={LEVEL_COLORS[level]}
                    fill={LEVEL_COLORS[level]}
                    fillOpacity={0.08 + i * 0.04}
                    strokeWidth={2}
                    strokeDasharray={i < arr.length - 1 ? '5 3' : '0'}
                  />
                ))}
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Trait plein = niveau le plus avancé (3ème) · Pointillés = niveaux inférieurs
          </p>
        </div>

        {/* ── Longitudinal (si plusieurs années) ── */}
        {schoolYears.length > 1 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionTitle
              icon={TrendingUp}
              title="Évolution longitudinale — même niveau sur plusieurs années"
              subtitle="C'est ici que le déclin réel se confirme : si les 6ème 2026 sont moins bons que les 6ème 2025, le niveau baisse."
            />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={longitudinalData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={[30, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {LEVEL_ORDER.filter(l => availableLevels.includes(l)).map(level => (
                  <Line
                    key={level}
                    type="monotone"
                    dataKey={level}
                    stroke={LEVEL_COLORS[level]}
                    strokeWidth={3}
                    dot={{ r: 6, fill: LEVEL_COLORS[level], stroke: 'white', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                <Calendar size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-blue-800 text-lg mb-2">La comparaison longitudinale s'activera en 2026-2027</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Dès que tu ajouteras les données de la rentrée 2026, cette section affichera les courbes d'évolution par niveau.
                  Tu pourras alors voir si les 6ème de 2026 sont au même niveau que ceux de 2025 — c'est là que le déclin se confirmera (ou non) avec des chiffres.
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LEVEL_ORDER.map(level => (
                    <div key={level} className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                      <div className="text-xs text-gray-500 mb-1">{level}</div>
                      <div className="text-sm font-bold" style={{ color: LEVEL_COLORS[level] }}>
                        {latestData.find(c => c.level === level)?.globalScore ?? '—'}/100
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">référence 2025-26</div>
                    </div>
                  ))}
                </div>
                <p className="text-blue-500 text-xs mt-3">
                  💡 Ces scores serviront de référence pour mesurer l'évolution les années suivantes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Note méthodologique ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-700">Note méthodologique :</strong> Les scores /100 sont calculés en comparant chaque résultat à la distribution de l'ensemble des données disponibles (cohorte universelle).
          Cela garantit que les scores sont comparables entre les niveaux et entre les années, même si les tests changent.
          Les élèves absents ou dispensés sont exclus du calcul.
          <br /><br />
          <strong className="text-gray-700">Interprétation :</strong> Un score de 50/100 signifie "dans la moyenne de tous les élèves de l'établissement tous niveaux confondus".
          Si les 3ème ont un score inférieur aux 6ème, cela peut refléter soit un déclin avec l'âge, soit une différence de cohorte.
          La comparaison longitudinale (même niveau sur plusieurs années) est la plus fiable pour détecter un déclin réel.
        </div>

      </div>
    </div>
  );
};

export default TrendAnalysis;
