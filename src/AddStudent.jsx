import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Calendar, Mail, Users, UserPlus, AlertCircle } from 'lucide-react';

const AddStudent = ({ isOpen, onClose, selectedClass, selectedYear, existingStudents, onAddStudent, editingStudent }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ajout du ref pour le focus
  const firstInputRef = useRef(null);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingStudent) {
        // Mode édition - pré-remplir les champs
        setFormData({
          firstName: editingStudent.firstName || '',
          lastName: editingStudent.lastName || '',
          birthDate: editingStudent.birthDate || '',
          gender: editingStudent.gender || '',
          email: editingStudent.email || ''
        });
      } else {
        // Mode ajout - formulaire vide
        setFormData({
          firstName: '',
          lastName: '',
          birthDate: '',
          gender: '',
          email: ''
        });
      }
      setErrors({});
      
      // Délai pour s'assurer que le modal est rendu avant de donner le focus
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, editingStudent]);

  // Get class color based on level
  const getClassColor = (level) => {
    const colors = {
      '6ème': 'emerald',
      '5ème': 'blue', 
      '4ème': 'orange',
      '3ème': 'purple'
    };
    return colors[level] || 'gray';
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
      blue: 'border-blue-500 bg-blue-50 text-blue-700',
      orange: 'border-orange-500 bg-orange-50 text-orange-700',
      purple: 'border-purple-500 bg-purple-50 text-purple-700',
      gray: 'border-gray-500 bg-gray-50 text-gray-700'
    };
    return colors[color];
  };

  // Capitalize name automatically
  const capitalizeName = (name) => {
    return name.toUpperCase();
  };

  // Check for duplicates
  const checkDuplicate = useCallback((firstName, lastName) => {
    const normalizedFirst = firstName.trim().toLowerCase();
    const normalizedLast = lastName.trim().toLowerCase();
    
    return existingStudents.some(student => 
      student.firstName.toLowerCase() === normalizedFirst && 
      student.lastName.toLowerCase() === normalizedLast &&
      (!editingStudent || student.id !== editingStudent.id) // Exclure l'élève en cours d'édition
    );
  }, [existingStudents, editingStudent]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est obligatoire';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est obligatoire';
    }
    if (!formData.birthDate) {
      newErrors.birthDate = 'La date de naissance est obligatoire';
    }
    if (!formData.gender) {
      newErrors.gender = 'Le sexe est obligatoire';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Duplicate check
    if (formData.firstName.trim() && formData.lastName.trim()) {
      if (checkDuplicate(formData.firstName.trim(), formData.lastName.trim())) {
        newErrors.duplicate = 'Cet élève existe déjà dans cette classe';
      }
    }

    // Age validation (approximate)
    if (formData.birthDate) {
      const birthYear = new Date(formData.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age < 10 || age > 18) {
        newErrors.birthDate = 'Âge inapproprié pour un collégien (10-18 ans)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, checkDuplicate]);

  // Optimisation de handleInputChange avec useCallback
  const handleInputChange = useCallback((field, value) => {
    let processedValue = value;
    
    // Auto-capitalize names
    if (field === 'lastName') {
      processedValue = capitalizeName(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Clear error when user starts typing
    setErrors(prev => {
      if (prev[field]) {
        return {
          ...prev,
          [field]: ''
        };
      }
      return prev;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const newStudent = {
        id: Date.now(), // Temporary ID, will be replaced by Supabase later
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        email: formData.email.trim() || null,
        classId: selectedClass.id,
        year: selectedYear,
        createdAt: new Date().toISOString()
      };

      await onAddStudent(newStudent);
      
      // Reset form only if adding (not editing)
      if (!editingStudent) {
        setFormData({
          firstName: '',
          lastName: '',
          birthDate: '',
          gender: '',
          email: ''
        });
        setErrors({});
      }
      // If editing, the modal will close automatically via the parent component
      
    } catch (error) {
      setErrors({ submit: 'Erreur lors de l\'ajout de l\'élève' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedClass) return null;

  const classColor = getClassColor(selectedClass.level);
  const colorClasses = getColorClasses(classColor);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header with class color */}
        <div className={`p-4 border-b-2 ${colorClasses} flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <UserPlus size={20} />
            <div>
              <h3 className="font-semibold">
                {editingStudent ? 'Modifier l\'élève' : 'Ajouter un élève'}
              </h3>
              <p className="text-sm opacity-80">{selectedClass.name} - {selectedYear}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Duplicate/General error */}
          {(errors.duplicate || errors.submit) && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              <span>{errors.duplicate || errors.submit}</span>
            </div>
          )}

          {/* First Name - AJOUT DE REF ET AUTOFOCUS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              Prénom *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              autoFocus
              autoComplete="given-name"
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Prénom de l'élève"
            />
            {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              Nom *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              autoComplete="family-name"
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="NOM (en majuscules)"
            />
            {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={14} className="inline mr-1" />
              Date de naissance *
            </label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              autoComplete="bday"
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.birthDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.birthDate && <p className="text-red-600 text-xs mt-1">{errors.birthDate}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users size={14} className="inline mr-1" />
              Sexe *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            {errors.gender && <p className="text-red-600 text-xs mt-1">{errors.gender}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" />
              Email <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              autoComplete="email"
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="email@exemple.com"
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            <p className="text-xs text-gray-500 mt-1">L'élève peut remplir son email plus tard</p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : `bg-${classColor}-600 hover:bg-${classColor}-700`
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{editingStudent ? 'Modification...' : 'Ajout...'}</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>{editingStudent ? 'Modifier' : 'Ajouter'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudent;