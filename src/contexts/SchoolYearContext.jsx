// src/contexts/SchoolYearContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const SchoolYearContext = createContext();

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error('useSchoolYear must be used within a SchoolYearProvider');
  }
  return context;
};

// Fonction utilitaire pour générer les années scolaires
const generateSchoolYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  // Générer les 6 dernières années + 2 années futures
  for (let i = -6; i <= 2; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    years.push(`${startYear}-${endYear}`);
  }
  
  return years.reverse(); // Plus récente en premier
};

// Fonction pour déterminer l'année scolaire actuelle
const getCurrentSchoolYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Si nous sommes entre septembre et décembre, l'année scolaire a commencé cette année
  // Si nous sommes entre janvier et août, l'année scolaire a commencé l'année précédente
  if (month >= 9) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
};

export const SchoolYearProvider = ({ children }) => {
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(getCurrentSchoolYear());
  const [availableYears, setAvailableYears] = useState(generateSchoolYears());

  // Fonction pour créer une nouvelle année scolaire
  const createNewSchoolYear = (newYear) => {
    if (!availableYears.includes(newYear)) {
      setAvailableYears(prev => [newYear, ...prev].sort().reverse());
    }
    setSelectedSchoolYear(newYear);
  };

  // Fonction pour dupliquer les données d'une année vers une autre
  const duplicateYearData = async (fromYear, toYear) => {
    // Cette fonction sera implémentée plus tard avec les appels Supabase
    console.log(`Duplication des données de ${fromYear} vers ${toYear}`);
    return { success: true, message: `Données dupliquées de ${fromYear} vers ${toYear}` };
  };

  const value = {
    selectedSchoolYear,
    setSelectedSchoolYear,
    availableYears,
    createNewSchoolYear,
    duplicateYearData,
    currentSchoolYear: getCurrentSchoolYear()
  };

  return (
    <SchoolYearContext.Provider value={value}>
      {children}
    </SchoolYearContext.Provider>
  );
};