// src/components/ClassManagementSupabase.jsx - VERSION AVEC FICHES IMPRIMABLES
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Upload, 
  Trash2,
  CheckCircle,
  X,
  Plus,
  Grid,
  List,
  Eye,
  Edit3,
  Target,
  XCircle,
  AlertTriangle,
  FileText,
  Printer
} from 'lucide-react';

import { supabase } from './lib/supabase.js';
import { useSchoolYear } from './contexts/SchoolYearContext';
import { ExcelImportModal } from './ExcelImportModal';

// Composant pour générer les fiches imprimables
const StudentSheetGenerator = ({ student, selectedClass, tests, results, onClose }) => {
  const schoolYear = student.school_year || selectedClass.school_year || '2025-2026';
  
  if (!student || !selectedClass || !tests || !Array.isArray(tests)) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Erreur : Données manquantes pour générer la fiche</p>
        <button onClick={onClose} style={{ marginTop: '10px', padding: '8px 16px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    );
  }

  const getResultStatus = (studentId, testId) => {
    const key = `${studentId}-${testId}`;
    return results ? results[key] || { status: 'empty' } : { status: 'empty' };
  };

  const testsByCategory = tests.reduce((acc, test) => {
    const category = test.category || 'AUTRE';
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {});

  const getCategoryColors = (category) => {
    const colors = {
      'ENDURANCE': { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
      'FORCE': { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
      'SOUPLESSE': { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
      'EQUILIBRE': { bg: '#F3E8FF', border: '#D8B4FE', text: '#6B21A8' },
      'VITESSE': { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
      'COORDINATION': { bg: '#E0E7FF', border: '#C7D2FE', text: '#3730A3' }
    };
    return colors[category] || { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-sheet, #printable-sheet * { visibility: visible; }
          #printable-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
        }
        @media screen {
          #printable-sheet {
            width: 297mm;
            min-height: 210mm;
            background: white;
            margin: 0 auto;
            padding: 15mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
        .print-container { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
        .header-section { border-bottom: 3px solid #1E40AF; padding-bottom: 8px; margin-bottom: 12px; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 8px; }
        .info-box { background: #F3F4F6; padding: 6px 10px; border-radius: 4px; border: 1px solid #D1D5DB; }
        .categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
        .category-section { border: 2px solid; border-radius: 6px; padding: 8px; break-inside: avoid; }
        .category-header { font-size: 12pt; font-weight: bold; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid; }
        .test-row { display: grid; grid-template-columns: 2fr 1fr 30px; gap: 8px; align-items: center; margin-bottom: 8px; padding: 6px; background: white; border-radius: 3px; border: 1px solid #E5E7EB; }
        .test-name { font-weight: 500; font-size: 10pt; }
        .result-box { border: 2px solid #9CA3AF; border-radius: 3px; padding: 6px; min-height: 28px; background: white; text-align: center; font-weight: bold; }
        .result-filled { background: #DBEAFE; border-color: #3B82F6; color: #1E40AF; }
        .checkbox-validation { width: 20px; height: 20px; border: 2px solid #6B7280; border-radius: 3px; margin: 0 auto; }
        .validation-section { border: 2px dashed #9CA3AF; border-radius: 6px; padding: 10px; background: #F9FAFB; display: flex; justify-content: space-between; align-items: center; }
        .signature-box { border-bottom: 2px solid #374151; width: 200px; height: 30px; }
        .unit-label { font-size: 9pt; color: #6B7280; font-style: italic; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', gap: '10px' }}>
        <button onClick={() => window.print()} style={{ background: '#3B82F6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '14pt', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🖨️ Imprimer la fiche
        </button>
        <button onClick={onClose} style={{ background: '#6B7280', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12pt' }}>
          ✕ Fermer
        </button>
      </div>

      <div id="printable-sheet">
        <div className="print-container">
          <div className="header-section">
            <h1 style={{ margin: 0, fontSize: '18pt', color: '#1E40AF' }}>FICHE INDIVIDUELLE - TESTS PHYSIQUES</h1>
          </div>

          <div className="student-info">
            <div className="info-box"><strong>Élève :</strong> {student.first_name} {student.last_name}</div>
            <div className="info-box"><strong>Classe :</strong> {selectedClass.level.charAt(0)}{selectedClass.name}</div>
            <div className="info-box"><strong>Année :</strong> {schoolYear}</div>
          </div>

          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '10pt' }}>
            <strong>📝 Instructions :</strong> Complète cette fiche au fur et à mesure que tu réalises les tests. Les résultats déjà enregistrés sont indiqués. Demande la validation du professeur une fois tous les tests terminés.
          </div>

          <div className="categories-grid">
            {Object.entries(testsByCategory).map(([category, categoryTests]) => {
              const colors = getCategoryColors(category);
              return (
                <div key={category} className="category-section" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                  <div className="category-header" style={{ color: colors.text, borderColor: colors.border }}>{category}</div>
                  {categoryTests.map(test => {
                    const result = getResultStatus(student.id, test.id);
                    const hasResult = result.status === 'result';
                    return (
                      <div key={test.id} className="test-row">
                        <div className="test-name">{test.name}<div className="unit-label">({test.unit})</div></div>
                        <div className={`result-box ${hasResult ? 'result-filled' : ''}`}>
                          {hasResult ? `${result.value} ${test.unit}` : ''}
                        </div>
                        <div className="checkbox-validation"></div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="validation-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '30px', height: '30px', border: '3px solid #059669', borderRadius: '4px' }}></div>
              <div>
                <strong style={{ fontSize: '11pt' }}>✓ VALIDATION PROFESSEUR</strong>
                <div style={{ fontSize: '9pt', color: '#6B7280' }}>Cocher quand tous les tests sont terminés et validés</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10pt', marginBottom: '5px' }}>Signature :</div>
              <div className="signature-box"></div>
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9pt', color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
            <strong>Légende :</strong> Cases bleues = résultats déjà enregistrés • Cases blanches = à compléter • Cases à droite = à cocher quand le test est fait
          </div>
        </div>
      </div>
    </>
  );
};

const ClassManagementSupabase = () => {
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();

  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [studentsCount, setStudentsCount] = useState({});

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // États pour les fiches imprimables
  const [showStudentSheet, setShowStudentSheet] = useState(null);
  const [showAllSheetsPreview, setShowAllSheetsPreview] = useState(false);

  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: ''
  });

  const [newClassData, setNewClassData] = useState({
    name: '',
    level: '6ème'
  });

  const getLevelColors = (level) => {
    const levelColorMap = {
      '6ème': {
        bg: 'bg-blue-50', 
        border: 'border-blue-300', 
        text: 'text-blue-700', 
        accent: 'bg-blue-600',
        hover: 'hover:bg-blue-100',
        dot: 'bg-blue-500'
      },
      '5ème': {
        bg: 'bg-emerald-50', 
        border: 'border-emerald-300', 
        text: 'text-emerald-700', 
        accent: 'bg-emerald-600',
        hover: 'hover:bg-emerald-100',
        dot: 'bg-emerald-500'
      },
      '4ème': {
        bg: 'bg-orange-50', 
        border: 'border-orange-300', 
        text: 'text-orange-700', 
        accent: 'bg-orange-600',
        hover: 'hover:bg-orange-100',
        dot: 'bg-orange-500'
      },
      '3ème': {
        bg: 'bg-purple-50', 
        border: 'border-purple-300', 
        text: 'text-purple-700', 
        accent: 'bg-purple-600',
        hover: 'hover:bg-purple-100',
        dot: 'bg-purple-500'
      }
    };
    return levelColorMap[level] || levelColorMap['6ème'];
  };

  const getCategoryColors = (category) => {
    const categoryColorMap = {
      'ENDURANCE': {
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-700', 
        hover: 'hover:bg-blue-100'
      },
      'FORCE': {
        bg: 'bg-red-50', 
        border: 'border-red-200', 
        text: 'text-red-700', 
        hover: 'hover:bg-red-100'
      },
      'SOUPLESSE': {
        bg: 'bg-green-50', 
        border: 'border-green-200', 
        text: 'text-green-700', 
        hover: 'hover:bg-green-100'
      },
      'EQUILIBRE': {
        bg: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700', 
        hover: 'hover:bg-purple-100'
      },
      'VITESSE': {
        bg: 'bg-yellow-50', 
        border: 'border-yellow-200', 
        text: 'text-yellow-700', 
        hover: 'hover:bg-yellow-100'
      },
      'COORDINATION': {
        bg: 'bg-indigo-50', 
        border: 'border-indigo-200', 
        text: 'text-indigo-700', 
        hover: 'hover:bg-indigo-100'
      }
    };
    return categoryColorMap[category] || categoryColorMap['ENDURANCE'];
  };

  const getResultStatus = (studentId, testId) => {
    const key = `${studentId}-${testId}`;
    return results[key] || { status: 'empty' };
  };

  const getStudentStats = (student) => {
    let completed = 0;
    let withResults = 0;
    let absent = 0;
    let dispensed = 0;
    
    tests.forEach(test => {
      const result = getResultStatus(student.id, test.id);
      if (result.status !== 'empty') {
        completed++;
        if (result.status === 'result') withResults++;
        else if (result.status === 'absent') absent++;
        else if (result.status === 'dispensed') dispensed++;
      }
    });
    
    return {
      completed,
      withResults,
      absent,
      dispensed,
      remaining: tests.length - completed,
      percentage: tests.length > 0 ? Math.round((completed / tests.length) * 100) : 0,
      total: tests.length
    };
  };

  const getGenderColor = (gender) => {
    if (gender === 'M' || gender === 'Garçon') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (gender === 'F' || gender === 'Fille') {
      return 'bg-pink-100 text-pink-800 border-pink-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatBirthDate = (birthDate) => {
    if (!birthDate) return 'Non renseignée';
    return new Date(birthDate).toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    if (selectedSchoolYear) {
      loadClasses();
      loadTests();
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadStudents(selectedClass.id);
      loadResults(selectedClass.id);
    }
  }, [selectedClass, selectedSchoolYear]);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('category');

      if (error) {
        console.error('Erreur lors du chargement des tests:', error);
        return;
      }

      setTests(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadResults = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          students!inner(class_id, school_year)
        `)
        .eq('students.class_id', classId)
        .eq('students.school_year', selectedSchoolYear);

      if (error) {
        console.error('Erreur lors du chargement des résultats:', error);
        return;
      }

      const resultsMap = {};
      (data || []).forEach(result => {
        const key = `${result.student_id}-${result.test_id}`;
        
        let status = 'result';
        if (result.absent) status = 'absent';
        else if (result.dispensed) status = 'dispensed';
        
        resultsMap[key] = {
          status: status,
          value: result.value,
          id: result.id
        };
      });
      
      setResults(resultsMap);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_year', selectedSchoolYear)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des classes:', error);
        setError('Erreur lors du chargement des classes');
        return;
      }

      setClasses(data || []);

      const counts = {};
      for (const classe of data || []) {
        const { count, error: countError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedSchoolYear);
        
        if (!countError) {
          counts[classe.id] = count || 0;
        }
      }
      setStudentsCount(counts);

    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('school_year', selectedSchoolYear)
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des élèves:', error);
        setError('Erreur lors du chargement des élèves');
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion');
    }
  };

  const createClass = async () => {
    try {
      if (!newClassData.name.trim()) {
        alert('Veuillez saisir un nom de classe');
        return;
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([{
          name: newClassData.name.trim(),
          level: newClassData.level,
          school_year: selectedSchoolYear
        }])
        .select();

      if (error) {
        console.error('Erreur lors de la création de la classe:', error);
        alert('Erreur lors de la création de la classe');
        return;
      }

      console.log('Classe créée avec succès:', data);
      
      setShowCreateClassModal(false);
      setNewClassData({ name: '', level: '6ème' });
      
      loadClasses();
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la classe');
    }
  };

  const addStudent = async () => {
    try {
      if (!newStudent.firstName.trim() || !newStudent.lastName.trim()) {
        alert('Veuillez renseigner le prénom et le nom');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .insert([{
          first_name: newStudent.firstName.trim(),
          last_name: newStudent.lastName.trim().toUpperCase(),
          birth_date: newStudent.birthDate || null,
          gender: newStudent.gender || null,
          class_id: selectedClass.id,
          school_year: selectedSchoolYear
        }])
        .select();

      if (error) {
        console.error('Erreur lors de l\'ajout de l\'élève:', error);
        alert('Erreur lors de l\'ajout de l\'élève');
        return;
      }

      console.log('Élève ajouté avec succès:', data);
      
      setShowAddStudentModal(false);
      setNewStudent({ firstName: '', lastName: '', birthDate: '', gender: '' });
      
      loadStudents(selectedClass.id);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout de l\'élève');
    }
  };

  const updateStudent = async () => {
    try {
      if (!editingStudent.firstName.trim() || !editingStudent.lastName.trim()) {
        alert('Veuillez renseigner le prénom et le nom');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .update({
          first_name: editingStudent.firstName.trim(),
          last_name: editingStudent.lastName.trim().toUpperCase(),
          birth_date: editingStudent.birthDate || null,
          gender: editingStudent.gender || null
        })
        .eq('id', editingStudent.id)
        .select();

      if (error) {
        console.error('Erreur lors de la modification de l\'élève:', error);
        alert('Erreur lors de la modification de l\'élève');
        return;
      }

      console.log('Élève modifié avec succès:', data);
      
      setShowEditStudentModal(false);
      setEditingStudent(null);
      
      loadStudents(selectedClass.id);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification de l\'élève');
    }
  };

  const openEditStudent = (student) => {
    setEditingStudent({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      birthDate: student.birth_date || '',
      gender: student.gender || ''
    });
    setShowEditStudentModal(true);
  };

  const deleteStudent = async (studentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
        return;
      }

      loadStudents(selectedClass.id);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const deleteClass = async (classToDelete, event) => {
    event.stopPropagation();

    if (!confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classToDelete.name} - ${classToDelete.level} ?\n\nAttention : Tous les élèves et résultats associés à cette classe seront également supprimés !`)) {
      return;
    }

    try {
      const { data: studentsData, error: studentsSelectError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classToDelete.id);

      if (studentsSelectError) {
        console.error('Erreur lors de la récupération des élèves:', studentsSelectError);
      }

      const studentIds = studentsData?.map(s => s.id) || [];

      if (studentIds.length > 0) {
        const { error: resultsError } = await supabase
          .from('results')
          .delete()
          .in('student_id', studentIds);

        if (resultsError) {
          console.error('Erreur lors de la suppression des résultats:', resultsError);
        }
      }

      const { error: studentsError } = await supabase
        .from('students')
        .delete()
        .eq('class_id', classToDelete.id);

      if (studentsError) {
        console.error('Erreur lors de la suppression des élèves:', studentsError);
        alert('Erreur lors de la suppression des élèves de la classe');
        return;
      }

      const { error: classError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classToDelete.id);

      if (classError) {
        console.error('Erreur lors de la suppression de la classe:', classError);
        alert('Erreur lors de la suppression de la classe');
        return;
      }

      console.log('Classe supprimée avec succès:', classToDelete);
      
      loadClasses();
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression de la classe');
    }
  };

  const handleStudentsAdded = () => {
    loadStudents(selectedClass.id);
  };

  // Fonctions pour les fiches
  const handlePrintStudentSheet = (student) => {
    setShowStudentSheet(student);
  };

  const handlePrintAllSheets = () => {
    if (students.length === 0) {
      alert('Aucun élève à imprimer dans cette classe');
      return;
    }
    setShowAllSheetsPreview(true);
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StudentDetailView = ({ student }) => {
    if (!student) return null;
    
    const studentStats = getStudentStats(student);
    
    const testsByCategory = tests.reduce((acc, test) => {
      const category = test.category || 'AUTRE';
      if (!acc[category]) acc[category] = [];
      acc[category].push(test);
      return acc;
    }, {});

    const getProgressColor = (percentage) => {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-yellow-500';
      if (percentage >= 40) return 'bg-orange-500';
      return 'bg-red-500';
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {student.last_name} {student.first_name}
              </h3>
              <p className="text-gray-600 flex items-center space-x-2">
                <span>Classe {selectedClass.name} • {selectedClass.level}</span>
                <Calendar size={14} />
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                  {selectedSchoolYear}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{studentStats.withResults}</div>
                  <div className="text-xs text-gray-500">Réalisés</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{studentStats.absent}</div>
                  <div className="text-xs text-gray-500">Absents</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{studentStats.dispensed}</div>
                  <div className="text-xs text-gray-500">Dispensés</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">{studentStats.remaining}</div>
                  <div className="text-xs text-gray-500">Restants</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(studentStats.percentage)}`}
                    style={{ width: `${studentStats.percentage}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold text-gray-700">{studentStats.percentage}%</span>
              </div>
              
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            <div className="space-y-6">
              {Object.entries(testsByCategory).map(([category, categoryTests]) => {
                const categoryColors = getCategoryColors(category);
                
                return (
                  <div key={category} className={`${categoryColors.bg} border ${categoryColors.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`text-lg font-bold ${categoryColors.text}`}>
                        {category}
                      </h4>
                      <div className="text-xs text-gray-600">
                        {categoryTests.filter(test => getResultStatus(student.id, test.id).status !== 'empty').length}/{categoryTests.length} tests
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {categoryTests.map(test => {
                        const result = getResultStatus(student.id, test.id);
                        
                        let statusIcon, statusText, statusColor, cardBg;
                        
                        switch (result.status) {
                          case 'result':
                            statusIcon = <CheckCircle size={16} />;
                            statusText = `${result.value} ${test.unit}`;
                            statusColor = 'text-green-700';
                            cardBg = 'bg-white border-green-300';
                            break;
                          case 'absent':
                            statusIcon = <XCircle size={16} />;
                            statusText = 'Absent';
                            statusColor = 'text-red-700';
                            cardBg = 'bg-white border-red-300';
                            break;
                          case 'dispensed':
                            statusIcon = <AlertTriangle size={16} />;
                            statusText = 'Dispensé';
                            statusColor = 'text-orange-700';
                            cardBg = 'bg-white border-orange-300';
                            break;
                          default:
                            statusIcon = <Target size={16} />;
                            statusText = 'À faire';
                            statusColor = 'text-gray-500';
                            cardBg = 'bg-gray-50 border-gray-300';
                        }
                        
                        return (
                          <div
                            key={test.id}
                            className={`p-3 border-2 ${cardBg} rounded-lg text-left`}
                          >
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-700 truncate" title={test.name}>
                                {test.name}
                              </div>
                              
                              <div className={`flex items-center space-x-2 ${statusColor}`}>
                                {statusIcon}
                                <span className="text-sm font-bold truncate">
                                  {statusText}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {studentStats.remaining === 0 && studentStats.completed > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
                  <h4 className="text-lg font-semibold text-green-800 mb-1">
                    Tous les tests sont terminés !
                  </h4>
                  <p className="text-green-600 text-sm">
                    Cet élève a effectué tous les tests physiques pour l'année {selectedSchoolYear}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des classes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Erreur</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  if (!selectedClass) {
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
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Gestion des Classes</h1>
            <p className="text-gray-600">Sélectionnez une classe pour voir et modifier les résultats des élèves</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <Calendar className="text-blue-600" size={20} />
              <span className="text-gray-700">Classes et élèves pour</span>
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

          {classes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
              <BookOpen size={64} className="mx-auto text-yellow-500 mb-6" />
              <h3 className="text-2xl font-semibold text-yellow-800 mb-4">
                Aucune classe pour {selectedSchoolYear}
              </h3>
              <p className="text-yellow-700 mb-8 text-lg">
                Commencez par créer des classes pour cette année scolaire, ou utilisez le bouton "Dupliquer année" 
                dans le header pour copier la structure d'une année précédente.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-8 py-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold text-lg transition-colors"
                >
                  Créer la première classe
                </button>
                <p className="text-yellow-600">
                  Ou utilisez le menu "Dupliquer année" dans le header pour importer une structure existante
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {Object.entries(classesByLevel).map(([level, levelClasses]) => (
                levelClasses.length > 0 && (
                  <div key={level} className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).dot}`}></div>
                        <h2 className={`text-xl font-bold ${getLevelColors(level).text}`}>
                          {level}
                        </h2>
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).dot}`}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {levelClasses.map((classe) => {
                        const colors = getLevelColors(classe.level);
                        const studentCount = studentsCount[classe.id] || 0;
                        
                        return (
                          <div key={classe.id} className="relative">
                            <button
                              onClick={() => setSelectedClass(classe)}
                              className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                            >
                              <div className={`text-2xl font-bold mb-4 ${colors.text}`}>
                                {classe.level.charAt(0)}{classe.name}
                              </div>
                              
                              <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80 mb-3`}>
                                <Users size={16} />
                                <span>
                                  {studentCount} élève{studentCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              <div className={`text-sm ${colors.text} opacity-75`}>
                                Cliquer pour gérer la classe
                              </div>
                            </button>
                            
                            <button
                              onClick={(e) => deleteClass(classe, e)}
                              className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-700 hover:bg-white hover:bg-opacity-90 rounded-full transition-all duration-200"
                              title={`Supprimer la classe ${classe.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setNewClassData({ name: '', level: level });
                        setShowCreateClassModal(true);
                      }}
                      className={`w-full p-4 border-2 border-dashed ${getLevelColors(level).border} ${getLevelColors(level).bg} ${getLevelColors(level).hover} rounded-xl transition-all duration-300 text-center`}
                    >
                      <Plus className={`mx-auto mb-2 ${getLevelColors(level).text}`} size={20} />
                      <span className={`text-sm ${getLevelColors(level).text}`}>
                        Ajouter classe {level}
                      </span>
                    </button>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Créer une nouvelle classe
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la classe
                  </label>
                  <input
                    type="text"
                    value={newClassData.name}
                    onChange={(e) => setNewClassData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: A, B, 1, 2..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    value={newClassData.level}
                    onChange={(e) => setNewClassData(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="6ème">6ème</option>
                    <option value="5ème">5ème</option>
                    <option value="4ème">4ème</option>
                    <option value="3ème">3ème</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    La classe sera créée pour l'année scolaire <strong>{selectedSchoolYear}</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateClassModal(false);
                    setNewClassData({ name: '', level: '6ème' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createClass}
                  disabled={!newClassData.name.trim()}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Créer la classe
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => {
              setSelectedClass(null);
              setStudents([]);
            }}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft size={18} />
            <span>Retour aux classes</span>
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {selectedClass.level.charAt(0)}{selectedClass.name}
            </h2>
            <p className="text-gray-600 flex items-center space-x-2">
              <Calendar size={16} />
              <span>Année scolaire</span>
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {selectedSchoolYear}
              </span>
              <span>•</span>
              <span>{filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handlePrintAllSheets}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Printer size={18} />
              <span>Fiches Classe</span>
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload size={18} />
              <span>Importer Excel</span>
            </button>
            
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={18} />
              <span>Ajouter élève</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un élève..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid size={16} />
            <span>Grille</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={16} />
            <span>Tableau</span>
          </button>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Aucun élève trouvé' : 'Aucun élève dans cette classe'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Essayez de modifier votre recherche'
              : `Commencez par ajouter des élèves à la classe ${selectedClass.name} pour l'année ${selectedSchoolYear}`
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Ajouter le premier élève
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredStudents.map((student) => {
                const studentStats = getStudentStats(student);
                
                const getProgressColor = (percentage) => {
                  if (percentage === 100) return 'bg-green-500';
                  if (percentage >= 75) return 'bg-green-400';
                  if (percentage >= 50) return 'bg-yellow-400';
                  if (percentage >= 25) return 'bg-orange-400';
                  return 'bg-red-400';
                };

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
                  >
                    <div className="text-center mb-3">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                        {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                      </div>
                      <div className="font-bold text-gray-800 text-sm">
                        {student.last_name}
                      </div>
                      <div className="font-medium text-gray-600 text-sm">
                        {student.first_name}
                      </div>
                    </div>
                
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {studentStats.completed}/{studentStats.total} tests réalisés
                        </span>
                        <span className="text-xs font-bold text-gray-600">
                          {studentStats.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(studentStats.percentage)}`}
                          style={{ width: `${studentStats.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2 flex-shrink-0" />
                        <span className="truncate">
                          {formatBirthDate(student.birth_date)}
                        </span>
                      </div>

                      {student.gender && (
                        <div className="flex items-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getGenderColor(student.gender)}`}>
                            {student.gender === 'M' ? 'Garçon' : 
                             student.gender === 'F' ? 'Fille' : 
                             student.gender}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center text-sm">
                        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {student.school_year || selectedSchoolYear}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handlePrintStudentSheet(student)}
                        className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-md transition-colors"
                        title="Imprimer fiche élève"
                      >
                        <FileText size={16} />
                      </button>
                      
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                        title="Voir les résultats de l'élève"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <button
                        onClick={() => openEditStudent(student)}
                        className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-md transition-colors"
                        title="Modifier l'élève"
                      >
                        <Edit3 size={16} />
                      </button>
                      
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                        title="Supprimer l'élève"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Élève
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de naissance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Genre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Année scolaire
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatBirthDate(student.birth_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.gender ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.gender === 'Garçon' || student.gender === 'M' 
                                ? 'bg-blue-100 text-blue-800' 
                                : student.gender === 'Fille' || student.gender === 'F'
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.gender === 'M' ? 'Garçon' : 
                               student.gender === 'F' ? 'Fille' : 
                               student.gender}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Non renseigné</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.school_year || selectedSchoolYear}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handlePrintStudentSheet(student)}
                            className="text-purple-600 hover:text-purple-900 mr-3"
                            title="Fiche élève"
                          >
                            <FileText size={16} />
                          </button>
                          
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Voir les résultats"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => openEditStudent(student)}
                            className="text-orange-600 hover:text-orange-900 mr-3"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                          
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {selectedStudent && <StudentDetailView student={selectedStudent} />}

      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Ajouter un élève à la classe {selectedClass.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Prénom de l'élève"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Nom de l'élève"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={newStudent.birthDate}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre
                </label>
                <select
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Garçon</option>
                  <option value="F">Fille</option>
                </select>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  L'élève sera ajouté à la classe <strong>{selectedClass.name}</strong> pour l'année <strong>{selectedSchoolYear}</strong>
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setNewStudent({ firstName: '', lastName: '', birthDate: '', gender: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addStudent}
                disabled={!newStudent.firstName.trim() || !newStudent.lastName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Ajouter l'élève
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Modifier l'élève
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={editingStudent.firstName}
                  onChange={(e) => setEditingStudent(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Prénom de l'élève"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={editingStudent.lastName}
                  onChange={(e) => setEditingStudent(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Nom de l'élève"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={editingStudent.birthDate}
                  onChange={(e) => setEditingStudent(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre
                </label>
                <select
                  value={editingStudent.gender}
                  onChange={(e) => setEditingStudent(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Garçon</option>
                  <option value="F">Fille</option>
                </select>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-orange-700 text-sm">
                  Modification de l'élève dans la classe <strong>{selectedClass.name}</strong> pour l'année <strong>{selectedSchoolYear}</strong>
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditStudentModal(false);
                  setEditingStudent(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={updateStudent}
                disabled={!editingStudent.firstName.trim() || !editingStudent.lastName.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Modifier l'élève
              </button>
            </div>
          </div>
        </div>
      )}

      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        selectedClass={selectedClass}
        existingStudents={students}
        onStudentsAdded={handleStudentsAdded}
      />

      {showStudentSheet && (
        <StudentSheetGenerator
          student={showStudentSheet}
          selectedClass={selectedClass}
          tests={tests}
          results={results}
          onClose={() => setShowStudentSheet(null)}
        />
      )}

      {showAllSheetsPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold">Aperçu des fiches - {selectedClass.level.charAt(0)}{selectedClass.name}</h2>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Printer size={18} />
                Imprimer toutes les fiches
              </button>
              <button
                onClick={() => setShowAllSheetsPreview(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {students.map((student, index) => (
              <div key={student.id} style={{ pageBreakBefore: index > 0 ? 'always' : 'auto' }}>
                <StudentSheetGenerator
                  student={student}
                  selectedClass={selectedClass}
                  tests={tests}
                  results={results}
                  onClose={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="text-green-600" size={16} />
          <p className="text-sm text-green-700">
            <strong>Nouvelles fonctionnalités :</strong> Cliquez sur l'icône "fiche" 📄 pour générer une fiche individuelle à imprimer, 
            ou utilisez "Fiches Classe" 🖨️ pour imprimer toutes les fiches d'un coup !
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClassManagementSupabase;