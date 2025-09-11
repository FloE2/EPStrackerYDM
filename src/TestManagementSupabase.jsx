import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  GitBranch, 
  Users, 
  Zap, 
  Clock,
  Search,
  Filter,
  Eye,
  Loader,
  AlertCircle,
  TestTube,
  Plus,
  Save,
  X,
  Copy,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';

// UTILISE L'INSTANCE CENTRALISÉE - PAS DE CRÉATION D'INSTANCE
import { supabase } from './lib/supabase.js';

const TestManagementSupabase = () => {
  const [tests, setTests] = useState([]);
  const [testsByCategory, setTestsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'ENDURANCE',
    description: '',
    unit: '',
    duration: 'courte (moins de 5 min)',
    trials: '1',
    quality_evaluated: '',
    material: [],
    evaluation: '',
    validation: '',
    full_description: ''
  });

  const categoryConfig = {
    ENDURANCE: { 
      icon: Activity, 
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      name: 'Endurance'
    },
    FORCE: { 
      icon: Target, 
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      name: 'Force'
    },
    SOUPLESSE: { 
      icon: GitBranch, 
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      name: 'Souplesse'
    },
    EQUILIBRE: { 
      icon: Users, 
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      name: 'Équilibre'
    },
    VITESSE: { 
      icon: Zap, 
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      name: 'Vitesse'
    },
    COORDINATION: { 
      icon: Clock, 
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      name: 'Coordination'
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
        } else if (showModal) {
          closeModal();
        }
      }
    };
    
    if (showModal || showDeleteConfirm) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDeleteConfirm]);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔗 TestManagement: Utilisation instance Supabase centralisée');
      
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      
      const testsByCat = {};
      data.forEach(test => {
        if (!testsByCat[test.category]) {
          testsByCat[test.category] = [];
        }
        testsByCat[test.category].push(test);
      });
      
      setTests(data);
      setTestsByCategory(testsByCat);
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement des tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'ENDURANCE',
      description: '',
      unit: '',
      duration: 'courte (moins de 5 min)',
      trials: '1',
      quality_evaluated: '',
      material: [],
      evaluation: '',
      validation: '',
      full_description: ''
    });
    setEditingTest(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTest(null);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setEditingTest(null);
    setShowModal(true);
  };

  const duplicateTest = (test) => {
    setEditingTest(null);
    
    const duplicatedData = {
      name: `${test.name} - Copie`,
      category: test.category || 'ENDURANCE',
      description: test.description || '',
      unit: test.unit || '',
      duration: test.duration || 'courte (moins de 5 min)',
      trials: test.trials || '1',
      quality_evaluated: test.quality_evaluated || '',
      material: Array.isArray(test.material) ? [...test.material] : [],
      evaluation: test.evaluation || '',
      validation: test.validation || '',
      full_description: test.full_description || ''
    };
    
    setFormData(duplicatedData);
    setTimeout(() => setShowModal(true), 10);
  };

  const editTest = (test) => {
    setFormData({
      name: test.name || '',
      category: test.category || 'ENDURANCE',
      description: test.description || '',
      unit: test.unit || '',
      duration: test.duration || 'courte (moins de 5 min)',
      trials: test.trials || '1',
      quality_evaluated: test.quality_evaluated || '',
      material: Array.isArray(test.material) ? [...test.material] : [],
      evaluation: test.evaluation || '',
      validation: test.validation || '',
      full_description: test.full_description || ''
    });
    setEditingTest(test);
    setShowModal(true);
  };

  const handleDelete = async (testToDelete) => {
    try {
      setDeleting(true);
      
      // Vérifier s'il y a des résultats associés à ce test
      const { data: results, error: checkError } = await supabase
        .from('results')
        .select('id')
        .eq('test_id', testToDelete.id)
        .limit(1);
      
      if (checkError) {
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }
      
      if (results && results.length > 0) {
        alert('⚠️ Ce test ne peut pas être supprimé car il contient des résultats d\'élèves. Vous devez d\'abord supprimer tous les résultats associés.');
        return;
      }
      
      // Supprimer le test
      const { error: deleteError } = await supabase
        .from('tests')
        .delete()
        .eq('id', testToDelete.id);
      
      if (deleteError) {
        throw new Error(`Erreur de suppression: ${deleteError.message}`);
      }
      
      alert('✅ Test supprimé avec succès !');
      
      // Recharger les données
      await loadTests();
      setShowDeleteConfirm(null);
      
    } catch (error) {
      console.error('Erreur complète:', error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Veuillez remplir au minimum le nom et la description du test');
      return;
    }

    try {
      setSaving(true);
      
      const baseTestData = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        unit: formData.unit.trim() || null,
        duration: formData.duration,
        trials: formData.trials,
        quality_evaluated: formData.quality_evaluated.trim() || null,
        material: formData.material.filter(item => item && item.trim() !== ''),
        evaluation: formData.evaluation.trim() || null,
        validation: formData.validation.trim() || null,
        full_description: formData.full_description.trim() || null
      };

      if (editingTest && editingTest.id) {
        const { data, error } = await supabase
          .from('tests')
          .update(baseTestData)
          .eq('id', editingTest.id)
          .select();
        
        if (error) {
          console.error('Erreur Supabase (édition):', error);
          throw new Error(`Erreur d'édition: ${error.message}`);
        }
        
        console.log('Test modifié:', data);
        alert('Test modifié avec succès !');
        
      } else {
        const { data, error } = await supabase
          .from('tests')
          .insert([baseTestData])
          .select();
        
        if (error) {
          console.error('Erreur Supabase (création):', error);
          throw new Error(`Erreur de création: ${error.message}`);
        }
        
        console.log('Test créé:', data);
        alert('Test créé avec succès !');
      }

      await loadTests();
      closeModal();
      
    } catch (error) {
      console.error('Erreur complète:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addMaterialItem = () => {
    setFormData(prev => ({
      ...prev,
      material: [...prev.material, '']
    }));
  };

  const updateMaterialItem = (index, value) => {
    setFormData(prev => ({
      ...prev,
      material: prev.material.map((item, i) => i === index ? value : item)
    }));
  };

  const removeMaterialItem = (index) => {
    setFormData(prev => ({
      ...prev,
      material: prev.material.filter((_, i) => i !== index)
    }));
  };

  // Filtrer les tests selon les critères
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Grouper les tests filtrés par catégorie
  const filteredTestsByCategory = {};
  filteredTests.forEach(test => {
    if (!filteredTestsByCategory[test.category]) {
      filteredTestsByCategory[test.category] = [];
    }
    filteredTestsByCategory[test.category].push(test);
  });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadTests} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
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
          <span className="text-gray-600">Chargement des tests depuis Supabase (instance centralisée)...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Tests Physiques par Catégorie</h2>
            <p className="text-gray-600">Consultez les {tests.length} tests disponibles - Instance Supabase centralisée</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Nouveau test</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les catégories</option>
              {Object.keys(categoryConfig).map(category => (
                <option key={category} value={category}>{categoryConfig[category].name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Object.entries(categoryConfig).map(([category, config]) => {
          const IconComponent = config.icon;
          const count = testsByCategory[category]?.length || 0;
          
          return (
            <div
              key={category}
              className={`${config.bg} ${config.border} border-2 rounded-lg p-4 text-center cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === category ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category ? 'all' : category)}
            >
              <IconComponent className={`mx-auto mb-2 ${config.text}`} size={24} />
              <div className="text-sm font-medium text-gray-800">{config.name}</div>
              <div className={`text-lg font-bold ${config.text}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Tests by Category */}
      {filteredTests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <TestTube size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Aucun test trouvé avec ces critères'
              : 'Aucun test disponible'
            }
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredTestsByCategory).map(([category, categoryTests]) => {
            const config = categoryConfig[category] || categoryConfig.FORCE;
            const IconComponent = config.icon;
            
            return (
              <div key={category} className={`${config.bg} ${config.border} border-2 rounded-xl p-6`}>
                {/* Category Header */}
                <div className={`flex items-center space-x-3 mb-6 ${config.text}`}>
                  <IconComponent size={28} />
                  <div>
                    <h3 className="text-xl font-bold">{config.name}</h3>
                    <p className="text-sm opacity-80">
                      {categoryTests.length} test{categoryTests.length > 1 ? 's' : ''} disponible{categoryTests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Tests Grid for this category */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryTests.map(test => (
                    <div key={test.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={config.text} size={18} />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} bg-opacity-60`}>
                            {test.unit}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTest(test);
                            }}
                            className="text-gray-400 hover:text-green-600 transition-colors p-1"
                            title="Dupliquer ce test"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editTest(test);
                            }}
                            className="text-gray-400 hover:text-orange-600 transition-colors p-1"
                            title="Modifier ce test"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(test);
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                            title="Supprimer ce test"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedTest(test)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-gray-800 mb-2">{test.name}</h4>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{test.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-medium">{test.quality_evaluated}</span>
                        <span className="text-right">
                          <div>{test.duration}</div>
                          <div>{test.trials} essai{test.trials > 1 ? 's' : ''}</div>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Confirmer la suppression</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir supprimer le test <strong>"{showDeleteConfirm.name}"</strong> ?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Cette action est irréversible. Le test sera définitivement supprimé de la base de données.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {deleting ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Details Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={categoryConfig[selectedTest.category]?.text || 'text-gray-700'}>
                    {selectedTest.category === 'ENDURANCE' && <Activity size={24} />}
                    {selectedTest.category === 'FORCE' && <Target size={24} />}
                    {selectedTest.category === 'SOUPLESSE' && <GitBranch size={24} />}
                    {selectedTest.category === 'EQUILIBRE' && <Users size={24} />}
                    {selectedTest.category === 'VITESSE' && <Zap size={24} />}
                    {selectedTest.category === 'COORDINATION' && <Clock size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedTest.name}</h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig[selectedTest.category]?.bg} ${categoryConfig[selectedTest.category]?.text}`}>
                      {categoryConfig[selectedTest.category]?.name}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedTest(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Informations générales</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium text-gray-700">Unité:</span> <span className="ml-2 text-gray-600">{selectedTest.unit}</span></div>
                    <div><span className="font-medium text-gray-700">Durée:</span> <span className="ml-2 text-gray-600">{selectedTest.duration}</span></div>
                    <div><span className="font-medium text-gray-700">Nombre d'essais:</span> <span className="ml-2 text-gray-600">{selectedTest.trials}</span></div>
                    <div><span className="font-medium text-gray-700">Qualité évaluée:</span> <span className="ml-2 text-gray-600">{selectedTest.quality_evaluated}</span></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Matériel nécessaire</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {selectedTest.material && selectedTest.material.length > 0 
                      ? selectedTest.material.map((item, index) => <li key={index}>{item}</li>)
                      : <li>Non spécifié</li>
                    }
                  </ul>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                <p className="text-gray-600 mb-4">{selectedTest.description}</p>
                
                {selectedTest.full_description && (
                  <>
                    <h4 className="font-semibold text-gray-800 mb-2">Consignes de réalisation</h4>
                    <p className="text-gray-600 mb-4">{selectedTest.full_description}</p>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Évaluation</h4>
                  <p className="text-gray-600">{selectedTest.evaluation}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Validation</h4>
                  <p className="text-gray-600">{selectedTest.validation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTest ? "Modifier le test" : "Créer un nouveau test"}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du test *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Test de vitesse"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(categoryConfig).map(([category, config]) => (
                      <option key={category} value={category}>{config.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Description courte du test"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unité de mesure</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: cm, sec, kg..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="courte (moins de 5 min)">courte (moins de 5 min)</option>
                    <option value="moyenne (5-10 min)">moyenne (5-10 min)</option>
                    <option value="longue (plus de 10 min)">longue (plus de 10 min)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre d'essais</label>
                  <input
                    type="text"
                    value={formData.trials}
                    onChange={(e) => setFormData(prev => ({ ...prev, trials: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: 1, 2, 3..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualité évaluée</label>
                <input
                  type="text"
                  value={formData.quality_evaluated}
                  onChange={(e) => setFormData(prev => ({ ...prev, quality_evaluated: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Force des jambes, Endurance cardio-respiratoire..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Matériel nécessaire</label>
                {formData.material.length === 0 ? (
                  <button
                    type="button"
                    onClick={addMaterialItem}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Ajouter du matériel</span>
                  </button>
                ) : (
                  <>
                    {formData.material.map((item, index) => (
                      <div key={`material-${index}`} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateMaterialItem(index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: Chronomètre, Tapis..."
                        />
                        <button
                          type="button"
                          onClick={() => removeMaterialItem(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addMaterialItem}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1 transition-colors"
                    >
                      <Plus size={16} />
                      <span>Ajouter du matériel</span>
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Évaluation</label>
                  <textarea
                    value={formData.evaluation}
                    onChange={(e) => setFormData(prev => ({ ...prev, evaluation: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Comment évaluer le résultat"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Validation</label>
                  <textarea
                    value={formData.validation}
                    onChange={(e) => setFormData(prev => ({ ...prev, validation: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Critères de validation du test"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Consignes de réalisation</label>
                <textarea
                  value={formData.full_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Description détaillée du protocole"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.description.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>{editingTest ? 'Modification...' : 'Création...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingTest ? 'Modifier le test' : 'Créer le test'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="text-green-600" size={16} />
          <p className="text-sm text-green-700">
            <strong>Instance Supabase centralisée :</strong> Ce composant utilise maintenant l'instance unique de Supabase. 
            Plus d'erreurs "Multiple GoTrueClient instances" !
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestManagementSupabase;