import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsList from './components/ResultsList_New';
import PreviewPane from './components/PreviewPane_New';
import PodcastButton from './components/PodcastButton';
import CompactPodcastPlayer from './components/CompactPodcastPlayer';
import { useTheme } from './hooks/useTheme';
import { useUIState } from './hooks/useUIState';
import { useSearch } from './hooks/useSearch';
import Login from './components/Login';
import './index.css';
import './styles/glassmorphism.css';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const { isDarkMode } = useTheme();
  const {
    coPilotActive,
    activeTab,
    collapsedSections,
    searchQuery,
    toggleCoPilot,
    switchTab,
    toggleSection,
    setSearchQuery
  } = useUIState();
  
  const { results, isSearching, search, clearResults } = useSearch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryFile, setAiSummaryFile] = useState('');
  
  // Podcast state
  const [showPodcastPlayer, setShowPodcastPlayer] = useState(false);
  const [isPodcastGenerating, setIsPodcastGenerating] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      // Clear results when search is empty
      clearResults();
      return;
    }
    
    if (searchQuery.trim().length < 2) {
      // Don't search for very short queries
      return;
    }

    const timeoutId = setTimeout(() => {
      search(searchQuery.trim());
    }, 300); // Reduced debounce time for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [searchQuery, search, clearResults]);

  const handleResultSelect = (result) => {
    console.log('Selected result:', result);
    // Set the selected file and switch to preview tab
    setSelectedFile(result);
    switchTab('preview');
  };

  const handleSummaryGenerated = (filePath, fileName, summary) => {
    setAiSummary(summary);
    setAiSummaryFile(fileName);
    switchTab('insight'); // Switch to AI Insights tab
  };

  const handlePodcastClick = () => {
    console.log('🎧 Podcast button clicked');
    setShowPodcastPlayer(true);
  };

  const handleClosePodcastPlayer = () => {
    setShowPodcastPlayer(false);
    setIsPodcastGenerating(false);
  };

  // Function to extract selected text from the page
  const getSelectedText = () => {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  };

  // Update selected text when user makes a selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selected = getSelectedText();
      if (selected && selected.length > 10) {
        setSelectedText(selected);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className={`h-screen overflow-hidden font-inter transition-all duration-500 ${isDarkMode ? 'dark cyber-grid' : ''}`}>
      {/* Global Header Bar */}
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={user}
        onLogout={() => { localStorage.removeItem('user'); setUser(null); }}
      />

      {/* Main Layout Container */}
      <div className="flex h-[calc(100vh-60px)] w-full">
        {/* Left Sidebar */}
        <Sidebar 
          coPilotActive={coPilotActive}
          onToggleCoPilot={toggleCoPilot}
          collapsedSections={collapsedSections}
          onToggleSection={toggleSection}
        />

        {/* Central Results Panel */}
        <ResultsList 
          results={results}
          query={searchQuery}
          isSearching={isSearching}
          onResultSelect={handleResultSelect}
          onSummaryGenerated={handleSummaryGenerated}
        />

        {/* Right Preview Pane */}
        <PreviewPane 
          activeTab={activeTab}
          onTabSwitch={switchTab}
          selectedFile={selectedFile}
          aiSummary={aiSummary}
          aiSummaryFile={aiSummaryFile}
        />
      </div>

      {/* Floating Podcast Button - Only show when player is not active */}
      {!showPodcastPlayer && (
        <PodcastButton
          onClick={handlePodcastClick}
          currentDocument={selectedFile}
          selectedText={selectedText}
          recommendations={results}
          isVisible={true}
          isGenerating={isPodcastGenerating}
          setIsGenerating={setIsPodcastGenerating}
        />
      )}

      {/* Compact Podcast Player */}
      {showPodcastPlayer && (
        <CompactPodcastPlayer
          selectedText={selectedText || (selectedFile?.text || selectedFile?.content || '')}
          relatedSections={results}
          currentDocument={selectedFile}
          onClose={handleClosePodcastPlayer}
          isVisible={true}
        />
      )}
    </div>
  );
}

export default App;
