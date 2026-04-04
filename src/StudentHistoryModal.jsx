// StudentHistoryModal.jsx - Historique d'un élève sur toutes ses années de collège
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Calendar, Award, Activity, Target, GitBranch, Zap, Clock, Users, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { supabase } from './lib/supabase.js';

const LEVEL_ORDER = ['6ème', '5ème', '4ème', '3ème'];

const LEVEL_COLORS = {
  '6ème': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  '5ème': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  '4ème': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  '3ème': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
};

const CATEGORY_ICONS = {
  ENDURANCE: Activity,
  FORCE: Target,
  SOUPLESSE: GitBranch,
  VITESSE: Zap,
  COORDINATION: Clock,
  EQUILIBRE: Users,
};

const CATEGORY_COLORS = {
  ENDURANCE: 'text-blue-600',
  FORCE: 'text-red-600',
  SOUPLESSE: 'text-green-600',
  VITESSE: 'text-yellow-600',
  COORDINATION: 'text-indigo-600',
  EQUILIBRE: 'text-purple-600',
};

const StudentHistoryModal = ({ student, onClose }) => {
  const [history, setHistory] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState({});

  useEffect(() => {
    if (student?.permanent_id) {
      loadHistory();
    }
  }, [student]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // 1. Charger tous les enregistrements de cet élève (toutes années)
      const { data: allStudentRecords, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          school_year,
          class_id,
          classes (name, level)
        `)
        .eq('permanent_id', student.permanent_id)
        .order('school_year', { ascending: true });

      if (studentsError) throw studentsError;

      // 2. Charger tous les tests
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .order('category');

      if (testsError) throw testsError;
      setAllTests(testsData || []);

      // 3. Pour chaque enregistrement, charger les résultats
      const historyWithResults = await Promise.all(
        (allStudentRecords || []).map(async (record) => {
          const { data: resultsData } = await supabase
            .from('results')
            .select('*, tests(name, unit, category)')
            .eq('student_id', record.id);

          const resultsMap = {};
          (resultsData || []).forEach(r => {
            resultsMap[r.test_id] = r;
          });

          const completedTests = (resultsData || []).filter(r => !r.absent && !r.dispensed && r.value !== null);
          const absentTests = (resultsData || []).filter(r => r.absent);
          const dispensedTests = (resultsData || []).filter(r => r.dispensed);

          return {
            ...record,
            results: resultsMap,
            stats: {
              completed: completedTests.length,
              absent: absentTests.length,
              dispensed: dispensedTests.length,
              total: testsData?.length || 0,
            }
          };
        })
      );

      setHistory(historyWithResults);

      // Ouvrir l'année la plus récente par défaut
      if (historyWithResults.length > 0) {
        const lastYear = historyWithResults[historyWithResults.length - 1];
        setExpandedYears({ [lastYear.school_year]: true });
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (schoolYear) => {
    setExpandedYears(prev => ({ ...prev, [schoolYear]: !prev[schoolYear] }));
  };

  // Trouver la progression d'un test entre deux années
  const getProgression = (testId, currentYearRecord, previousYearRecord) => {
    if (!previousYearRecord) return null;
    const current = currentYearRecord.results[testId];
    const previous = previousYearRecord.results[testId];
    if (!current || !previous || !current.value || !previous.value) return null;
    const diff = parseFloat(current.value) - parseFloat(previous.value);
    return diff;
  };

  const testsByCategory = allTests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">
                {student.first_name?.[0]}{student.last_name?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {student.first_name} {student.last_name}
              </h2>
              <div className="flex items-center space-x-2 text-indigo-200 text-sm">
                <TrendingUp size={14} />
                <span>Suivi sur {history.length} année{history.length > 1 ? 's' : ''} de collège</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Résumé global */}
        {history.length > 0 && !loading && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 size={16} className="text-indigo-600" />
              <span className="font-semibold text-indigo-800 text-sm">Parcours au collège</span>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-1">
              {history.map((record, idx) => {
                const level = record.classes?.level || '?';
                const colors = LEVEL_COLORS[level] || LEVEL_COLORS['6ème'];
                const pct = record.stats.total > 0
                  ? Math.round((record.stats.completed / record.stats.total) * 100)
                  : 0;
                return (
                  <div key={record.school_year}
                    className={`flex-shrink-0 ${colors.bg} border ${colors.border} rounded-xl p-3 text-center min-w-[120px]`}>
                    <div className={`text-xs font-bold ${colors.text} mb-1`}>{level}</div>
                    <div className="text-xs text-gray-500 mb-2">{record.school_year}</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>{pct}%</div>
                    <div className="text-xs text-gray-500">{record.stats.completed}/{record.stats.total} tests</div>
                    {idx > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-indigo-500">▲ +1 an</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {history.length < 4 && (
                <div className="flex-shrink-0 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-3 text-center min-w-[120px] flex flex-col items-center justify-center">
                  <div className="text-gray-400 text-xs">Années futures</div>
                  <div className="text-gray-300 text-2xl mt-1">…</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500">Chargement de l'historique...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Aucun historique trouvé pour cet élève</p>
            </div>
          ) : (
            history.map((record, recordIdx) => {
              const level = record.classes?.level || '?';
              const className = record.classes?.name || '?';
              const colors = LEVEL_COLORS[level] || LEVEL_COLORS['6ème'];
              const isExpanded = expandedYears[record.school_year];
              const previousRecord = recordIdx > 0 ? history[recordIdx - 1] : null;

              return (
                <div key={record.school_year} className={`border-2 ${colors.border} rounded-xl overflow-hidden`}>
                  {/* En-tête année */}
                  <button
                    onClick={() => toggleYear(record.school_year)}
                    className={`w-full ${colors.bg} p-4 flex items-center justify-between hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                      <div className="text-left">
                        <div className={`font-bold text-lg ${colors.text}`}>
                          {level} — Classe {level.charAt(0)}{className}
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500 text-xs">
                          <Calendar size={12} />
                          <span>{record.school_year}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-4 text-sm">
                        <span className="text-green-700 font-semibold">✓ {record.stats.completed} réalisés</span>
                        {record.stats.absent > 0 && <span className="text-red-600">✗ {record.stats.absent} absents</span>}
                        {record.stats.dispensed > 0 && <span className="text-orange-600">△ {record.stats.dispensed} dispensés</span>}
                      </div>
                      {isExpanded ? <ChevronUp size={20} className={colors.text} /> : <ChevronDown size={20} className={colors.text} />}
                    </div>
                  </button>

                  {/* Détail des résultats */}
                  {isExpanded && (
                    <div className="p-4 bg-white space-y-4">
                      {Object.entries(testsByCategory).map(([category, categoryTests]) => {
                        const Icon = CATEGORY_ICONS[category] || Activity;
                        const iconColor = CATEGORY_COLORS[category] || 'text-gray-600';
                        const hasAnyResult = categoryTests.some(test => record.results[test.id]);

                        if (!hasAnyResult) return null;

                        return (
                          <div key={category}>
                            <div className={`flex items-center space-x-2 mb-2 ${iconColor}`}>
                              <Icon size={16} />
                              <span className="font-semibold text-sm uppercase tracking-wide">{category}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {categoryTests.map(test => {
                                const result = record.results[test.id];
                                if (!result) return null;

                                const progression = getProgression(test.id, record, previousRecord);
                                const isAbsent = result.absent;
                                const isDispensed = result.dispensed;
                                const hasValue = !isAbsent && !isDispensed && result.value !== null;

                                return (
                                  <div key={test.id}
                                    className={`rounded-lg p-3 border text-sm ${
                                      isAbsent ? 'bg-red-50 border-red-200' :
                                      isDispensed ? 'bg-orange-50 border-orange-200' :
                                      'bg-green-50 border-green-200'
                                    }`}>
                                    <div className="font-medium text-gray-700 text-xs mb-1 truncate">{test.name}</div>
                                    {isAbsent && <div className="text-red-600 font-semibold">Absent</div>}
                                    {isDispensed && <div className="text-orange-600 font-semibold">Dispensé</div>}
                                    {hasValue && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-green-700 font-bold">
                                          {result.value} <span className="text-xs font-normal text-gray-500">{test.unit}</span>
                                        </span>
                                        {progression !== null && (
                                          <span className={`text-xs font-semibold ${progression >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {progression >= 0 ? '↑' : '↓'} {Math.abs(progression).toFixed(1)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Les élèves sont reconnus automatiquement par leur prénom, nom et date de naissance
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentHistoryModal;
