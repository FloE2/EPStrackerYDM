// App.jsx - VERSION ADAPTÉE À VOTRE CONTEXTE
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  ClipboardList, 
  BarChart3, 
  GraduationCap, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Loader, 
  RefreshCw, 
  Calendar, 
  Plus, 
  Copy, 
  ChevronDown, 
  User,
  Trophy,      // AJOUTÉ POUR CHALLENGES
  UserCheck    // AJOUTÉ POUR FICHES INDIVIDUELLES
} from 'lucide-react';

// Import de la configuration Supabase centralisée
import { supabase } from './lib/supabase.js';

// Import du contexte année scolaire
import { SchoolYearProvider, useSchoolYear } from './contexts/SchoolYearContext.jsx';

// Import des composants Supabase - CHEMINS MIXTES CORRIGÉS
import ClassManagementSupabase from './ClassManagementSupabase.jsx';
import TestManagementSupabase from './TestManagementSupabase.jsx';
import ResultsEntrySupabase from './ResultsEntrySupabase.jsx';
import QuickResultsEntrySupabase from './components/QuickResultsEntrySupabase.jsx'; // Celui-ci est dans components/
import SynthesisSupabase from './SynthesisSupabase.jsx';
import IndividualFitnessCard from './IndividualFitnessCard.jsx';
import ChallengesClasses from './ChallengesClasses.jsx';  // AJOUTÉ

// ===== COMPOSANT DE TEST SUPABASE CORRIGÉ =====
const SupabaseTest = () => {
  const [status, setStatus] = useState('En cours...')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  
  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // UTILISE L'INSTANCE CENTRALISÉE - PAS DE NOUVELLE CRÉATION
      console.log('🔗 Utilisation de l\'instance Supabase centralisée...')
      
      // Test de récupération des classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .limit(5)
      
      if (classError) throw classError
      
      // Test de récupération des tests
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .limit(3)
      
      if (testsError) throw testsError
      
      // Compter les données
      const [classesCount, testsCount, studentsCount, resultsCount] = await Promise.all([
        supabase.from('classes').select('*', { count: 'exact' }),
        supabase.from('tests').select('*', { count: 'exact' }),
        supabase.from('students').select('*', { count: 'exact' }),
        supabase.from('results').select('*', { count: 'exact' })
      ])
      
      setData({
        classes: classes,
        tests: tests,
        stats: {
          classes: classesCount.count,
          tests: testsCount.count,
          students: studentsCount.count,
          results: resultsCount.count
        }
      })
      
      setStatus('✅ Supabase connecté - Instance unique utilisée !')
      console.log('🎉 Test Supabase réussi avec instance centralisée !', {
        classes: classesCount.count,
        tests: testsCount.count,
        students: studentsCount.count,
        results: resultsCount.count
      })
      
    } catch (err) {
      setError(err.message)
      setStatus(`❌ Erreur: ${err.message}`)
      console.error('Erreur Supabase:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <Loader className="animate-spin text-blue-500" size={24} />
          <span className="text-lg font-medium">Test de connexion Supabase...</span>
        </div>
        <div className="text-gray-600">
          <p>Vérification avec instance centralisée...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-3 mb-4">
          <XCircle className="text-red-500" size={24} />
          <span className="text-lg font-semibold text-red-700">Erreur de connexion Supabase</span>
        </div>
        
        <div className="mb-4 p-4 bg-red-100 rounded border border-red-200">
          <p className="text-red-600 font-mono text-sm">{error}</p>
        </div>
        
        <button
          onClick={testConnection}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          <RefreshCw size={16} />
          <span>Retester la connexion</span>
        </button>
      </div>
    )
  }

  if (data) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-8 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3 mb-6">
          <CheckCircle className="text-green-500" size={32} />
          <div>
            <h2 className="text-xl font-semibold text-green-700">🎉 Instance Supabase unique OK !</h2>
            <p className="text-green-600">Plus d'erreurs GoTrueClient multiples</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{data.stats.classes}</div>
            <div className="text-sm text-gray-600">Classes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-orange-600">{data.stats.tests}</div>
            <div className="text-sm text-gray-600">Tests</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-purple-600">{data.stats.students}</div>
            <div className="text-sm text-gray-600">Élèves</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-600">{data.stats.results}</div>
            <div className="text-sm text-gray-600">Résultats</div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3">✨ Configuration Supabase Optimisée</h4>
          <div className="text-blue-700 space-y-2 text-sm">
            <p>🔄 <strong>Instance unique :</strong> Plus d'erreurs GoTrueClient multiples</p>
            <p>⚡ <strong>Performance :</strong> Connexions optimisées</p>
            <p>🔧 <strong>Variables d'env :</strong> Configuration centralisée</p>
            <p>💾 <strong>Persistance :</strong> Tous vos résultats sont sauvegardés</p>
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={testConnection}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Actualiser</span>
          </button>
          <button 
  onClick={cleanAllNullValues}
  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 bg-opacity-80 rounded-lg hover:bg-opacity-100"
>
  <X size={16} />
  <span>Nettoyer les "null"</span>
