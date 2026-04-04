// StudentEvolutionPanel.jsx
// Panneau d'évolution pluriannuelle d'un élève sur 4 ans de collège
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  X, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Activity, Target, GitBranch, Zap, Clock, Users, Minimize2,
  BarChart3, Info, CheckCircle
} from 'lucide-react';
import { supabase } from './lib/supabase.js';

// ─── Constantes ────────────────────────────────────────────────────────────────

const YEAR_COLORS = {
  '6ème': '#3b82f6',
  '5ème': '#22c55e',
  '4ème': '#f97316',
  '3ème': '#a855f7',
};

const YEAR_LABELS = { '6ème': '6ème', '5ème': '5ème', '4ème': '4ème', '3ème': '3ème' };
const LEVEL_ORDER = ['6ème', '5ème', '4ème', '3ème'];

const CATEGORY_META = {
  ENDURANCE:    { name: 'Endurance',    color: '#3b82f6', icon: Activity   },
  FORCE:        { name: 'Force',        color: '#ef4444', icon: Target     },
  VITESSE:      { name: 'Vitesse',      color: '#eab308', icon: Zap        },
  COORDINATION: { name: 'Coordination', color: '#a855f7', icon: GitBranch  },
  EQUILIBRE:    { name: 'Équilibre',    color: '#6366f1', icon: Users      },
  SOUPLESSE:    { name: 'Souplesse',    color: '#22c55e', icon: Minimize2  },
};

// ─── Logique de scoring (identique à IndividualFitnessCard) ───────────────────

const getTestDirection = (testName) => {
  const timeBased = ['SPRINTS 10 x 5', '30 mètres', 'FLAMINGO'];
  if (timeBased.some(t => testName.includes(t))) return false;
  return true;
};

const calcPercentiles = (vals) => {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  return {
    p10: s[Math.floor(n * 0.10)],
    p25: s[Math.floor(n * 0.25)],
    p50: s[Math.floor(n * 0.50)],
    p75: s[Math.floor(n * 0.75)],
    p90: s[Math.floor(n * 0.90)],
  };
};

const calcScore = (value, percentiles, higherIsBetter, min, max) => {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (higherIsBetter) {
    if (v >= percentiles.p90) {
      const range = max - percentiles.p90; if (range === 0) return 100;
      return Math.round(85 + ((v - percentiles.p90) / range) * 15);
    } else if (v >= percentiles.p75) {
      const range = percentiles.p90 - percentiles.p75; if (range === 0) return 77;
      return Math.round(70 + ((v - percentiles.p75) / range) * 14);
    } else if (v >= percentiles.p50) {
      const range = percentiles.p75 - percentiles.p50; if (range === 0) return 62;
      return Math.round(55 + ((v - percentiles.p50) / range) * 14);
    } else if (v >= percentiles.p25) {
      const range = percentiles.p50 - percentiles.p25; if (range === 0) return 47;
      return Math.round(40 + ((v - percentiles.p25) / range) * 14);
    } else {
      const range = percentiles.p25 - min; if (range === 0) return 25;
      return Math.round(10 + (Math.max(0, (v - min) / range)) * 29);
    }
  } else {
    if (v <= percentiles.p10) {
      const range = percentiles.p10 - min; if (range === 0) return 100;
      return Math.round(85 + ((percentiles.p10 - v) / range) * 15);
    } else if (v <= percentiles.p25) {
      const range = percentiles.p25 - percentiles.p10; if (range === 0) return 77;
      return Math.round(70 + ((percentiles.p25 - v) / range) * 14);
    } else if (v <= percentiles.p50) {
      const range = percentiles.p50 - percentiles.p25; if (range === 0) return 62;
      return Math.round(55 + ((percentiles.p50 - v) / range) * 14);
    } else if (v <= percentiles.p75) {
      const range = percentiles.p75 - percentiles.p50; if (range === 0) return 47;
      return Math.round(40 + ((percentiles.p75 - v) / range) * 14);
    } else {
      const range = max - percentiles.p75; if (range === 0) return 25;
      return Math.round(10 + (Math.max(0, (max - v) / range)) * 29);
    }
  }
};

// Récupère les données de percentile d'un test pour une cohorte donnée
const fetchTestCohortData = async (testName, level, gender, schoolYear) => {
  const { data, error } = await supabase
    .from('results')
    .select('value, tests!inner(name), students!inner(gender, school_year, classes!inner(level))')
    .eq('tests.name', testName)
    .eq('students.gender', gender)
    .eq('students.classes.level', level)
    .eq('students.school_year', schoolYear)
    .not('value', 'is', null);

  if (error || !data || data.length < 5) return null;

  const values = data
    .map(r => r.value)
    .filter(v => v !== 'DISP' && v !== 'dispensé')
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  if (values.length < 5) return null;

  const percentiles = calcPercentiles(values);
  const higherIsBetter = getTestDirection(testName);
  return { percentiles, higherIsBetter, min: Math.min(...values), max: Math.max(...values), n: values.length };
};

// ─── Composants UI ─────────────────────────────────────────────────────────────

const ScoreBadge = ({ score }) => {
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#eab308' : '#ef4444';
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Bon' : score >= 55 ? 'Correct' : 'À améliorer';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: color + '20', color }}>
      {label}
    </span>
  );
};

const ReliabilityBadge = ({ rate }) => {
  if (rate >= 0.8) return <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11} />Fiable ({Math.round(rate * 100)}%)</span>;
  if (rate >= 0.5) return <span className="text-xs text-yellow-600 font-medium flex items-center gap-1"><AlertTriangle size={11} />Partiel ({Math.round(rate * 100)}%)</span>;
  return <span className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={11} />Limité ({Math.round(rate * 100)}%)</span>;
};

const DeltaArrow = ({ delta }) => {
  if (delta === null || delta === undefined) return <span className="text-gray-400 text-xs">—</span>;
  if (delta > 2) return <span className="text-green-600 font-bold text-sm flex items-center gap-0.5"><TrendingUp size={14} />+{delta.toFixed(0)}</span>;
  if (delta < -2) return <span className="text-red-500 font-bold text-sm flex items-center gap-0.5"><TrendingDown size={14} />{delta.toFixed(0)}</span>;
  return <span className="text-gray-500 text-sm flex items-center gap-0.5"><Minus size={12} />{delta > 0 ? '+' : ''}{delta.toFixed(0)}</span>;
};

// Tooltip personnalisé pour les graphiques
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></div>
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}/100</span>
        </div>
      ))}
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────

