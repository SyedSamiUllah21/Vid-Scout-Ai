import React, { useState } from 'react';
import { requestJson } from '../lib/api';


const NicheValidator = () => {
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  React.useEffect(() => {
    if (results) {
      setAnimatedScore(0);
      const t = setTimeout(() => {
        setAnimatedScore(results.viability_score);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [results]);

  const generate = async () => {
    if (!niche) {
      setError('Please enter a niche topic description');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson('/api/niche-validate', {
        method: 'POST',
        body: JSON.stringify({ niche }),
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

  return (
    <section className="tool-view active">
      {!results ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <div className="top-badge">
            <i className="fa-solid fa-crosshairs"></i> NICHE VALIDATOR
          </div>
          <h1 className="hero-title">
            Validate Niche. <span className="gradient-text">Unleash Profit.</span>
          </h1>
          <p className="hero-subtitle">
            Instantly evaluate any YouTube channel niche idea to measure viewer demand,<br />
            monetization power, target audience engagement, and overall long-term viability.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon" style={{ borderColor: 'rgba(249, 115, 22, 0.5)', boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}>
              <i className="fa-solid fa-crosshairs" style={{ color: '#f97316' }}></i>
            </div>
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(249, 115, 22, 0.1)' }}>
              <div className="form-group">
                <label className="form-label">PROPOSED NICHE DESCRIPTION</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-bullseye" style={{ color: '#f97316' }}></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. AI tools for architects or solo travel in Asia" 
                    style={{ borderColor: 'rgba(249, 115, 22, 0.15)' }}
                  />
                </div>
                <span className="input-hint">Describe the niche, target topic, or audience segment you want to analyze.</span>
              </div>

              <button 
                className="btn-generate" 
                onClick={generate} 
                disabled={loading}
                style={{ 
                  background: 'linear-gradient(to right, #f97316, #ea580c)',
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
                }}
              >
                <i className="fa-solid fa-chart-pie"></i>
                <span className="btn-text">{loading ? 'Validating Market Data...' : 'Validate Niche Viability'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}><i className="fa-solid fa-scale-balanced"></i></div>
                  <div className="feature-text">
                    <h5>Market Viability</h5>
                    <p>Demand vs Competition</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}><i className="fa-solid fa-dollar-sign"></i></div>
                  <div className="feature-text">
                    <h5>CPM Potential</h5>
                    <p>Monetization channels</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}><i className="fa-solid fa-hourglass-half"></i></div>
                  <div className="feature-text">
                    <h5>Topic Longevity</h5>
                    <p>Evergreen content index</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-note">
            <i className="fa-solid fa-lock"></i>
            Validates channel ROI potential using real-time search volume and AdSense rates.
          </div>
        </div>
      ) : (
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <button className="dash-back-btn" onClick={() => setResults(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ef4444', background: 'transparent', border: 'none', padding: 0, fontSize: '1rem', cursor: 'pointer' }}>
              <i className="fa-solid fa-arrow-left"></i> New Search
            </button>
          </div>
          
          <div className="results-container" style={{ width: '100%' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '0 0 24px 0', textTransform: 'capitalize' }}>{niche}</h2>
            <div className="glass-card" style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr', gap: '40px', alignItems: 'center', background: '#000000' }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', marginBottom: '16px' }}>VIABILITY SCORE</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '4rem', fontWeight: 800, color: getScoreColor(results.viability_score), lineHeight: 1, textShadow: `0 0 15px ${getScoreColor(results.viability_score)}66` }}>{results.viability_score}</span>
                    <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginLeft: '4px' }}>/100</span>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', boxShadow: '0 0 10px rgba(34,197,94,0.2)', textShadow: '0 0 8px rgba(34,197,94,0.5)' }}>
                    <i className="fa-solid fa-arrow-trend-up"></i> High Potential
                  </div>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', margin: 0 }}>
                  {results.verdict}
                </p>
              </div>

              {/* Middle Column (Gauge) */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 12px ${getScoreColor(results.viability_score)}66)`, overflow: 'visible' }}>
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
                    <circle 
                      cx="50" cy="50" r="42" 
                      stroke={getScoreColor(results.viability_score)} 
                      strokeWidth="10" 
                      fill="none" 
                      strokeDasharray="263.89" 
                      strokeDashoffset={263.89 - (263.89 * animatedScore) / 100}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{results.viability_score}</span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/100</span>
                  </div>
                </div>
              </div>

              {/* Right Column (Metrics) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Market Demand', score: results.market_demand_score, icon: 'fa-arrow-trend-up' },
                  { label: 'Competition Level', score: results.competition_level_score, icon: 'fa-users', invertColor: true },
                  { label: 'Monetization Potential', score: results.monetization_potential_score, icon: 'fa-dollar-sign' },
                  { label: 'Audience Engagement', score: results.audience_engagement_score, icon: 'fa-heart' },
                  { label: 'Content Longevity', score: results.content_longevity_score, icon: 'fa-hourglass-half' }
                ].map((item, idx) => {
                  const color = item.invertColor ? getScoreColor(100 - item.score) : getScoreColor(item.score);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: '0.8rem', filter: `drop-shadow(0 0 5px ${color}88)`, background: `${color}11` }}>
                        <i className={`fa-solid ${item.icon}`}></i>
                      </div>
                      <span style={{ flex: 1, fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>{item.label}</span>
                      <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                        <div style={{ width: `${item.score}%`, height: '100%', background: color, borderRadius: '3px', boxShadow: `0 0 12px ${color}` }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: color, fontWeight: 700, width: '45px', textAlign: 'right', textShadow: `0 0 8px ${color}88` }}>
                        {item.score}<span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, textShadow: 'none' }}>/100</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden', background: '#000000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(34,197,94,0.3)' }}>
                    <i className="fa-solid fa-dollar-sign" style={{ filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.8))' }}></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>PROFITABILITY</span>
                    <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e', margin: '4px 0 0 0', textShadow: '0 0 10px rgba(34,197,94,0.5)' }}>{results.profitability}</h4>
                  </div>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', maxWidth: '60%', margin: 0 }}>{results.profitability_description}</p>
                
                <div style={{ position: 'absolute', bottom: '30px', right: '40px', width: '120px', height: '50px' }}>
                  <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 5px 8px rgba(34,197,94,0.4))' }}>
                    <path d="M0,45 Q10,25 20,40 T40,30 T60,35 T80,15 T100,5" fill="none" stroke="#22c55e" strokeWidth="3" />
                  </svg>
                  <div style={{ position: 'absolute', top: '-35px', right: '-35px', background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#22c55e', fontWeight: 800 }}>+24%</div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden', background: '#000000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(234, 179, 8, 0.2)' }}>
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>AUDIENCE SIZE</span>
                    <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#eab308', margin: '4px 0 0 0', textShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}>{results.audience_size}</h4>
                  </div>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', maxWidth: '60%', margin: 0 }}>{results.audience_size_description}</p>
                
                <div style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', opacity: 0.9, pointerEvents: 'none' }}>
                  <i className="fa-solid fa-earth-americas" style={{ fontSize: '7rem', color: '#fde047', filter: 'drop-shadow(0 0 15px rgba(234,179,8,1)) drop-shadow(0 0 35px rgba(234,179,8,0.8))' }}></i>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div className="glass-card" style={{ padding: '32px', background: '#000000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-regular fa-thumbs-up" style={{ filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' }}></i>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6', margin: 0, textShadow: '0 0 8px rgba(59,130,246,0.4)' }}>PROS</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {results.pros && results.pros.map((pro, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 0', borderBottom: idx < results.pros.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <i className="fa-regular fa-circle-check" style={{ color: '#3b82f6', fontSize: '1.2rem', filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.8))' }}></i>
                      <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{pro}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '32px', background: '#000000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', margin: 0, textShadow: '0 0 8px rgba(239,68,68,0.5)' }}>CONS</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {results.cons && results.cons.map((con, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 0', borderBottom: idx < results.cons.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <i className="fa-regular fa-circle-xmark" style={{ color: '#ef4444', fontSize: '1.2rem', filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.8))' }}></i>
                      <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default NicheValidator;