</button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Activity size={16} />
            <span>Utiliser l'application</span>
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ===== HEADER ADAPTÉ À VOTRE CONTEXTE =====
const Header = () => {
  const { 
    selectedSchoolYear, 
    setSelectedSchoolYear, 
    availableYears,         // ← VOTRE NOM DE PROPRIÉTÉ
    createNewSchoolYear,    // ← VOTRE FONCTION
    duplicateYearData,      // ← VOTRE FONCTION
    currentSchoolYear       // ← VOTRE PROPRIÉTÉ (résultat de getCurrentSchoolYear())
  } = useSchoolYear();
  
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [duplicateFromYear, setDuplicateFromYear] = useState('');

  // Utilise VOTRE fonction existante
  const handleCreateNewYear = () => {
    if (newYearInput && !availableYears.includes(newYearInput)) {
      createNewSchoolYear(newYearInput);
      setShowNewYearModal(false);
      setNewYearInput('');
    }
  };

  // Utilise VOTRE fonction existante
  const handleDuplicateYear = async () => {
    if (duplicateFromYear && newYearInput) {
      try {
        await duplicateYearData(duplicateFromYear, newYearInput);
        setShowDuplicateModal(false);
        setDuplicateFromYear('');
        setNewYearInput('');
      } catch (error) {
        console.error('Erreur lors de la duplication:', error);
        alert('Erreur lors de la duplication de l\'année');
      }
    }
  };

  return (
    <header className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Logo et titre EPS Santé */}
          <div className="flex items-center space-x-4">
            <img 
              src="/logo-eps-sante.png" 
              alt="EPS Santé - Collège Yves du Manoir de Vaucresson" 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">EPS SANTÉ</h1>
              <p className="text-blue-500 text-sm font-medium">Collège Yves du Manoir de Vaucresson</p>
              <p className="text-gray-500 text-xs">Suivi de la condition physique</p>
            </div>
          </div>

          {/* Sélecteur Année Scolaire */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Calendar size={16} />
                <span className="font-semibold">{selectedSchoolYear}</span>
                <ChevronDown size={16} className={showYearDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {showYearDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800">Année scolaire</h3>
                    {selectedSchoolYear === currentSchoolYear && (
                      <p className="text-xs text-green-600">Année courante</p>
                    )}
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedSchoolYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                          selectedSchoolYear === year 
                            ? 'bg-blue-100 text-blue-700 font-semibold' 
                            : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{year}</span>
                          {year === currentSchoolYear && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                              Actuelle
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-3 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => {
                        setShowNewYearModal(true);
                        setShowYearDropdown(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <Plus size={14} />
                      <span className="text-sm font-medium">Nouvelle année</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDuplicateModal(true);
                        setShowYearDropdown(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Copy size={14} />
                      <span className="text-sm font-medium">Dupliquer année</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Signature créateur */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-gray-500 text-xs">Créé par</p>
                <p className="text-blue-600 font-medium text-sm">Eude Florian</p>
                <p className="text-gray-500 text-xs">Contributeur</p>
    <p className="text-green-600 font-medium text-sm">Cospérec Emeric</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">EF</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Année */}
      {showNewYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Créer une nouvelle année scolaire</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année scolaire (format: 2026-2027)
              </label>
              <input
                type="text"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                placeholder="2026-2027"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-700 text-sm">
                Une nouvelle année vide sera créée. Vous pourrez ensuite dupliquer les données d'une année existante.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewYearModal(false);
                  setNewYearInput('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateNewYear}
                disabled={!newYearInput}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Créer l'année
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dupliquer Année */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Dupliquer une année scolaire</h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dupliquer depuis l'année
                </label>
                <select
                  value={duplicateFromYear}
                  onChange={(e) => setDuplicateFromYear(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner une année source</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vers la nouvelle année
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="2026-2027"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                <strong>Éléments dupliqués :</strong> Classes, élèves, structure
                <br />
                <strong>Non dupliqués :</strong> Résultats des tests (remis à zéro)
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateFromYear('');
                  setNewYearInput('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDuplicateYear}
                disabled={!duplicateFromYear || !newYearInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// Composant Navigation - AVEC LES 2 NOUVEAUX ONGLETS
const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'synthesis', label: 'Synthèse', icon: BarChart3 },
    { id: 'classes', label: 'Gestion des Classes', icon: Users },
    { id: 'tests', label: 'Tests Physiques', icon: Activity },
    { id: 'results', label: 'Saisie Résultats', icon: ClipboardList },
    { id: 'individual-cards', label: 'Fiches Individuelles', icon: UserCheck }, // NOUVEAU
    { id: 'challenges', label: 'Challenges Classes', icon: Trophy },           // NOUVEAU
    { id: 'quick-entry', label: 'Mode Élève', icon: Zap }
  ];

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

// Composant principal App - AVEC LES 2 NOUVEAUX COMPOSANTS
function App() {
  const [activeTab, setActiveTab] = useState('synthesis'); // PAGE D'ACCUEIL = DASHBOARD

  const renderContent = () => {
    switch (activeTab) {
      case 'synthesis':
        return <SynthesisSupabase setActiveTab={setActiveTab} />;
      case 'classes':
        return <ClassManagementSupabase />;
      case 'tests':
        return <TestManagementSupabase />;
      case 'results':
        return <ResultsEntrySupabase />;
      case 'quick-entry':
        return <QuickResultsEntrySupabase setActiveTab={setActiveTab} />;
      case 'individual-cards':        // NOUVEAU
        return <IndividualFitnessCard setActiveTab={setActiveTab} />;
      case 'challenges':              // NOUVEAU
        return <ChallengesClasses />;
      default:
        return <SynthesisSupabase setActiveTab={setActiveTab} />;
    }
  };

  const isQuickEntryMode = activeTab === 'quick-entry';

  return (
    <SchoolYearProvider>
      <div className="min-h-screen bg-gray-100">
        {!isQuickEntryMode && <Header />}
        {!isQuickEntryMode && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />}
        <main className="min-h-screen">
          {renderContent()}
        </main>
      </div>
    </SchoolYearProvider>
  );
}

export default App;
