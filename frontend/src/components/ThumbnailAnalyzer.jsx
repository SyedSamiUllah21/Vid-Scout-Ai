import React, { useState, useRef } from 'react';
import { requestJson } from '../lib/api';

const ThumbnailAnalyzer = () => {
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG/JPG)');
      return;
    }
    setImageFile(file);
    setError(null);

    // Create Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64('');
  };

  const generate = async () => {
    if (!title) {
      setError('Please enter the video title');
      return;
    }
    if (!imageBase64) {
      setError('Please upload a thumbnail image to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson('/api/thumbnail-analyze', {
        method: 'POST',
        body: JSON.stringify({ title, image: imageBase64 }),
      }, 120000);
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    const r = String(rating).toLowerCase();
    if (r.includes('excel') || r.includes('good') || r.includes('great')) return '#22c55e'; // Green
    if (r.includes('need') || r.includes('work') || r.includes('improve')) return '#ef4444'; // Red
    return '#eab308'; // Yellow
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <section className="tool-view active">
      {!results ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <div className="top-badge">
            <i className="fa-solid fa-image"></i> THUMBNAIL ANALYZER
          </div>
          <h1 className="hero-title">
            Analyze Visuals. <span className="gradient-text">Boost CTR.</span>
          </h1>
          <p className="hero-subtitle">
            Upload your thumbnail image to test readability, color contrast, psychological emotional hook,<br />
            and overall audience clickability using custom vision models.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon" style={{ borderColor: 'rgba(234, 179, 8, 0.5)', boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)' }}>
              <i className="fa-solid fa-image" style={{ color: '#eab308' }}></i>
            </div>
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(234, 179, 8, 0.1)' }}>
              
              <div className="form-group">
                <label className="form-label">VIDEO TITLE CONTEXT</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-heading" style={{ color: '#eab308' }}></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter the title of the video this thumbnail belongs to..." 
                    style={{ borderColor: 'rgba(234, 179, 8, 0.15)' }}
                  />
                </div>
                <span className="input-hint">The AI will analyze how well the thumbnail matches and supports the video title.</span>
              </div>

              <div className="form-group">
                <label className="form-label">THUMBNAIL IMAGE</label>
                
                {!imagePreview ? (
                  <div 
                    className="drop-zone"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}
                  >
                    <i className="fa-regular fa-image" style={{ fontSize: '2.5rem', color: 'rgba(234, 179, 8, 0.5)', marginBottom: '12px' }}></i>
                    <p className="drop-text">Drag and drop your image here, or <strong style={{ color: '#eab308' }}>browse files</strong></p>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>Supports PNG, JPG, JPEG</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img 
                      src={imagePreview} 
                      alt="Thumbnail Preview" 
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'contain' }}
                    />
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{imageFile?.name}</span>
                      <button 
                        onClick={removeImage}
                        style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-trash-can"></i> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                className="btn-generate" 
                onClick={generate} 
                disabled={loading}
                style={{ 
                  background: 'linear-gradient(to right, #eab308, #ca8a04)',
                  boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)'
                }}
              >
                <i className="fa-solid fa-eye"></i>
                <span className="btn-text">{loading ? 'Analyzing Pixels...' : 'Analyze Clickability'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}><i className="fa-solid fa-font"></i></div>
                  <div className="feature-text">
                    <h5>Readability Index</h5>
                    <p>Mobile font clarity scan</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}><i className="fa-solid fa-palette"></i></div>
                  <div className="feature-text">
                    <h5>Contrast Scoring</h5>
                    <p>Hue & glow highlights</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}><i className="fa-solid fa-face-smile"></i></div>
                  <div className="feature-text">
                    <h5>Emotional Appeal</h5>
                    <p>Psychology analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-note">
            <i className="fa-solid fa-lock"></i>
            Uses AI vision models to simulate user scrolling reactions.
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <button className="dash-back-btn" onClick={() => setResults(null)}>← Back to Analyzer</button>
          
          <div className="results-container" style={{ width: '100%' }}>
            
            {/* Top Hero Section */}
            <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr 1fr', gap: '40px', padding: '32px', alignItems: 'center' }}>
              
              {/* Left: Thumbnail Image */}
              <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <img 
                  src={imagePreview} 
                  alt="Thumbnail" 
                  style={{ width: '100%', height: 'auto', borderRadius: '12px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Middle: Title & Score Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Video Title</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '6px', marginBottom: '24px', lineHeight: '1.3' }}>
                  {title}
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>AI Clickability Score</span>
                  <i className="fa-regular fa-circle-question" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}></i>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, color: getScoreColor(results.score), lineHeight: '1', textShadow: `0 0 20px ${getScoreColor(results.score)}60` }}>{results.score}</span>
                  <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, paddingBottom: '4px' }}>/ 100</span>
                </div>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${results.score}%`, background: getScoreColor(results.score), boxShadow: `0 0 10px ${getScoreColor(results.score)}`, borderRadius: '4px' }}></div>
                </div>
              </div>

              {/* Right: Score Gauge & Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '40px' }}>
                
                {/* CSS Arc Gauge */}
                <div style={{ position: 'relative', width: '120px', height: '60px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '120px', height: '120px', 
                    borderRadius: '50%', border: '10px solid rgba(255,255,255,0.05)', boxSizing: 'border-box' 
                  }}></div>
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '120px', height: '120px', 
                    borderRadius: '50%', border: `10px solid ${getScoreColor(results.score)}`, 
                    borderBottomColor: 'transparent', borderRightColor: 'transparent',
                    boxSizing: 'border-box',
                    transform: `rotate(${-45 + ((results.score / 100) * 180)}deg)`,
                    filter: `drop-shadow(0 0 8px ${getScoreColor(results.score)}80)`
                  }}></div>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: '1' }}>{results.score}</span>
                    <br/><span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>/ 100</span>
                  </div>
                </div>

                <span style={{ 
                  padding: '6px 14px', borderRadius: '20px', background: `${getRatingColor(results.clickability_rating)}15`, 
                  color: getRatingColor(results.clickability_rating), fontSize: '0.75rem', fontWeight: 700, 
                  border: `1px solid ${getRatingColor(results.clickability_rating)}40`, marginBottom: '12px',
                  boxShadow: `0 0 15px ${getRatingColor(results.clickability_rating)}30`
                }}>
                  {results.clickability_rating}
                </span>

                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.6' }}>
                  {results.clickability}
                </p>
              </div>
            </div>

            {/* 2x2 Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '24px' }}>
              
              {/* Internal Metric Card Renderer */}
              {[
                {
                  icon: "fa-eye", title: "READABILITY",
                  rating: results.readability_rating, ratingColor: getRatingColor(results.readability_rating),
                  description: results.readability, tip: results.readability_tip
                },
                {
                  icon: "fa-circle-half-stroke", title: "CONTRAST",
                  rating: results.contrast_rating, ratingColor: getRatingColor(results.contrast_rating),
                  description: results.contrast, tip: results.contrast_tip
                },
                {
                  icon: "fa-brain", title: "EMOTIONAL HOOK",
                  rating: results.emotion_rating, ratingColor: getRatingColor(results.emotion_rating),
                  description: results.emotion, tip: results.emotion_tip
                },
                {
                  icon: results.score >= 60 ? "fa-check" : "fa-xmark", title: "FINAL VERDICT",
                  rating: results.clickability_rating, ratingColor: getRatingColor(results.clickability_rating),
                  description: results.clickability, tip: results.clickability_tip
                }
              ].map((card, idx) => {
                const themeColors = [
                  { hex: '#ef4444', rgb: '239, 68, 68' }, // Red
                  { hex: '#3b82f6', rgb: '59, 130, 246' }, // Blue
                  { hex: '#22c55e', rgb: '34, 197, 94' }, // Green
                  { hex: '#eab308', rgb: '234, 179, 8' }  // Yellow
                ];
                const theme = themeColors[idx % themeColors.length];
                return (
                <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', justifyContent: 'space-between', borderLeft: `3px solid ${theme.hex}`, boxShadow: `-4px 0 15px -4px rgba(${theme.rgb}, 0.2)` }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Icon */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `rgba(${theme.rgb}, 0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fa-solid ${card.icon}`} style={{ fontSize: '1.2rem', color: theme.hex, filter: `drop-shadow(0 0 8px rgba(${theme.rgb}, 0.8))` }}></i>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.title}</span>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: `${card.ratingColor}15`, color: card.ratingColor, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${card.ratingColor}30`, boxShadow: `0 0 10px ${card.ratingColor}20` }}>
                          {card.rating}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '20px' }}>
                        {card.description}
                      </p>
                    </div>
                  </div>
                  {/* Tip */}
                  <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content' }}>
                      <i className="fa-solid fa-lightbulb" style={{ color: theme.hex, fontSize: '0.75rem', filter: `drop-shadow(0 0 5px rgba(${theme.rgb}, 0.8))` }}></i>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.hex, textTransform: 'uppercase', textShadow: `0 0 8px rgba(${theme.rgb}, 0.6)` }}>Tip</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.5' }}>
                      {card.tip}
                    </p>
                  </div>
                </div>
              )})}
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default ThumbnailAnalyzer;
