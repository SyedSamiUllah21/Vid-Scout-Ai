import React, { useState } from 'react';
import { requestJson } from '../lib/api';


const KeywordExplorer = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const generate = async () => {
    if (!keyword) {
      setError('Please enter a seed keyword');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson('/api/keyword-explore', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
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

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getTrendingIcon = (status) => {
    const s = String(status).toLowerCase();
    if (s.includes('rise') || s.includes('up') || s.includes('grow')) return 'fa-arrow-trend-up';
    if (s.includes('decline') || s.includes('down') || s.includes('fall')) return 'fa-arrow-trend-down';
    return 'fa-arrow-right';
  };

  return (
    <section className="tool-view active">
      {!results ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <div className="top-badge">
            <i className="fa-solid fa-magnifying-glass"></i> KEYWORD EXPLORER
          </div>
          <h1 className="hero-title">
            Search Smarter. <span className="gradient-text">Rank Higher.</span>
          </h1>
          <p className="hero-subtitle">
            Scan high-volume, low-competition keywords across YouTube search data<br />
            and instantly unlock long-tail variations to boost your video SEO rankings.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon" style={{ borderColor: 'rgba(59, 130, 246, 0.5)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#3b82f6' }}></i>
            </div>
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(59, 130, 246, 0.1)' }}>
              <div className="form-group">
                <label className="form-label">SEED KEYWORD</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-tags" style={{ color: '#3b82f6' }}></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. youtube automation or chatgpt course" 
                    style={{ borderColor: 'rgba(59, 130, 246, 0.15)' }}
                  />
                </div>
                <span className="input-hint">Enter a core phrase or video topic you want to research.</span>
              </div>

              <button 
                className="btn-generate" 
                onClick={generate} 
                disabled={loading}
                style={{ 
                  background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}
              >
                <i className="fa-solid fa-magnifying-glass-chart"></i>
                <span className="btn-text">{loading ? 'Searching SEO Database...' : 'Explore Keyword Opportunities'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}><i className="fa-solid fa-magnifying-glass"></i></div>
                  <div className="feature-text">
                    <h5>Search Volume</h5>
                    <p>Accurate demand metrics</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}><i className="fa-solid fa-award"></i></div>
                  <div className="feature-text">
                    <h5>SEO Difficulty</h5>
                    <p>Competition indexing</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}><i className="fa-solid fa-list-check"></i></div>
                  <div className="feature-text">
                    <h5>Tail Variations</h5>
                    <p>Long-tail opportunities</p>
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
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <button className="dash-back-btn" onClick={() => setResults(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ef4444', background: 'transparent', border: 'none', padding: 0, fontSize: '1rem', marginBottom: '16px', cursor: 'pointer' }}>
                <i className="fa-solid fa-arrow-left"></i> New Search
              </button>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '0 0 12px 0' }}>Keyword Explorer</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', margin: 0 }}>Discover high-potential keywords to optimize your content strategy.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '30px' }}>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}></i>
                <input type="text" placeholder="Search keywords..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 16px 12px 48px', color: '#fff', width: '280px', outline: 'none', fontSize: '1rem' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>Ctrl /</span>
              </div>
              <button style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
                <i className="fa-solid fa-download"></i> Export <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.8rem', marginLeft: '4px' }}></i>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            <div className="glass-card" style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '20px', background: '#000000' }}>
              <div style={{ minWidth: '56px', height: '56px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }}>
                <i className="fa-solid fa-arrow-trend-up" style={{ filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.8))' }}></i>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>SEARCH VOLUME</span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', margin: '6px 0', textShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}>{results.search_volume}</h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{results.search_volume_details}</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '20px', background: '#000000' }}>
              <div style={{ minWidth: '56px', height: '56px', borderRadius: '14px', background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)' }}>
                <i className="fa-solid fa-chart-simple" style={{ filter: 'drop-shadow(0 0 5px rgba(249, 115, 22, 0.8))' }}></i>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>COMPETITION</span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f97316', margin: '6px 0', textShadow: '0 0 10px rgba(249, 115, 22, 0.5)' }}>{results.competition}</h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{results.competition_details}</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '20px', background: '#000000' }}>
              <div style={{ minWidth: '56px', height: '56px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}>
                <i className="fa-solid fa-trophy" style={{ filter: 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.8))' }}></i>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>OVERALL SCORE</span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e', margin: '6px 0', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>{results.overall_score}/100</h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{results.overall_score_details}</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '20px', background: '#000000' }}>
              <div style={{ minWidth: '56px', height: '56px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)' }}>
                <i className={`fa-solid ${getTrendingIcon(results.trending_status)}`} style={{ filter: 'drop-shadow(0 0 5px rgba(34, 197, 94, 0.8))' }}></i>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>TRENDING STATUS</span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e', margin: '6px 0', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>{results.trending_status}</h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{results.trending_details}</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '32px', background: '#000000' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '32px' }}>Related Keyword Opportunities</h3>

            {results.related_keywords && results.related_keywords.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>KEYWORD <i className="fa-solid fa-arrow-down-a-z" style={{ marginLeft: '4px', opacity: 0.5 }}></i></th>
                      <th style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>SEARCH VOLUME</th>
                      <th style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>COMPETITION</th>
                      <th style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>OVERALL SCORE</th>
                      <th style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>DIFFICULTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.related_keywords.map((item, i) => {
                      const scoreColor = getScoreColor(item.overall_score);
                      
                      const icons = ['fa-moon', 'fa-house-chimney-medical', 'fa-brain', 'fa-lungs', 'fa-temperature-half', 'fa-moon', 'fa-trash-can', 'fa-magnifying-glass'];
                      const colors = ['#ef4444', '#a855f7', '#ec4899', '#8b5cf6', '#ef4444', '#8b5cf6', '#ef4444', '#a855f7'];
                      const icon = icons[i % icons.length];
                      const iconColor = colors[i % colors.length];

                      let compColor = '#eab308';
                      let compBg = 'rgba(234, 179, 8, 0.1)';
                      let compBorder = 'rgba(234, 179, 8, 0.3)';
                      
                      if (item.competition?.toLowerCase() === 'low') {
                        compColor = '#22c55e'; // Green
                        compBg = 'rgba(34, 197, 94, 0.1)';
                        compBorder = 'rgba(34, 197, 94, 0.3)';
                      } else if (item.competition?.toLowerCase() === 'high') {
                        compColor = '#ef4444'; // Red
                        compBg = 'rgba(239, 68, 68, 0.1)';
                        compBorder = 'rgba(239, 68, 68, 0.3)';
                      }

                      const diffColor = item.difficulty >= 60 ? '#ef4444' : item.difficulty >= 40 ? '#f97316' : '#22c55e';

                      return (
                        <tr key={i} style={{ fontSize: '1rem', color: '#fff' }}>
                          <td style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ minWidth: '40px', height: '40px', borderRadius: '12px', background: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, fontSize: '1.1rem', boxShadow: `0 0 10px ${iconColor}44` }}>
                              <i className={`fa-solid ${icon}`} style={{ filter: `drop-shadow(0 0 5px ${iconColor}88)` }}></i>
                            </div>
                            {item.keyword}
                          </td>
                          <td style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 600 }}>{item.search_volume}</td>
                          <td style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              fontSize: '0.85rem', 
                              fontWeight: 700,
                              color: compColor,
                              border: `1px solid ${compBorder}`,
                              background: compBg,
                              boxShadow: `0 0 8px ${compColor}33`,
                              textShadow: `0 0 5px ${compColor}88`
                            }}>
                              {item.competition}
                            </span>
                          </td>
                          <td style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{item.overall_score}/100</span>
                              <div style={{ width: '140px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                <div style={{ width: `${item.overall_score}%`, height: '100%', background: scoreColor, borderRadius: '3px', boxShadow: `0 0 10px ${scoreColor}88` }}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>DIFFICULTY</span>
                              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: diffColor, textShadow: `0 0 10px ${diffColor}88` }}>{item.difficulty}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No long-tail keyword variations found.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default KeywordExplorer;
