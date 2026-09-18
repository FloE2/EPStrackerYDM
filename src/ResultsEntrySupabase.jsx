// src/components/ResultsEntrySupabase.jsx - VERSION SAISIE PAR TEST EN VIGNETTES (composants stabilisés)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Activity,
  ArrowLeft,
  Search,
  Loader,
  RefreshCw,
  BarChart3,
  CheckCircle,
  XCircle,
  Ban,
  UserX,
  Target,
  Calendar,
  Trash2,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { useSchoolYear } from './contexts/SchoolYearContext';

// ============================================================================
// Tout ce qui suit, JUSQU'AU COMPOSANT PRINCIPAL, est déclaré HORS du
// composant principal (au niveau du module). C'est indispensable : si ces
// composants étaient définis À L'INTÉRIEUR de ResultsEntrySupabase, ils
// seraient recréés à chaque rendu (donc à chaque frappe au clavier), et React
// démonterait/remonterait tout le sous-arbre à chaque caractère tapé - ce qui
// provoque exactement le bug observé (perte de focus, saut de scroll en haut
// de page). En les sortant ici, leur identité reste stable entre les rendus.
// ============================================================================

// Tri alphabétique robuste (accents, casse) par nom de famille puis prénom
const sortStudents = (list) =>
  [...list].sort((a, b) =>
    (a.last_name || '').localeCompare(b.last_name || '', 'fr', { sensitivity: 'base' }) ||
    (a.first_name || '').localeCompare(b.first_name || '', 'fr', { sensitivity: 'base' })
  );

// Système de couleurs par niveau (fonction pure, pas besoin d'être dans le composant)
const getLevelColors = (level) => {
  const levelColorMap = {
    '6ème': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', accent: 'bg-blue-600', hover: 'hover:bg-blue-100' },
    '5ème': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', accent: 'bg-emerald-600', hover: 'hover:bg-emerald-100' },
    '4ème': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', accent: 'bg-orange-600', hover: 'hover:bg-orange-100' },
    '3ème': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', accent: 'bg-purple-600', hover: 'hover:bg-purple-100' }
  };
  return levelColorMap[level] || levelColorMap['6ème'];
};

const getCategoryColors = (category) => {
  const categoryColorMap = {
    'ENDURANCE': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', activeBg: 'bg-blue-600' },
    'FORCE': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', activeBg: 'bg-red-600' },
    'SOUPLESSE': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', activeBg: 'bg-green-600' },
    'EQUILIBRE': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', activeBg: 'bg-purple-600' },
    'VITESSE': { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', activeBg: 'bg-yellow-600' },
    'COORDINATION': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', activeBg: 'bg-indigo-600' }
  };
  return categoryColorMap[category] || categoryColorMap['ENDURANCE'];
};

// ===================== VUE : SÉLECTION DE CLASSE =====================
function ClassSelectionView({ classes, studentsCount, selectedSchoolYear, currentSchoolYear, onSelectClass }) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Interface Enseignant - Saisie des Résultats</h1>
          <p className="text-gray-600">Sélectionnez une classe pour saisir et modifier les résultats des élèves</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex items-center justify-center space-x-3">
            <Calendar className="text-blue-600" size={20} />
            <span className="text-gray-700">Saisie des résultats pour</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedSchoolYear}
            </span>
            {selectedSchoolYear === currentSchoolYear && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Année en cours
              </span>
            )}
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune classe trouvée</h3>
            <p className="text-gray-500">Aucune classe n'existe pour l'année {selectedSchoolYear}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Object.entries(classesByLevel).map(([level, levelClasses]) => (
              levelClasses.length > 0 && (
                <div key={level} className="space-y-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                      <h2 className={`text-xl font-bold ${getLevelColors(level).text}`}>{level}</h2>
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
                          onClick={() => onSelectClass(classe)}
                          className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                        >
                          <div className={`text-2xl font-bold mb-4 ${colors.text}`}>
                            {classe.level.charAt(0)}{classe.name}
                          </div>
                          <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80 mb-3`}>
                            <Users size={16} />
                            <span>{studentCount} élève{studentCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className={`text-sm ${colors.text} opacity-75`}>
                            Cliquer pour saisir les résultats
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
}

// ===================== SÉLECTEUR DE TEST (en haut) - version compacte =====================
function TestSelector({ tests, selectedTest, getTestCompletion, onSelectTest }) {
  const byCategory = {};
  tests.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });

  const selectedCompletion = selectedTest ? getTestCompletion(selectedTest.id) : null;
  const catColors = selectedTest ? getCategoryColors(selectedTest.category) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 mb-6 flex items-center gap-3 flex-wrap">
      <Target size={16} className="text-gray-400 shrink-0" />

      <select
        value={selectedTest?.id ?? ''}
        onChange={(e) => {
          const test = tests.find(t => String(t.id) === e.target.value);
          if (test) onSelectTest(test);
        }}
        className="flex-1 min-w-[260px] border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
      >
        <option value="" disabled>Choisir un test à saisir…</option>
        {Object.entries(byCategory).map(([category, catTests]) => (
          <optgroup key={category} label={category}>
            {catTests.map(test => {
              const { completed, total } = getTestCompletion(test.id);
              return (
                <option key={test.id} value={test.id}>
                  {test.name} — {completed}/{total}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      {selectedTest && selectedCompletion && (
        <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
          {selectedTest.category}
        </span>
      )}
    </div>
  );
}

// ===================== VIGNETTE ÉLÈVE (saisie) =====================
function StudentEntryCard({
  student,
  index,
  selectedTest,
  result,
  draft,
  isSavingThis,
  isInvalid,
  registerInputRef,
  onDraftChange,
  onKeyDown,
  onBlur,
  onSetStatus,
  onClearResult
}) {
  let borderClass = 'border-gray-200';
  if (result.status === 'result') borderClass = 'border-green-300 bg-green-50';
  else if (result.status === 'absent') borderClass = 'border-red-300 bg-red-50';
  else if (result.status === 'dispensed') borderClass = 'border-orange-300 bg-orange-50';
  if (isInvalid) borderClass = 'border-red-500 ring-2 ring-red-300';

  return (
    <div className={`rounded-lg border-2 p-4 transition-all ${borderClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </div>
        {isSavingThis && <Loader className="animate-spin text-gray-400" size={14} />}
        {!isSavingThis && result.status === 'result' && <CheckCircle className="text-green-500" size={18} />}
        {!isSavingThis && result.status === 'absent' && <UserX className="text-red-500" size={18} />}
        {!isSavingThis && result.status === 'dispensed' && <Ban className="text-orange-500" size={18} />}
      </div>

      <div className="text-center mb-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold flex items-center justify-center mb-1">
          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
        </div>
        <div className="font-bold text-gray-800 text-sm leading-tight">{student.last_name}</div>
        <div className="text-gray-600 text-sm leading-tight">{student.first_name}</div>
      </div>

      {result.status === 'absent' || result.status === 'dispensed' ? (
        <div className="space-y-2">
          <div className={`text-center py-1.5 rounded-full text-sm font-medium ${
            result.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {result.status === 'absent' ? 'Absent' : 'Dispensé'}
          </div>
          <button
            onClick={() => onClearResult(student.id)}
            className="w-full py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Modifier
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <input
              ref={(el) => registerInputRef(student.id, el)}
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => onDraftChange(student.id, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, student.id)}
              onBlur={() => onBlur(student.id)}
              placeholder={selectedTest.unit}
              className="no-spinner w-full p-2 text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
              {selectedTest.unit}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSetStatus(student.id, 'absent')}
              className="flex-1 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors"
            >
              Absent
            </button>
            <button
              onClick={() => onSetStatus(student.id, 'dispensed')}
              className="flex-1 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
            >
              Dispensé
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ===================== VUE : SAISIE PAR TEST =====================
function EntryView({
  tests,
  selectedTest,
  onSelectTest,
  getTestCompletion,
  getResultStatus,
  searchTerm,
  setSearchTerm,
  orderedFilteredStudents,
  draftValues,
  savingStudentId,
  invalidStudentId,
  registerInputRef,
  onDraftChange,
  onKeyDown,
  onBlur,
  onSetStatus,
  onClearResult
}) {
  const { completed, total } = selectedTest ? getTestCompletion(selectedTest.id) : { completed: 0, total: 0 };

  return (
    <div>
      <TestSelector
        tests={tests}
        selectedTest={selectedTest}
        getTestCompletion={getTestCompletion}
        onSelectTest={onSelectTest}
      />

      {!selectedTest ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Target className="mx-auto text-gray-300 mb-4" size={56} />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Sélectionnez un test ci-dessus</h3>
          <p className="text-gray-500">Les vignettes de tous les élèves apparaîtront ensuite pour saisir directement leurs résultats.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Filtrer un élève..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <span className="text-sm text-gray-500">
                {orderedFilteredStudents.length} élève{orderedFilteredStudents.length !== 1 ? 's' : ''} · triés par nom de famille
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-600">
                {selectedTest.name} <span className="text-gray-400">({selectedTest.unit})</span>
              </div>
              <div className={`text-sm font-bold px-2 py-1 rounded-full ${
                completed === total ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {completed}/{total}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-2">
            <Activity className="text-blue-600 shrink-0" size={16} />
            <p className="text-sm text-blue-700">
              Tapez le résultat puis appuyez sur <kbd className="bg-blue-200 px-1 rounded">Entrée</kbd> pour valider et passer à l'élève suivant.
            </p>
          </div>

          {orderedFilteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Search className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">Aucun élève ne correspond à votre recherche</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {orderedFilteredStudents.map((student, index) => {
                const result = getResultStatus(student.id, selectedTest.id);
                return (
                  <StudentEntryCard
                    key={student.id}
                    student={student}
                    index={index}
                    selectedTest={selectedTest}
                    result={result}
                    draft={draftValues[student.id] ?? ''}
                    isSavingThis={savingStudentId === student.id}
                    isInvalid={invalidStudentId === student.id}
                    registerInputRef={registerInputRef}
                    onDraftChange={onDraftChange}
                    onKeyDown={onKeyDown}
                    onBlur={onBlur}
                    onSetStatus={onSetStatus}
                    onClearResult={onClearResult}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===================== VUE : VUE D'ENSEMBLE (avec scroll) =====================
function OverviewView({
  tests,
  filteredStudents,
  getResultStatus,
  stats,
  searchTerm,
  setSearchTerm,
  cleanAllNullValues,
  saving,
  onJumpToEntry
}) {
  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-sm font-medium text-gray-600">{stats.percentage}% complété ({stats.completed}/{stats.total})</span>
        </div>
        <button
          onClick={cleanAllNullValues}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 transition-colors text-sm"
        >
          <Trash2 size={14} />
          <span>Nettoyer les "null"</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-2">
        <Activity className="text-blue-600 shrink-0" size={16} />
        <p className="text-sm text-blue-700">
          Vue de contrôle : repérez les cases grises (non renseignées), puis cliquez dessus pour ouvrir directement la saisie de cet élève pour ce test.
        </p>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Search className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Aucun élève ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <style>{`
            .sticky-shadow-right { box-shadow: 2px 0 4px rgba(0,0,0,0.1); }
            .sticky-shadow-bottom { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .sticky-corner { box-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
          `}</style>
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="p-3 text-left font-bold text-gray-800 border-r-2 border-b-2 border-gray-300 min-w-[180px] sticky left-0 z-30 bg-gray-100 sticky-corner">
                    Élève
                  </th>
                  {tests.map(test => (
                    <th key={test.id} className="p-2 text-center font-medium text-gray-700 border-r border-b-2 border-gray-300 min-w-[110px] bg-gray-100 sticky-shadow-bottom">
                      <div className="text-xs font-bold">{test.name}</div>
                      <div className="text-[10px] text-gray-500">({test.unit})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 border-b">
                    <td className="p-3 border-r-2 border-gray-200 bg-gray-50 sticky left-0 z-10 sticky-shadow-right">
                      <div className="font-bold text-gray-800 text-sm">{student.last_name}</div>
                      <div className="text-xs text-gray-600">{student.first_name}</div>
                    </td>
                    {tests.map(test => {
                      const result = getResultStatus(student.id, test.id);
                      let content = '—', cls = 'text-gray-400 bg-gray-50';
                      if (result.status === 'result') { content = `${result.value} ${test.unit}`; cls = 'text-green-800 bg-green-50'; }
                      else if (result.status === 'absent') { content = 'ABS'; cls = 'text-red-800 bg-red-50'; }
                      else if (result.status === 'dispensed') { content = 'DISP'; cls = 'text-orange-800 bg-orange-50'; }
                      return (
                        <td
                          key={test.id}
                          onClick={() => onJumpToEntry(student, test)}
                          className={`p-2 border border-gray-200 text-center text-xs cursor-pointer hover:opacity-75 transition-opacity ${cls}`}
                          title="Cliquer pour saisir"
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== VUE : CLASSE SÉLECTIONNÉE =====================
function ClassWorkspace({
  selectedClass,
  selectedSchoolYear,
  viewMode,
  setViewMode,
  onBack,
  refreshData,
  entryViewProps,
  overviewViewProps
}) {
  const colors = getLevelColors(selectedClass.level);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${colors.accent} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Retour aux classes</span>
              </button>
              <div className="flex items-center space-x-3">
                <BarChart3 size={28} />
                <div>
                  <h1 className="text-xl font-bold">{selectedClass.level.charAt(0)}{selectedClass.name}</h1>
                  <p className="text-xs opacity-90 flex items-center gap-2">
                    <Calendar size={12} />
                    <span>Année {selectedSchoolYear}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('entry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'entry' ? 'bg-white text-gray-800' : 'text-white'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Saisie par test</span>
                </button>
                <button
                  onClick={() => setViewMode('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'overview' ? 'bg-white text-gray-800' : 'text-white'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>Vue d'ensemble</span>
                </button>
              </div>
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {viewMode === 'entry' ? <EntryView {...entryViewProps} /> : <OverviewView {...overviewViewProps} />}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL - ne contient que l'état, les chargements et les
// gestionnaires ; tout l'affichage est délégué aux composants ci-dessus.
// ============================================================================
const ResultsEntrySupabase = () => {
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();

  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({}); // { "studentId-testId": { status, value, id } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState('entry'); // 'entry' | 'overview'

  const [selectedTest, setSelectedTest] = useState(null);
  const [draftValues, setDraftValues] = useState({}); // { studentId: "12.5" } - brouillon en cours de frappe
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [invalidStudentId, setInvalidStudentId] = useState(null);
  const [pendingFocusStudentId, setPendingFocusStudentId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [studentsCount, setStudentsCount] = useState({});

  // Refs vers les inputs des vignettes, pour la navigation clavier
  const inputRefs = useRef(new Map());
  const registerInputRef = (studentId, el) => {
    if (el) inputRefs.current.set(studentId, el);
    else inputRefs.current.delete(studentId);
  };

  useEffect(() => {
    if (selectedSchoolYear) {
      loadClassesAndCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchoolYear]);

  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadClassData(selectedClass.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSchoolYear]);

  // Quand on change de test, on réinitialise le brouillon avec les valeurs déjà enregistrées
  useEffect(() => {
    if (!selectedTest) return;
    const newDraft = {};
    students.forEach(student => {
      const key = `${student.id}-${selectedTest.id}`;
      const existing = results[key];
      newDraft[student.id] = existing?.status === 'result' && existing.value !== null
        ? String(existing.value)
        : '';
    });
    setDraftValues(newDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTest, students]);

  // Focus différé sur une vignette (après un clic depuis la vue d'ensemble ou après validation)
  useEffect(() => {
    if (!pendingFocusStudentId) return;
    const raf = requestAnimationFrame(() => {
      const node = inputRefs.current.get(pendingFocusStudentId);
      if (node) {
        node.focus();
        node.select?.();
        node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setPendingFocusStudentId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusStudentId, viewMode, selectedTest]);

  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const [classesRes, testsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('school_year', selectedSchoolYear)
          .order('level'),
        supabase.from('tests').select('*').order('category')
      ]);

      if (classesRes.error) throw classesRes.error;
      if (testsRes.error) throw testsRes.error;

      setClasses(classesRes.data || []);
      setTests(testsRes.data || []);

      if (selectedClass && !classesRes.data.find(c => c.id === selectedClass.id)) {
        setSelectedClass(null);
        setStudents([]);
        setResults({});
      }

      const counts = {};
      for (const classe of classesRes.data) {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedSchoolYear);

        if (!error) counts[classe.id] = count || 0;
      }
      setStudentsCount(counts);

    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async (classId) => {
    try {
      setLoading(true);

      const [studentsRes, resultsRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('class_id', classId)
          .eq('school_year', selectedSchoolYear),
        supabase
          .from('results')
          .select(`*, students!inner(class_id, school_year)`)
          .eq('students.class_id', classId)
          .eq('students.school_year', selectedSchoolYear)
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setStudents(sortStudents(studentsRes.data || []));

      const resultsMap = {};
      resultsRes.data.forEach(result => {
        const key = `${result.student_id}-${result.test_id}`;
        let status = 'result';
        if (result.absent) status = 'absent';
        else if (result.dispensed) status = 'dispensed';
        resultsMap[key] = { status, value: result.value, id: result.id };
      });
      setResults(resultsMap);

    } catch (err) {
      console.error('Erreur lors du chargement de la classe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getResultStatus = (studentId, testId) => {
    const key = `${studentId}-${testId}`;
    return results[key] || { status: 'empty' };
  };

  const getCompletionStats = () => {
    if (!students.length || !tests.length) return { percentage: 0, completed: 0, total: 0 };
    const totalCells = students.length * tests.length;
    let completedCells = 0;
    students.forEach(student => {
      tests.forEach(test => {
        if (getResultStatus(student.id, test.id).status !== 'empty') completedCells++;
      });
    });
    return {
      percentage: totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0,
      completed: completedCells,
      total: totalCells
    };
  };

  const getTestCompletion = (testId) => {
    const total = students.length;
    const completed = students.filter(s => getResultStatus(s.id, testId).status !== 'empty').length;
    return { completed, total };
  };

  const persistResult = async (studentId, testId, status, value) => {
    const key = `${studentId}-${testId}`;
    const existing = results[key];

    const resultData = {
      student_id: parseInt(studentId),
      test_id: parseInt(testId),
      value: status === 'result' ? value : null,
      absent: status === 'absent',
      dispensed: status === 'dispensed',
      unit: tests.find(t => t.id === parseInt(testId))?.unit || '',
      school_year: selectedSchoolYear
    };

    let response;
    if (existing?.id) {
      response = await supabase.from('results').update(resultData).eq('id', existing.id);
    } else {
      response = await supabase.from('results').insert([resultData]).select();
    }
    if (response.error) throw response.error;

    const newId = existing?.id || response.data?.[0]?.id;
    setResults(prev => ({
      ...prev,
      [key]: { status, value: status === 'result' ? value : null, id: newId }
    }));
  };

  const deleteResult = async (studentId, testId) => {
    const key = `${studentId}-${testId}`;
    const existing = results[key];
    if (!existing?.id) return;
    const { error } = await supabase.from('results').delete().eq('id', existing.id);
    if (error) throw error;
    setResults(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Ordre de navigation (liste filtrée affichée à l'écran)
  const orderedFilteredStudents = useMemo(() => {
    const base = sortStudents(students);
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(term));
  }, [students, searchTerm]);

  const focusNextAfter = (studentId) => {
    const idx = orderedFilteredStudents.findIndex(s => s.id === studentId);
    const next = orderedFilteredStudents[idx + 1];
    if (next) {
      setPendingFocusStudentId(next.id);
    } else {
      inputRefs.current.get(studentId)?.blur();
    }
  };

  const handleValidateAndNext = async (studentId) => {
    if (!selectedTest) return;
    const raw = (draftValues[studentId] ?? '').trim();

    if (raw === '') {
      focusNextAfter(studentId);
      return;
    }

    const numeric = parseFloat(raw.replace(',', '.'));
    if (isNaN(numeric)) {
      setInvalidStudentId(studentId);
      setTimeout(() => setInvalidStudentId(null), 1200);
      return;
    }

    try {
      setSavingStudentId(studentId);
      await persistResult(studentId, selectedTest.id, 'result', numeric);
      focusNextAfter(studentId);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert("Erreur lors de la sauvegarde du résultat");
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleBlurSave = async (studentId) => {
    if (!selectedTest) return;
    const raw = (draftValues[studentId] ?? '').trim();
    const existing = getResultStatus(studentId, selectedTest.id);

    if (raw === '') return;
    const alreadySaved = existing.status === 'result' && String(existing.value) === raw;
    if (alreadySaved) return;

    const numeric = parseFloat(raw.replace(',', '.'));
    if (isNaN(numeric)) return;

    try {
      setSavingStudentId(studentId);
      await persistResult(studentId, selectedTest.id, 'result', numeric);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSetStatus = async (studentId, status) => {
    if (!selectedTest) return;
    try {
      setSavingStudentId(studentId);
      await persistResult(studentId, selectedTest.id, status, null);
      setDraftValues(prev => ({ ...prev, [studentId]: '' }));
      focusNextAfter(studentId);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleClearResult = async (studentId) => {
    if (!selectedTest) return;
    try {
      setSavingStudentId(studentId);
      await deleteResult(studentId, selectedTest.id);
      setDraftValues(prev => ({ ...prev, [studentId]: '' }));
      setTimeout(() => inputRefs.current.get(studentId)?.focus(), 30);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert("Erreur lors de la suppression du résultat");
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleKeyDown = (e, studentId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidateAndNext(studentId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const existing = getResultStatus(studentId, selectedTest.id);
      setDraftValues(prev => ({
        ...prev,
        [studentId]: existing.status === 'result' ? String(existing.value) : ''
      }));
      inputRefs.current.get(studentId)?.blur();
    }
  };

  const handleDraftChange = (studentId, value) => {
    setDraftValues(prev => ({ ...prev, [studentId]: value }));
  };

  const cleanAllNullValues = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les valeurs "null" de cette classe ?')) return;
    try {
      setSaving(true);
      const studentIds = students.map(s => s.id);
      const { data: allResults, error: fetchError } = await supabase
        .from('results')
        .select('*')
        .in('student_id', studentIds)
        .eq('school_year', selectedSchoolYear);
      if (fetchError) throw fetchError;

      const nullResults = allResults?.filter(r =>
        r.value === null || r.value === 'null' || r.value === 'NULL' ||
        (typeof r.value === 'string' && r.value.toLowerCase().includes('null'))
      ) || [];

      if (nullResults.length > 0) {
        const { error: deleteError } = await supabase.from('results').delete().in('id', nullResults.map(r => r.id));
        if (deleteError) throw deleteError;
        await loadClassData(selectedClass.id);
        alert(`${nullResults.length} valeur(s) "null" supprimée(s) avec succès !`);
      } else {
        alert('Aucune valeur "null" trouvée dans cette classe.');
      }
    } catch (err) {
      console.error('Erreur lors du nettoyage:', err);
      alert('Erreur lors du nettoyage des valeurs null');
    } finally {
      setSaving(false);
    }
  };

  const refreshData = () => {
    if (selectedClass) {
      loadClassData(selectedClass.id);
    } else {
      loadClassesAndCounts();
    }
  };

  const jumpToEntry = (student, test) => {
    setSelectedTest(test);
    setViewMode('entry');
    setPendingFocusStudentId(student.id);
  };

  const handleSelectClass = (classe) => {
    setSelectedClass(classe);
    setViewMode('entry');
    setSelectedTest(null);
    setSearchTerm('');
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedTest(null);
    setSearchTerm('');
  };

  // ===================== RENDU GLOBAL =====================
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => selectedClass ? loadClassData(selectedClass.id) : loadClassesAndCounts()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-500 mr-3" size={24} />
          <span className="text-gray-600">
            {selectedClass ? 'Chargement de la classe...' : 'Chargement des classes...'}
          </span>
        </div>
      </div>
    );
  }

  const entryViewProps = {
    tests,
    selectedTest,
    onSelectTest: setSelectedTest,
    getTestCompletion,
    getResultStatus,
    searchTerm,
    setSearchTerm,
    orderedFilteredStudents,
    draftValues,
    savingStudentId,
    invalidStudentId,
    registerInputRef,
    onDraftChange: handleDraftChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlurSave,
    onSetStatus: handleSetStatus,
    onClearResult: handleClearResult
  };

  const overviewViewProps = {
    tests,
    filteredStudents: orderedFilteredStudents,
    getResultStatus,
    stats: getCompletionStats(),
    searchTerm,
    setSearchTerm,
    cleanAllNullValues,
    saving,
    onJumpToEntry: jumpToEntry
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner[type=number] { -moz-appearance: textfield; }
      `}</style>
      {selectedClass ? (
        <ClassWorkspace
          selectedClass={selectedClass}
          selectedSchoolYear={selectedSchoolYear}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onBack={handleBackToClasses}
          refreshData={refreshData}
          entryViewProps={entryViewProps}
          overviewViewProps={overviewViewProps}
        />
      ) : (
        <ClassSelectionView
          classes={classes}
          studentsCount={studentsCount}
          selectedSchoolYear={selectedSchoolYear}
          currentSchoolYear={currentSchoolYear}
          onSelectClass={handleSelectClass}
        />
      )}
    </div>
  );
};

export default ResultsEntrySupabase;
