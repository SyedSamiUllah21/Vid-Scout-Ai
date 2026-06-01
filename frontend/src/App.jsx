import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChannelAnalyzer from './components/ChannelAnalyzer';
import TrendingIdeas from './components/TrendingIdeas';
import KeywordExplorer from './components/KeywordExplorer';
import NicheValidator from './components/NicheValidator';
import AIScriptWriter from './components/AIScriptWriter';
import ThumbnailAnalyzer from './components/ThumbnailAnalyzer';
import TagsGenerator from './components/TagsGenerator';
import CommunityPosts from './components/CommunityPosts';
import DescriptionGenerator from './components/DescriptionGenerator';
import Home from './components/Home';
import AuroraBackground from './components/AuroraBackground';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to change view and automatically close sidebar on mobile
  const handleNavClick = (view) => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };



  return (
    <div className="app-container">
      {/* Aurora starfield background — shown on all tool pages */}
      {activeView !== 'home' && <AuroraBackground />}
      {/* Mobile Header (Visible on ALL pages on mobile) */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="mobile-logo">
          <i className="fa-brands fa-youtube" style={{ color: '#ff2a2a', marginRight: '8px' }}></i> 
          VID SCOUT AI
        </div>
      </div>

      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && activeView !== 'home' && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {activeView !== 'home' && (
        <Sidebar 
          activeView={activeView} 
          setActiveView={handleNavClick} 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      )}
      
      <div className="main-wrapper">
        <main className="main-content">
          {/* Home is conditionally rendered — no persistent state needed */}
          {activeView === 'home' && <Home setActiveView={setActiveView} />}

          {/* All tool views stay mounted once the user first visits them.
              We hide them with display:none instead of unmounting so that
              their local state (results, inputs, etc.) is never lost. */}
          <div style={{ display: activeView === 'view-channel' ? 'contents' : 'none' }}>
            <ChannelAnalyzer />
          </div>
          <div style={{ display: activeView === 'view-ideas' ? 'contents' : 'none' }}>
            <TrendingIdeas />
          </div>
          <div style={{ display: activeView === 'view-keyword' ? 'contents' : 'none' }}>
            <KeywordExplorer />
          </div>
          <div style={{ display: activeView === 'view-niche' ? 'contents' : 'none' }}>
            <NicheValidator />
          </div>
          <div style={{ display: activeView === 'view-script' ? 'contents' : 'none' }}>
            <AIScriptWriter />
          </div>
          <div style={{ display: activeView === 'view-thumbnail' ? 'contents' : 'none' }}>
            <ThumbnailAnalyzer />
          </div>
          <div style={{ display: activeView === 'view-tags' ? 'contents' : 'none' }}>
            <TagsGenerator />
          </div>
          <div style={{ display: activeView === 'view-community' ? 'contents' : 'none' }}>
            <CommunityPosts />
          </div>
          <div style={{ display: activeView === 'view-description' ? 'contents' : 'none' }}>
            <DescriptionGenerator />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
