import { useState, useEffect, useCallback } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark';
    } catch (error) {
      console.error('Error getting theme from localStorage:', error);
      return false;
    }
  });

  // Apply theme classes to DOM
  const applyThemeClasses = useCallback((darkMode) => {
    console.log('Applying theme:', darkMode ? 'dark' : 'light');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      // Dark mode background
      document.body.style.backgroundColor = '#0f172a';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      // Light mode background - pure white
      document.body.style.backgroundColor = '#ffffff';
    }
    
    console.log('Applied - HTML classes:', document.documentElement.classList.toString());
    console.log('Applied - Body classes:', document.body.classList.toString());
    console.log('Applied - Body background:', document.body.style.backgroundColor);
  }, []);

  // Store theme in localStorage
  const storeTheme = useCallback((theme) => {
    try {
      localStorage.setItem('theme', theme);
      console.log('Theme stored:', theme);
    } catch (error) {
      console.error('Error storing theme:', error);
    }
  }, []);

  // Apply theme on state change
  useEffect(() => {
    applyThemeClasses(isDarkMode);
    storeTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, applyThemeClasses, storeTheme]);

  const toggleTheme = useCallback(() => {
    console.log('Toggle clicked - current state:', isDarkMode);
    setIsDarkMode(prev => {
      const newTheme = !prev;
      console.log('Setting new theme state to:', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  }, [isDarkMode]);

  return {
    isDarkMode,
    toggleTheme
  };
};