const StudentEvolutionPanel = ({ student, onClose }) => {
  const [yearData, setYearData] = useState([]); // tableau trié par niveau
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState('global'); // global | categories | radar | tests

  useEffect(() => {
    if (student?.permanent_id) loadEvolutionData();
  }, [student]);

  const loadEvolutionData = async () => {
    setLoading(true);
    try {
      // 1. Charger tous les enregistrements de l'élève (toutes années)
      setProgress('Chargement des années...');
      const { data: records, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, gender, school_year, class_id, classes(name, level)')
        .eq('permanent_id', student.permanent_id)
        .order('school_year', { ascending: true });

      if (error) throw error;
      if (!records?.length) { setYearData([]); return; }

      // 2. Pour chaque année, calculer les scores
      const computed = [];
      for (const record of records) {
        const level = record.classes?.level;
        const gender = record.gender;
        const schoolYear = record.school_year;
        setProgress(`Calcul des scores ${level} (${schoolYear})...`);

        // Charger les résultats de l'élève
        const { data: results } = await supabase
          .from('results')
          .select('value, test_id, absent, dispensed, tests(id, name, category, unit)')
          .eq('student_id', record.id);

        // Charger tous les tests existants pour cette année
        const { data: allTests } = await supabase
          .from('tests')
          .select('id, name, category, unit');

        const totalTests = allTests?.length || 0;
        const completedResults = (results || []).filter(r => !r.absent && !r.dispensed && r.value !== null);
        const reliability = totalTests > 0 ? completedResults.length / totalTests : 0;

        // Calculer les scores par catégorie
        const categoryScores = {};
        const testScores = {}; // testName -> score

        for (const category of Object.keys(CATEGORY_META)) {
          const categoryTests = (results || []).filter(r =>
            r.tests?.category === category && !r.absent && !r.dispensed && r.value !== null
          );

          let totalScore = 0;
          let validCount = 0;

          for (const res of categoryTests) {
            const cohort = await fetchTestCohortData(res.tests.name, level, gender, schoolYear);
            if (!cohort) continue;
            const score = calcScore(res.value, cohort.percentiles, cohort.higherIsBetter, cohort.min, cohort.max);
            if (score !== null) {
              totalScore += score;
              validCount++;
              testScores[res.tests.name] = {
                score,
                value: res.value,
                unit: res.tests.unit,
                category,
              };
            }
          }

          categoryScores[category] = validCount > 0 ? Math.round(totalScore / validCount) : null;
        }

        // Score global = moyenne des catégories ayant au moins un test
        const validCatScores = Object.values(categoryScores).filter(s => s !== null);
        const globalScore = validCatScores.length > 0
          ? Math.round(validCatScores.reduce((a, b) => a + b, 0) / validCatScores.length)
          : null;

        computed.push({
          schoolYear,
          level,
          className: record.classes?.name,
          gender,
          globalScore,
          categoryScores,
          testScores,
          reliability,
          testsCompleted: completedResults.length,
          totalTests,
        });
      }

      // Trier par ordre de niveau collège
      computed.sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
      setYearData(computed);

    } catch (err) {
      console.error('Erreur évolution:', err);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ── Données pour les graphiques ──

  // Courbe score global
  const globalChartData = yearData.map(y => ({
    name: y.level,
    score: y.globalScore,
    fiabilite: Math.round(y.reliability * 100),
  }));

  // Barres par catégorie
  const categoryChartData = Object.keys(CATEGORY_META).map(cat => {
    const entry = { cat: CATEGORY_META[cat].name };
    yearData.forEach(y => {
      entry[y.level] = y.categoryScores[cat];
    });
    return entry;
  });

  // Radar multi-années
  const radarData = Object.keys(CATEGORY_META).map(cat => {
    const entry = { cat: CATEGORY_META[cat].name.slice(0, 6) };
    yearData.forEach(y => {
      entry[y.level] = y.categoryScores[cat] || 0;
    });
    return entry;
  });

  // Tests communs entre toutes les années disponibles
  const allTestNames = yearData.length > 0
    ? Object.keys(yearData[0].testScores).filter(name =>
        yearData.every(y => y.testScores[name] !== undefined)
      )
    : [];

  // Tests présents dans au moins 2 années
  const sharedTestNames = yearData.length > 0
    ? [...new Set(yearData.flatMap(y => Object.keys(y.testScores)))]
        .filter(name => yearData.filter(y => y.testScores[name]).length >= 2)
    : [];

  // Regrouper les tests partagés par catégorie
  const sharedByCategory = {};
  sharedTestNames.forEach(name => {
    const cat = yearData.find(y => y.testScores[name])?.testScores[name]?.category;
    if (cat) {
      if (!sharedByCategory[cat]) sharedByCategory[cat] = [];
      sharedByCategory[cat].push(name);
    }
  });

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl font-bold">
              {student.first_name?.[0]}{student.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.first_name} {student.last_name}</h2>
              <p className="text-indigo-200 text-sm flex items-center gap-1">
                <TrendingUp size={14} />
                Évolution sur {yearData.length} année{yearData.length > 1 ? 's' : ''} · Scores /100 normalisés par cohorte
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* ── Résumé rapide ── */}
        {!loading && yearData.length > 0 && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center gap-4 overflow-x-auto flex-shrink-0">
            {yearData.map((y, i) => (
              <div key={y.schoolYear} className="flex-shrink-0 flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-indigo-100">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: YEAR_COLORS[y.level] }}></div>
                <div>
                  <div className="font-bold text-sm" style={{ color: YEAR_COLORS[y.level] }}>{y.level}</div>
                  <div className="text-xs text-gray-500">{y.schoolYear}</div>
                </div>
                <div className="text-2xl font-bold text-gray-800 ml-1">
                  {y.globalScore ?? '—'}<span className="text-sm font-normal text-gray-500">/100</span>
                </div>
                {i > 0 && yearData[i - 1].globalScore !== null && y.globalScore !== null && (
                  <DeltaArrow delta={y.globalScore - yearData[i - 1].globalScore} />
                )}
                <ReliabilityBadge rate={y.reliability} />
              </div>
            ))}
            {yearData.length < 4 && (
              <div className="flex-shrink-0 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2 text-gray-400 text-xs text-center min-w-[80px]">
                Années<br/>futures
              </div>
            )}
          </div>
        )}

        {/* ── Onglets ── */}
        <div className="border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex space-x-1">
            {[
              { id: 'global',     label: '📈 Score global',       },
              { id: 'categories', label: '📊 Par catégorie',       },
              { id: 'radar',      label: '🕸️ Radar comparatif',   },
              { id: 'tests',      label: '🔬 Tests communs',       },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">{progress || 'Calcul en cours...'}</p>
              <p className="text-gray-400 text-sm text-center max-w-sm">
                Les scores sont calculés dynamiquement en comparant l'élève à sa cohorte de l'époque. Cela peut prendre quelques secondes.
              </p>
            </div>
          ) : yearData.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucune donnée trouvée pour cet élève.</p>
            </div>
          ) : (

            // ── TAB : Score global ──
            activeTab === 'global' ? (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-600" />
                    Évolution du score global /100
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Score calculé par rapport à la cohorte de chaque année — comparable même si les tests changent.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={globalChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Score global"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 8, fill: '#6366f1', stroke: 'white', strokeWidth: 3 }}
                        activeDot={{ r: 10 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tableau récapitulatif */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-700">Récapitulatif par année</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="px-6 py-3 text-left">Niveau</th>
                        <th className="px-6 py-3 text-left">Année</th>
                        <th className="px-6 py-3 text-center">Score global</th>
                        <th className="px-6 py-3 text-center">Évolution</th>
                        <th className="px-6 py-3 text-center">Tests réalisés</th>
                        <th className="px-6 py-3 text-center">Fiabilité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {yearData.map((y, i) => {
                        const prev = i > 0 ? yearData[i - 1] : null;
                        const delta = prev && prev.globalScore !== null && y.globalScore !== null
                          ? y.globalScore - prev.globalScore : null;
                        return (
                          <tr key={y.schoolYear} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 font-bold" style={{ color: YEAR_COLORS[y.level] }}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: YEAR_COLORS[y.level] }}></div>
                                {y.level}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{y.schoolYear}</td>
                            <td className="px-6 py-4 text-center">
                              {y.globalScore !== null ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-2xl font-bold" style={{ color: YEAR_COLORS[y.level] }}>{y.globalScore}</span>
                                  <ScoreBadge score={y.globalScore} />
                                </div>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <DeltaArrow delta={delta} />
                            </td>
                            <td className="px-6 py-4 text-center text-gray-600">
                              {y.testsCompleted}/{y.totalTests}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <ReliabilityBadge rate={y.reliability} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {yearData.some(y => y.reliability < 0.5) && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Fiabilité limitée pour certaines années :</strong> quand moins de 50% des tests sont réalisés, le score global peut ne pas refléter fidèlement le niveau réel de l'élève. Complétez les tests manquants pour une comparaison plus juste.
                    </div>
                  </div>
                )}
              </div>
            )

            // ── TAB : Par catégorie ──
            : activeTab === 'categories' ? (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-1">Scores par catégorie — toutes années</h3>
                  <p className="text-sm text-gray-500 mb-4">Identifiez les points forts (↑) et les axes de progrès (↓) sur chaque qualité physique.</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="cat" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {yearData.map(y => (
                        <Bar key={y.level} dataKey={y.level} fill={YEAR_COLORS[y.level]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Cartes catégorie avec évolution */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
                    const Icon = catMeta.icon;
                    const scores = yearData.map(y => ({
                      level: y.level,
                      score: y.categoryScores[catKey],
                      year: y.schoolYear,
                    })).filter(s => s.score !== null);

                    const last = scores[scores.length - 1];
                    const prev = scores.length > 1 ? scores[scores.length - 2] : null;
                    const delta = last && prev ? last.score - prev.score : null;

                    const trend = delta === null ? 'neutre'
                      : delta > 5 ? 'hausse'
                      : delta < -5 ? 'baisse'
                      : 'stable';

                    const trendStyle = {
                      hausse: 'bg-green-50 border-green-300 text-green-700',
                      baisse: 'bg-red-50 border-red-300 text-red-700',
                      stable: 'bg-gray-50 border-gray-200 text-gray-600',
                      neutre: 'bg-gray-50 border-gray-200 text-gray-500',
                    }[trend];

                    return (
                      <div key={catKey} className={`rounded-xl border-2 p-4 ${trendStyle}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: catMeta.color + '25' }}>
                              <Icon size={16} style={{ color: catMeta.color }} />
                            </div>
                            <span className="font-bold text-sm">{catMeta.name}</span>
                          </div>
                          {trend === 'hausse' && <TrendingUp size={18} className="text-green-600" />}
                          {trend === 'baisse' && <TrendingDown size={18} className="text-red-500" />}
                          {trend === 'stable' && <Minus size={18} className="text-gray-400" />}
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            {scores.map(s => (
                              <div key={s.level} className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: YEAR_COLORS[s.level] }}></div>
                                <span className="w-10">{s.level}</span>
                                <span className="font-bold">{s.score}/100</span>
                              </div>
                            ))}
                            {scores.length === 0 && <span className="text-xs opacity-60">Aucune donnée</span>}
                          </div>
                          {delta !== null && (
                            <div className="text-right">
                              <DeltaArrow delta={delta} />
                              <div className="text-xs opacity-70 mt-0.5">vs {prev?.level}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )

            // ── TAB : Radar ──
            : activeTab === 'radar' ? (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-1">Profil physique — comparaison pluriannuelle</h3>
                  <p className="text-sm text-gray-500 mb-6">Chaque polygone représente une année. Les zones qui s'agrandissent indiquent une progression.</p>
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="cat" tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} tickCount={6} />
                        {yearData.map((y, i) => (
                          <Radar
                            key={y.level}
                            name={y.level}
                            dataKey={y.level}
                            stroke={YEAR_COLORS[y.level]}
                            fill={YEAR_COLORS[y.level]}
                            fillOpacity={0.12 + (i * 0.05)}
                            strokeWidth={2}
                            strokeDasharray={i === yearData.length - 1 ? '0' : '5 3'}
                          />
                        ))}
                        <Legend />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <Info size={18} className="flex-shrink-0 mt-0.5" />
                  <div>
                    Le <strong>trait plein</strong> représente l'année la plus récente. Les <strong>traits pointillés</strong> représentent les années précédentes. Un polygone qui s'agrandit vers l'extérieur indique une progression dans cette catégorie.
                  </div>
                </div>
              </div>
            )

            // ── TAB : Tests communs ──
            : activeTab === 'tests' ? (
              <div className="space-y-6">
                {sharedTestNames.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Info size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun test en commun entre les années pour l'instant.</p>
                    <p className="text-sm mt-1">Cette section se remplira au fil des années scolaires.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                      <Info size={18} className="flex-shrink-0 mt-0.5" />
                      <div>
                        Seuls les tests présents dans <strong>au moins 2 années</strong> sont affichés. Les valeurs brutes permettent de voir la progression réelle, le score /100 montre la performance relative à la cohorte de l'époque.
                      </div>
                    </div>

                    {Object.entries(sharedByCategory).map(([catKey, testNames]) => {
                      const catMeta = CATEGORY_META[catKey];
                      if (!catMeta) return null;
                      const Icon = catMeta.icon;
                      return (
                        <div key={catKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100"
                            style={{ backgroundColor: catMeta.color + '10' }}>
                            <Icon size={16} style={{ color: catMeta.color }} />
                            <span className="font-bold" style={{ color: catMeta.color }}>{catMeta.name}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                  <th className="px-6 py-3 text-left">Test</th>
                                  {yearData.map(y => (
                                    <th key={y.level} className="px-4 py-3 text-center" style={{ color: YEAR_COLORS[y.level] }}>
                                      {y.level}<br /><span className="font-normal normal-case text-gray-400">{y.schoolYear}</span>
                                    </th>
                                  ))}
                                  <th className="px-4 py-3 text-center">Évolution</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {testNames.map(testName => {
                                  const unit = yearData.find(y => y.testScores[testName])?.testScores[testName]?.unit || '';
                                  const values = yearData.map(y => y.testScores[testName] || null);
                                  const firstVal = values.find(v => v !== null);
                                  const lastVal = [...values].reverse().find(v => v !== null);
                                  const delta = firstVal && lastVal && firstVal !== lastVal
                                    ? lastVal.score - firstVal.score : null;
                                  return (
                                    <tr key={testName} className="hover:bg-gray-50">
                                      <td className="px-6 py-3 font-medium text-gray-800">{testName}</td>
                                      {values.map((v, i) => (
                                        <td key={i} className="px-4 py-3 text-center">
                                          {v ? (
                                            <div>
                                              <div className="font-bold text-gray-800">{v.value} <span className="text-gray-400 font-normal text-xs">{unit}</span></div>
                                              <div className="text-xs mt-0.5" style={{ color: YEAR_COLORS[yearData[i].level] }}>
                                                {v.score}/100
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-gray-300">—</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="px-4 py-3 text-center">
                                        <DeltaArrow delta={delta} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : null
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex-shrink-0 flex items-center justify-between text-xs text-gray-400">
          <span>Scores calculés par percentiles vs cohorte de même niveau, genre et année</span>
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentEvolutionPanel;
