import React, { useState } from 'react';
import { requestJson } from '../lib/api';

const AIScriptWriter = () => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tone, setTone] = useState('Educational & Engaging');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedOutlineIndex, setCopiedOutlineIndex] = useState(null);
  const [expandedSection, setExpandedSection] = useState(0);

  const generate = async () => {
    if (!title) {
      setError('Please enter a video title');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson('/api/script-write', {
        method: 'POST',
        body: JSON.stringify({ title, summary, tone }),
      }, 120000);
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
        setExpandedSection(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyOutlineToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedOutlineIndex(index);
    setTimeout(() => setCopiedOutlineIndex(null), 2000);
  };

  return (
    <section className="tool-view active" style={{ overflowY: 'auto' }}>
      {!results ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <div className="top-badge">
            <i className="fa-solid fa-pen-nib"></i> AI SCRIPT WRITER
          </div>
          <h1 className="hero-title">
            Write Hooks. <span className="gradient-text">Engage Instantly.</span>
          </h1>
          <p className="hero-subtitle">
            Generate high-retention video plans, script outlines, viewer-grabbing hook options,<br />
            and strategic scene cuts based on viral pacing formulas.
          </p>

          <div className="analyzer-wrapper" >
            <div className="pulse-icon" style={{ borderColor: 'rgba(20, 184, 166, 0.5)', boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)' }}>
              <i className="fa-solid fa-pen-nib" style={{ color: '#14b8a6' }}></i>
            </div>
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(20, 184, 166, 0.1)' }}>
              <div className="form-group">
                <label className="form-label">VIDEO TITLE</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-heading" style={{ color: '#14b8a6' }}></i>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. How I made $10,000 using ChatGPT"
                    style={{ borderColor: 'rgba(20, 184, 166, 0.15)' }}
                  />
                </div>
                <span className="input-hint">Enter your target video title or topic.</span>
              </div>

              <div className="form-group">
                <label className="form-label">BRIEF SUMMARY / CONCEPT</label>
                <div className="input-wrapper" style={{ alignItems: 'flex-start' }}>
                  <i className="fa-solid fa-align-left" style={{ color: '#14b8a6', marginTop: '14px' }}></i>
                  <textarea
                    className="form-input"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Provide a brief summary of what the video is about and your target message..."
                    style={{ borderColor: 'rgba(20, 184, 166, 0.15)', minHeight: '80px', paddingTop: '12px', paddingBottom: '12px', resize: 'vertical' }}
                  />
                </div>
                <span className="input-hint">Briefly explain your main points or video goals.</span>
              </div>

              <div className="form-group">
                <label className="form-label">TONE & PACING</label>
                <div className="input-wrapper select-wrapper-new">
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#14b8a6' }}></i>
                  <select
                    className="form-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    style={{ borderColor: 'rgba(20, 184, 166, 0.15)' }}
                  >
                    <option value="Educational & Engaging">Educational & Engaging</option>
                    <option value="Fast-paced & Hype">Fast-Paced & Hype</option>
                    <option value="Storytelling & Dramatic">Storytelling & Dramatic</option>
                    <option value="Professional & Analytical">Professional & Analytical</option>
                    <option value="Conversational & Funny">Conversational & Funny</option>
                  </select>
                </div>
                <span className="input-hint">Choose the delivery style that fits your brand.</span>
              </div>

              <button
                className="btn-generate"
                onClick={generate}
                disabled={loading}
                style={{
                  background: 'linear-gradient(to right, #14b8a6, #0d9488)',
                  boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)'
                }}
              >
                <i className="fa-solid fa-scroll"></i>
                <span className="btn-text">{loading ? 'Writing Script Elements...' : 'Generate Interactive Video Plan'}</span>
              </button>

              {error && <div className="error" style={{ marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center' }}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)' }}><i className="fa-solid fa-magnet"></i></div>
                  <div className="feature-text">
                    <h5>Retention Hooks</h5>
                    <p>Viewer-grabbing options</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)' }}><i className="fa-solid fa-compass"></i></div>
                  <div className="feature-text">
                    <h5>Structured Outline</h5>
                    <p>Chronological story flow</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)' }}><i className="fa-solid fa-clock"></i></div>
                  <div className="feature-text">
                    <h5>Timing Overview</h5>
                    <p>Estimated duration & scenes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-note">
            <i className="fa-solid fa-lock"></i>
            Follows retention-graph benchmarks derived from top viral content.
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <button className="dash-back-btn" onClick={() => setResults(null)}>← Back to Scriptwriter</button>

          <div className="results-container" style={{ width: '100%' }}>

            {/* Header card */}
            <div className="header-card glass-card" style={{ padding: '24px 32px' }}>
              <p style={{ color: '#14b8a6', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '4px', textShadow: '0 0 10px rgba(20, 184, 166, 0.5)' }}>Video Plan Draft</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
                "{results.title || title}"
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                Category: <strong style={{ color: '#14b8a6', textShadow: '0 0 10px rgba(20, 184, 166, 0.5)' }}>{results.tag || 'Creator Strategy'}</strong>
              </p>
            </div>

            {/* Strategic Overview Grid */}
            <div className="glass-card" style={{ marginTop: '24px', padding: '24px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Production Overview</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginTop: '16px' }}>
                <div style={{ padding: '12px', borderLeft: '3px solid #3b82f6', background: 'rgba(255,255,255,0.01)', boxShadow: '-4px 0 15px -4px rgba(59, 130, 246, 0.4)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Word Count</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px', textShadow: '0 0 10px rgba(59, 130, 246, 0.6)' }}>{results.overview?.word_count?.toLocaleString() || '—'}</p>
                </div>
                <div style={{ padding: '12px', borderLeft: '3px solid #22c55e', background: 'rgba(255,255,255,0.01)', boxShadow: '-4px 0 15px -4px rgba(34, 197, 94, 0.4)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Est. Duration</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e', marginTop: '4px', textShadow: '0 0 10px rgba(34, 197, 94, 0.6)' }}>{results.overview?.est_duration || '—'}</p>
                </div>
                <div style={{ padding: '12px', borderLeft: '3px solid #eab308', background: 'rgba(255,255,255,0.01)', boxShadow: '-4px 0 15px -4px rgba(234, 179, 8, 0.4)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Visual Scenes</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#eab308', marginTop: '4px', textShadow: '0 0 10px rgba(234, 179, 8, 0.6)' }}>{results.overview?.scenes || '—'}</p>
                </div>
                <div style={{ padding: '12px', borderLeft: '3px solid #ef4444', background: 'rgba(255,255,255,0.01)', boxShadow: '-4px 0 15px -4px rgba(239, 68, 68, 0.4)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Voice Tone</span>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>{results.overview?.tone || tone}</p>
                </div>
                <div style={{ padding: '12px', borderLeft: '3px solid #a855f7', background: 'rgba(255,255,255,0.01)', boxShadow: '-4px 0 15px -4px rgba(168, 85, 247, 0.4)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Audience Focus</span>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>{results.overview?.audience || 'General'}</p>
                </div>
              </div>
            </div>

            {/* Hook options */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <i className="fa-solid fa-magnet" style={{ color: '#14b8a6', filter: 'drop-shadow(0 0 8px rgba(20, 184, 166, 0.8))' }}></i>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Viewer-Grabbing Hook Options (0 - 15s)</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {results.hooks && results.hooks.map((hook, idx) => {
                  const colors = [
                    { hex: '#ef4444', rgb: '239, 68, 68' },
                    { hex: '#3b82f6', rgb: '59, 130, 246' },
                    { hex: '#22c55e', rgb: '34, 197, 94' },
                    { hex: '#eab308', rgb: '234, 179, 8' }
                  ];
                  const c = colors[idx % colors.length];
                  return (
                    <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', position: 'relative' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: c.hex, textTransform: 'uppercase', letterSpacing: '1px', textShadow: `0 0 10px rgba(${c.rgb}, 0.5)` }}>Hook Option {idx + 1}</span>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginTop: '12px', fontStyle: 'italic' }}>
                          "{hook}"
                        </p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(hook, idx)}
                        style={{ 
                          marginTop: '20px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', 
                          background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', transition: 'all 0.2s'
                        }}
                      >
                        <i className={copiedIndex === idx ? "fa-solid fa-circle-check" : "fa-regular fa-copy"}></i>
                        {copiedIndex === idx ? 'Copied!' : 'Copy Hook Text'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Script Outline Section */}
            <div style={{ marginTop: '40px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', marginBottom: '24px', letterSpacing: '-0.5px' }}>Outline</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.outline && results.outline.map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '24px 30px',
                      background: 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: '600', margin: 0, letterSpacing: '0.2px' }}>{sec.section_title}</h4>
                      <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '1.3rem' }}>
                        <i
                          className={copiedOutlineIndex === idx ? "fa-solid fa-circle-check" : "fa-regular fa-copy"}
                          style={{ cursor: 'pointer', transition: 'color 0.2s', color: copiedOutlineIndex === idx ? '#22c55e' : 'inherit' }}
                          title="Copy Section"
                          onMouseEnter={(e) => { if (copiedOutlineIndex !== idx) e.target.style.color = '#fff'; }}
                          onMouseLeave={(e) => { if (copiedOutlineIndex !== idx) e.target.style.color = 'rgba(255,255,255,0.7)'; }}
                          onClick={() => {
                            const text = `${sec.section_title}\n` + (sec.bullets ? sec.bullets.map(b => `- ${b}`).join('\n') : '');
                            copyOutlineToClipboard(text, idx);
                          }}
                        ></i>
                        <i
                          className="fa-regular fa-trash-can"
                          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                          title="Delete Section"
                          onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                          onClick={() => {
                            setResults(prev => ({
                              ...prev,
                              outline: prev.outline.filter((_, i) => i !== idx)
                            }));
                          }}
                        ></i>
                      </div>
                    </div>

                    <ul style={{ paddingLeft: '20px', margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {sec.bullets && sec.bullets.map((b, bIdx) => (
                        <li key={bIdx} style={{ marginBottom: '8px' }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Notes */}
            <div className="glass-card" style={{ marginTop: '24px', marginBottom: '40px', padding: '32px', borderColor: 'rgba(20,184,166,0.25)', background: 'linear-gradient(135deg, rgba(20,184,166,0.03) 0%, rgba(22,27,34,0.4) 100%)', boxShadow: '0 0 20px rgba(20, 184, 166, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <i className="fa-solid fa-clipboard-question" style={{ color: '#14b8a6', filter: 'drop-shadow(0 0 8px rgba(20, 184, 166, 0.8))' }}></i>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Strategic Creator Advice</h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                {results.notes}
              </p>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default AIScriptWriter;
