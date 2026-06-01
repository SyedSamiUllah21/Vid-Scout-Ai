import React, { useState } from 'react';
import { requestJson } from '../lib/api';

const tagColors = [
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#22c55e', // Green
  '#eab308', // Yellow
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

const TagsGenerator = () => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const themeColor = '#ec4899'; // Pink aesthetic

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError("Please enter a video title first.");
      return;
    }

    setLoading(true);
    setError(null);
    setTags([]);
    setCopied(false);

    try {
      const data = await requestJson('/api/tags-generate', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      
      if (data.tags && Array.isArray(data.tags)) {
        setTags(data.tags);
      } else {
        throw new Error(data.error || "Invalid response format from server.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTags = () => {
    if (tags.length === 0) return;
    const tagsString = tags.join(', ');
    navigator.clipboard.writeText(tagsString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="tool-view active">
      {tags.length === 0 ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          
          <div className="top-badge">
            <i className="fa-solid fa-tags"></i> VIRAL TAGS GENERATOR
          </div>
          
          <h1 className="hero-title">
            Hack The <span className="gradient-text">Algorithm.</span>
          </h1>
          
          <p className="hero-subtitle">
            Our AI will analyze your title and generate 15-20 highly searchable, SEO-optimized tags designed to maximize your video's reach and discoverability.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon" style={{ borderColor: 'rgba(236, 72, 153, 0.5)', boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)' }}>
              <i className="fa-solid fa-tags" style={{ color: themeColor }}></i>
            </div>
            
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(236, 72, 153, 0.1)' }}>
              
              <div className="form-group">
                <label className="form-label">VIDEO TITLE</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-heading" style={{ color: themeColor }}></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g., How to Build a PC for Beginners (2024)"
                    style={{ borderColor: 'rgba(236, 72, 153, 0.15)' }}
                  />
                </div>
                <span className="input-hint">Enter your exact video title so we can generate highly targeted SEO tags.</span>
              </div>

              <button 
                className="btn-generate" 
                onClick={handleGenerate} 
                disabled={loading}
                style={{ 
                  background: `linear-gradient(to right, ${themeColor}, #be185d)`,
                  boxShadow: `0 4px 15px ${themeColor}60`
                }}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span className="btn-text">{loading ? 'Generating Viral Tags...' : 'Generate Viral Tags'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(236, 72, 153, 0.1)' }}><i className="fa-solid fa-fire"></i></div>
                  <div className="feature-text">
                    <h5>Viral Potential</h5>
                    <p>High-ranking algorithms</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(236, 72, 153, 0.1)' }}><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                  <div className="feature-text">
                    <h5>SEO Optimized</h5>
                    <p>Searchable keywords</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(236, 72, 153, 0.1)' }}><i className="fa-solid fa-copy"></i></div>
                  <div className="feature-text">
                    <h5>1-Click Export</h5>
                    <p>Ready for YouTube Studio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-note">
            <i className="fa-solid fa-lock"></i>
            Designed to match real-time YouTube ranking algorithms.
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <button className="dash-back-btn" onClick={() => setTags([])}>← Back to Generator</button>
          
          <div className="results-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '32px', animation: 'fadeIn 0.5s ease', borderLeft: `3px solid #a855f7`, boxShadow: `-4px 0 15px -4px rgba(168, 85, 247, 0.2)`, background: '#000000' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)' }}>
                    <i className="fa-solid fa-fire" style={{ color: '#ec4899', fontSize: '1.2rem' }}></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', margin: 0 }}>Optimized Tags</h2>
                      <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid rgba(168, 85, 247, 0.3)' }}>{tags.length} generated</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0, maxWidth: '400px', lineHeight: '1.5' }}>These SEO-optimized tags are tailored for your video to help boost visibility and reach a wider audience.</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleCopyTags}
                  style={{
                    padding: '12px 24px',
                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #a855f7, #7e22ce)',
                    color: copied ? '#4ade80' : '#fff',
                    border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.4)' : 'transparent'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: copied ? 'none' : '0 4px 15px rgba(168, 85, 247, 0.4)'
                  }}
                >
                  {copied ? (
                    <><i className="fa-solid fa-check"></i> Copied to Clipboard!</>
                  ) : (
                    <><i className="fa-regular fa-copy"></i> Copy All for YouTube</>
                  )}
                </button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#fff', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '1px' }}>
                  <i className="fa-solid fa-tag" style={{ color: '#a855f7' }}></i> TAGS
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
                  {tags.map((tag, idx) => {
                    const color = tagColors[idx % tagColors.length];
                    return (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 18px',
                          background: 'transparent',
                          color: '#fff',
                          border: `1px solid ${color}`,
                          borderRadius: '25px',
                          fontSize: '0.9rem',
                          boxShadow: `inset 0 0 10px ${color}15, 0 0 10px ${color}10`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {tag}
                        <i 
                          className="fa-solid fa-xmark" 
                          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', transition: 'color 0.2s' }} 
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                          onMouseEnter={(e) => e.target.style.color = '#fff'}
                          onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.4)'}
                        ></i>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '20px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8b4fe' }}>
                      <i className="fa-solid fa-info" style={{ fontSize: '0.8rem' }}></i>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, maxWidth: '380px', lineHeight: '1.5' }}>
                      These tags are comma-separated when copied, meaning you can paste them directly into the YouTube Studio tags box.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8b4fe' }}>
                      <i className="fa-regular fa-copy"></i>
                    </div>
                    <span style={{ color: 'rgba(168, 85, 247, 0.5)', letterSpacing: '3px', fontWeight: '300' }}>----&gt;</span>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', width: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <i className="fa-brands fa-youtube" style={{ color: '#ff0000', fontSize: '1.1rem' }}></i>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '-0.3px' }}>YouTube Studio</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                        Add tags
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TagsGenerator;
