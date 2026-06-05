import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const Sidebar = ({ activeView, setActiveView, isSidebarOpen, setIsSidebarOpen }) => {
  const [showBrokieModal, setShowBrokieModal] = useState(false);

  const navItems = [
    { id: 'home', icon: 'fa-house', label: 'Home' },
    { id: 'view-channel', icon: 'fa-chart-simple', label: 'Channel Analyzer' },
    { id: 'view-ideas', icon: 'fa-lightbulb', label: 'Trending Ideas', isRegular: true },
    { id: 'view-keyword', icon: 'fa-magnifying-glass', label: 'Keyword Explorer' },
    { id: 'view-niche', icon: 'fa-crosshairs', label: 'Niche Validator' },
    { id: 'view-script', icon: 'fa-pen-nib', label: 'AI Script Writer' },
    { id: 'view-thumbnail', icon: 'fa-image', label: 'Thumbnail Analyzer', isRegular: true },
    { id: 'view-tags', icon: 'fa-tags', label: 'Tags Generator', isRegular: false },
    { id: 'view-community', icon: 'fa-users-rectangle', label: 'Community Posts', isRegular: false },
    { id: 'view-description', icon: 'fa-file-lines', label: 'Description Generator', isRegular: false },
  ];

  return (
    <>
    <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="logo-container" style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', padding: '20px 0', marginBottom: '10px' }}>
          
          {/* Mobile Close Button */}
          <button 
            className="mobile-close-btn"
            onClick={() => setIsSidebarOpen(false)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0, padding: 0, width: '100%' }}>
            <i className="fa-brands fa-youtube" style={{ color: '#ff2a2a', filter: 'drop-shadow(0 0 8px rgba(255, 42, 42, 0.75))', fontSize: '1.6rem' }}></i>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', letterSpacing: '1px', color: 'var(--text-bright)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
              VID SCOUT <span style={{ color: '#a855f7', textShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>AI</span>
            </h1>
          </div>
        </div>
        
        <nav className="nav-menu" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <a 
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`} 
              onClick={() => setActiveView(item.id)}
              style={{ fontSize: '13px', padding: '11px 18px', gap: '11px', fontWeight: '600' }}
            >
              <i className={item.isRegular ? `fa-regular ${item.icon}` : `fa-solid ${item.icon}`} style={{ fontSize: '14px' }}></i>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '16px 14px', marginTop: 'auto' }}>
          <div 
            onClick={() => setShowBrokieModal(true)}
            style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(255, 42, 42, 0.1))', 
            border: '1px solid rgba(168, 85, 247, 0.4)', 
            borderRadius: '10px', 
            padding: '12px', 
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(168, 85, 247, 0.15)',
            transition: 'all 0.3s'
          }} className="premium-hover-card">
            <h4 style={{ color: '#fff', fontSize: '0.82rem', fontWeight: '700', margin: '0 0 3px 0', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <i className="fa-solid fa-crown" style={{ color: '#fbbf24' }}></i>
              Go Premium
            </h4>
            <p style={{ color: '#c084fc', fontSize: '0.72rem', margin: 0, fontWeight: '500' }}>
              Unlock unlimited AI features ✨
            </p>
          </div>
        </div>
      </div>
    </aside>

    {showBrokieModal && createPortal(
      <div 
        onClick={() => setShowBrokieModal(false)}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#0f0f13',
            padding: '50px 60px',
            borderRadius: '24px',
            border: '2px solid #ff2a2a',
            boxShadow: '0 0 50px rgba(255, 42, 42, 0.5), inset 0 0 20px rgba(255, 42, 42, 0.2)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            alignItems: 'center',
            transform: 'scale(1)',
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
          }}
        >
          <style>
            {`
              @keyframes popIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}
          </style>
          <i className="fa-solid fa-skull" style={{ fontSize: '3rem', color: '#ff2a2a', marginBottom: '10px' }}></i>
          <h2 style={{ color: '#fff', fontSize: '2.8rem', margin: 0, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Shutt up Brokie
          </h2>
          <p style={{ color: '#a855f7', fontSize: '1.3rem', margin: 0, fontWeight: '700' }}>
            Use it for free
          </p>
          <button 
            onClick={() => setShowBrokieModal(false)}
            style={{
              marginTop: '20px',
              padding: '12px 30px',
              background: 'linear-gradient(90deg, #ff2a2a, #a855f7)',
              color: '#fff',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(255, 42, 42, 0.3)'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Okay 😢
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default Sidebar;
