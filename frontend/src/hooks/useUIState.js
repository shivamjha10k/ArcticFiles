import { useState } from 'react';

export const useUIState = () => {
  const [coPilotActive, setCoPilotActive] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const [collapsedSections, setCollapsedSections] = useState({
    projects: false,
    memory: false,
    addDirectory: false
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCoPilot = () => {
    setCoPilotActive(!coPilotActive);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Here you would typically trigger the search API call
  };

  return {
    coPilotActive,
    activeTab,
    collapsedSections,
    searchQuery,
    toggleCoPilot,
    switchTab,
    toggleSection,
    handleSearch,
    setSearchQuery
  };
};
