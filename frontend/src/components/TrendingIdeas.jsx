import React, { useState } from 'react';
import { requestJson } from '../lib/api';

const AGENT_STEPS = [
  '🔥 Scanning TikTok & Instagram Reels (TOP PRIORITY)…',
  'Searching YouTube trending videos…',
  'Reading Google Trends data…',
  'Deep-scanning Reddit discussions…',
  'Picking up X / Twitter signals…',
  'Reading Google + Bing News…',
  'Crawling niche blogs + academic sources…',
  'Checking forums & communities…',
  'Aggregating all sources…',
  'Generating 5 viral ideas with AI…',
  'Formatting final report…',
];

const riskColor  = (r) => r === 'Low' ? '#4ade80' : r === 'Medium' ? '#eab308' : '#ef4444';
const formatIcon = (f) => f === 'Short' ? 'fa-solid fa-bolt' : f === 'Deep Dive' ? 'fa-solid fa-book-open' : 'fa-solid fa-play';

const TrendingIdeas = () => {
  const [url, setUrl]             = useState('');
  const [timeframe, setTimeframe] = useState('28d');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [results, setResults]     = useState(null);
  const [stepLabel, setStepLabel] = useState('');
  const [showResearch, setShowResearch] = useState(false);

  // Cycle through step labels while agent is running
  React.useEffect(() => {
    if (!loading) { setStepLabel(''); return; }
    let i = 0;
    setStepLabel(AGENT_STEPS[0]);
    const iv = setInterval(() => { i = (i + 1) % AGENT_STEPS.length; setStepLabel(AGENT_STEPS[i]); }, 4200);
    return () => clearInterval(iv);
  }, [loading]);

  const generate = async () => {
    if (!url.trim()) { setError('Please enter a YouTube channel URL or topic'); return; }
    setLoading(true); setError(null);
    try {
      const data = await requestJson('/api/trending-ideas', {
        method: 'POST',
        body: JSON.stringify({ channel_url: url.trim(), timeframe }),
      }, 600000);
      if (data.error) { setError(data.error); }
      else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message || 'Failed — check the backend console for logs.');
    } finally { setLoading(false); }
  };

  const reset = () => { setResults(null); };

  // ── Results view ────────────────────────────────────────────────────────────
  if (results) {
    const ch = results.channel || {};
    const rd = results.research_details || {};
    
    return (
      <section className="tool-view active">
        <div className="dashboard">
          <button className="dash-back-btn" onClick={reset}>← Back to Generator</button>

          {/* Header */}
          <div className="header-card glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', background: '#000000' }}>
            <div>
              <p style={{ color: '#a855f7', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                <i className="fa-solid fa-robot" style={{ marginRight: '6px' }}></i>8-Step AI Research Agent
              </p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{ch.channel_name || 'Research Report'}</h2>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>
                Niche: <strong style={{ color: '#fff' }}>{ch.niche || '—'}</strong>
                {results.window_label && <> &nbsp;·&nbsp; Window: <strong style={{ color: '#fff' }}>{results.window_label}</strong></>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {ch.subscribers > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Subscribers</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{ch.subscribers.toLocaleString()}</div>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Sources</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{results.sources_used}</div>
              </div>
            </div>
          </div>

          {/* Research Details Toggle */}
          <div style={{ margin: '16px 0' }}>
            <button
              onClick={() => setShowResearch(!showResearch)}
              style={{
                background: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '8px',
                padding: '10px 16px',
                color: '#a855f7',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(168,85,247,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(168,85,247,0.08)'; }}
            >
              <i className={`fa-solid fa-chevron-${showResearch ? 'up' : 'down'}`}></i>
              {showResearch ? 'Hide' : 'Show'} Research Breakdown (8 Steps)
            </button>
          </div>

          {/* Research Breakdown */}
          {showResearch && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <i className="fa-solid fa-microscope" style={{ marginRight: '8px', color: '#a855f7' }}></i>
                Research Protocol Validation
              </h3>
              
              {[
                { key: 'step1_shortform', label: '🔥 Step 1: TikTok + Instagram Reels (TOP PRIORITY)', icon: 'fa-brands fa-tiktok', color: '#fe2c55' },
                { key: 'step2_youtube', label: 'Step 2: YouTube Trending Videos', icon: 'fa-brands fa-youtube', color: '#ff0000' },
                { key: 'step3_trends', label: 'Step 3: Google Trends', icon: 'fa-chart-line', color: '#22c55e' },
                { key: 'step4_reddit', label: 'Step 4: Reddit Deep Scan', icon: 'fa-brands fa-reddit', color: '#ff4500' },
                { key: 'step5_twitter', label: 'Step 5: X/Twitter Signals', icon: 'fa-brands fa-x-twitter', color: '#1da1f2' },
                { key: 'step6_news', label: 'Step 6: Google + Bing News', icon: 'fa-newspaper', color: '#3b82f6' },
                { key: 'step7_blogs', label: 'Step 7: Niche Blogs + Academic', icon: 'fa-book-open', color: '#8b5cf6' },
                { key: 'step8_forums', label: 'Step 8: Forums + Communities', icon: 'fa-comments', color: '#f59e0b' },
              ].map(({ key, label, icon, color }) => {
                const sources = rd[key] || [];
                const count = results.step_counts?.[key] || 0;
                return (
                  <div key={key} style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <i className={icon} style={{ color, fontSize: '1.1rem' }}></i>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: 0 }}>{label}</h4>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        {count} source{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {sources.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sources.map((src, i) => {
                          const u = src.url || '';
                          const isTT = u.includes('tiktok.com');
                          const isIG = u.includes('instagram.com');
                          const bgColor = isTT ? 'rgba(254,44,85,0.06)' : isIG ? 'rgba(225,48,108,0.06)' : 'rgba(255,255,255,0.03)';
                          const bdColor = isTT ? 'rgba(254,44,85,0.2)' : isIG ? 'rgba(225,48,108,0.2)' : 'rgba(255,255,255,0.08)';
                          const srcColor = isTT ? '#fe2c55' : isIG ? '#e1306c' : color;
                          return (
                            <a key={i} href={u || '#'} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'block', padding: '8px 12px', background: bgColor, borderRadius: '6px', border: `1px solid ${bdColor}`, textDecoration: 'none', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background='rgba(168,85,247,0.1)'; e.currentTarget.style.borderColor='rgba(168,85,247,0.3)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background=bgColor; e.currentTarget.style.borderColor=bdColor; }}
                            >
                              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                                {isTT && <i className="fa-brands fa-tiktok" style={{ color:'#fe2c55', fontSize:'0.8rem' }}></i>}
                                {isIG && <i className="fa-brands fa-instagram" style={{ color:'#e1306c', fontSize:'0.8rem' }}></i>}
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{src.title}</div>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                <span style={{ color: srcColor, fontWeight: 600 }}>{src.source}</span>
                                {src.date && ` · ${src.date}`} {src.engagement && ` · ${src.engagement}`}
                              </div>
                              {src.snippet && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: '1.4' }}>{src.snippet.substring(0, 150)}{src.snippet.length > 150 ? '...' : ''}</div>}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: 0 }}>No sources displayed (check step_counts for total)</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Trend summary */}
          {results.trend_summary && (
            <div style={{ margin: '16px 0', padding: '14px 20px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                <i className="fa-solid fa-chart-line" style={{ marginRight: '6px' }}></i>Trend Summary This Week
              </p>
              <p style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.65' }}>{results.trend_summary}</p>
            </div>
          )}

          {/* Ideas heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', marginTop: '8px' }}>
            <i className="fa-solid fa-bolt" style={{ color: '#eab308' }}></i>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '1px', color: '#fff', textTransform: 'uppercase' }}>
              TAILORED VIRAL VIDEO CONCEPTS
            </h3>
          </div>

          {/* Ideas list */}
          <div className="ideas-list-container" style={{ width: '100%' }}>
            {(results.ideas || []).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'rgba(168,85,247,0.05)',
                border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.6)',
              }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#eab308', marginBottom: '16px', display: 'block' }}></i>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No ideas generated this run</p>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                  The research agent completed but the AI synthesis step returned no ideas.<br />
                  This usually happens due to Groq API rate limits or a temporary overload.<br />
                  <strong style={{ color: '#a855f7' }}>Please click "← Back to Generator" and try again.</strong>
                </p>
              </div>
            ) : (results.ideas || []).map((idea, index) => {
              const score = idea.viral_score || idea.virality_score || 50;
              const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
              const rankColors = ['#ff3b3b','#ff9900','#ffe600','#00e676','#00b0ff','#7c4dff','#e040fb','#00e5ff','#ff4081','#1de9b6'];
              const rankColor  = rankColors[index % rankColors.length];
              const radius = 28;
              const circumference = 2 * Math.PI * radius;
              const dashoffset = circumference - (score / 100) * circumference;

              return (
                <div key={index} className="idea-list-card">
                  {/* Rank column */}
                  <div className="idea-rank-section">
                    <span className="rank-num" style={{ color: rankColor, textShadow: `0 0 15px ${rankColor}, 0 0 30px ${rankColor}88`, fontWeight: 900 }}>
                      #{idea.rank || index + 1}
                    </span>
                    <span className="trending-label"><i className="fa-solid fa-arrow-trend-up"></i> Trending</span>
                  </div>

                  {/* Main content */}
                  <div className="idea-main-content">
                    {/* Title + badges */}
                    <div className="idea-header-row">
                      <h2>{idea.title}</h2>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {idea.trends_approved === true && (
                          <span title={idea.trends_reason || "Verified on Google Trends"} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: '0.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'help' }}>
                            <i className="fa-solid fa-check-circle"></i> Trends Approved
                          </span>
                        )}
                        {idea.trends_approved === false && (
                          <span title={idea.trends_reason || "No search volume detected on Google Trends recently"} style={{ background: 'rgba(156,163,175,0.1)', border: '1px solid rgba(156,163,175,0.25)', color: '#9ca3af', fontSize: '0.67rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'help' }}>
                            <i className="fa-solid fa-circle-xmark"></i> Not Trending on Google
                          </span>
                        )}
                        {idea.best_format && (
                          <span style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: '0.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className={formatIcon(idea.best_format)}></i> {idea.best_format}
                          </span>
                        )}
                        {idea.risk_level && (
                          <span style={{ background: `rgba(${idea.risk_level==='Low'?'74,222,128':idea.risk_level==='Medium'?'234,179,8':'239,68,68'},0.1)`, border: `1px solid rgba(${idea.risk_level==='Low'?'74,222,128':idea.risk_level==='Medium'?'234,179,8':'239,68,68'},0.3)`, color: riskColor(idea.risk_level), fontSize: '0.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                            Risk: {idea.risk_level}
                          </span>
                        )}
                        <div className="schedule-badge">
                          <i className="fa-regular fa-calendar"></i>
                          <span>Day {index + 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ lineHeight: '1.65', fontSize: '1rem', color: 'rgba(255,255,255,0.88)', marginBottom: '14px' }}>{idea.description}</p>

                    {/* Hook */}
                    {idea.hook && (
                      <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                          <i className="fa-solid fa-bolt" style={{ marginRight: '4px' }}></i>Hook — First 15 Seconds
                        </p>
                        <p style={{ fontSize: '0.97rem', color: 'rgba(255,255,255,0.92)', lineHeight: '1.6', fontStyle: 'italic' }}>"{idea.hook}"</p>
                      </div>
                    )}

                    {/* Core angle */}
                    {idea.core_angle && (
                      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Core Angle</p>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)', lineHeight: '1.6' }}>{idea.core_angle}</p>
                      </div>
                    )}

                    {/* Why trending */}
                    {idea.why_trending && (
                      <div style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                          <i className="fa-solid fa-fire" style={{ marginRight: '4px' }}></i>Why Trending Now
                        </p>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)', lineHeight: '1.6' }}>{idea.why_trending}</p>
                      </div>
                    )}

                    {/* Tags + Verify */}
                    <div className="idea-tags-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      {idea.tags && idea.tags.length > 0 ? (
                        <div className="idea-tags" style={{ margin: 0 }}>
                          <i className="fa-solid fa-tags"></i>
                          {idea.tags.map((tag, i) => (
                            <React.Fragment key={i}>
                              <span>{tag}</span>
                              {i < idea.tags.length - 1 && <span className="dot">•</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : <div></div>}
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(idea.title)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="verify-link"
                        style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(168,85,247,0.15)'; e.currentTarget.style.borderColor='rgba(168,85,247,0.4)'; e.currentTarget.style.color='#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#e2e8f0'; }}
                      >
                        <i className="fa-brands fa-youtube" style={{ color: '#ff0000', fontSize: '1rem' }}></i> Verify Idea
                      </a>
                    </div>

                    {/* Research sources */}
                    {(() => {
                      const srcs = idea.trend_sources?.length > 0 ? idea.trend_sources : (idea.sources || []);
                      if (!srcs.length) return null;
                      return (
                        <div className="idea-sources" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.8px' }}>
                            Sources that backed this idea:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {srcs.map((src, i) => {
                              const u = src.url || '';
                              let icon = 'fa-solid fa-link';
                              if (u.includes('tiktok.com')) icon = 'fa-brands fa-tiktok';
                              else if (u.includes('instagram.com')) icon = 'fa-brands fa-instagram';
                              else if (u.includes('youtube.com') || u.includes('youtu.be')) icon = 'fa-brands fa-youtube';
                              else if (u.includes('reddit.com')) icon = 'fa-brands fa-reddit';
                              else if (u.includes('twitter.com') || u.includes('x.com')) icon = 'fa-brands fa-x-twitter';
                              else if (u.includes('news.google.com') || u.includes('bing.com/news')) icon = 'fa-regular fa-newspaper';
                              else if (u.includes('trends.google.com')) icon = 'fa-solid fa-arrow-trend-up';
                              else if (u.includes('algolia') || u.includes('ycombinator')) icon = 'fa-brands fa-hacker-news';
                              else if (src.platform) icon = 'fa-solid fa-globe';
                              
                              const isTT = u.includes('tiktok.com');
                              const isIG = u.includes('instagram.com');
                              const isSocial = isTT || isIG;
                              
                              const baseBg = isTT ? 'rgba(254,44,85,0.1)' : isIG ? 'rgba(225,48,108,0.1)' : 'rgba(168,85,247,0.05)';
                              const hoverBg = isTT ? 'rgba(254,44,85,0.2)' : isIG ? 'rgba(225,48,108,0.2)' : 'rgba(168,85,247,0.15)';
                              const baseColor = isTT ? '#fe2c55' : isIG ? '#e1306c' : '#a855f7';
                              const borderColor = isTT ? 'rgba(254,44,85,0.3)' : isIG ? 'rgba(225,48,108,0.3)' : 'rgba(168,85,247,0.1)';
                              
                              const isConstructed = u.includes('/search') || u.includes('/tag');

                              return (
                                <a key={i} href={u || '#'} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: baseColor, background: baseBg, padding: '4px 10px', borderRadius: '4px', textDecoration: 'none', border: `1px solid ${borderColor}`, maxWidth: '100%', transition: 'all 0.2s', fontWeight: isSocial ? 600 : 400 }}
                                  onMouseEnter={e => { e.currentTarget.style.background=hoverBg; e.currentTarget.style.color='#fff'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background=baseBg; e.currentTarget.style.color=baseColor; }}
                                  title={src.title || u}
                                >
                                  <i className={icon}></i>
                                  <span style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isConstructed && isSocial ? 'Browse Viral Content: ' : ''}{src.platform && !isSocial ? `[${src.platform}] ` : ''}{src.title || 'Source Link'}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Score circle */}
                  <div className="idea-score-section">
                    <div className="score-circle">
                      <svg viewBox="0 0 65 65" style={{ filter: `drop-shadow(0 0 8px ${scoreColor}88)`, overflow: 'visible' }}>
                        <circle className="bg" cx="32.5" cy="32.5" r={radius} />
                        <circle className="progress" cx="32.5" cy="32.5" r={radius} stroke={scoreColor} strokeDasharray={circumference} strokeDashoffset={dashoffset} />
                      </svg>
                      <div className="score-value">
                        <span className="score-num" style={{ color: scoreColor, textShadow: `0 0 10px ${scoreColor}88` }}>{score}</span>
                        <span className="score-label">SCORE</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Input view (original design, wired to 8-step agent) ────────────────────
  return (
    <section className="tool-view active">
      <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>

        <div className="top-badge">
          <i className="fa-solid fa-lightbulb"></i> TRENDING IDEAS GENERATOR
        </div>

        <h1 className="hero-title">
          Discover What <span className="gradient-text">Goes Viral.</span>
        </h1>
        <p className="hero-subtitle">
          Leverage market research and competitive intelligence to find the absolute<br />
          highest-potential video concepts for your target audience.
        </p>

        <div className="analyzer-wrapper">
          <div className="pulse-icon" style={{ borderColor: 'rgba(168, 85, 247, 0.5)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}>
            <i className="fa-regular fa-lightbulb" style={{ color: '#a855f7' }}></i>
          </div>

          <div className="analyzer-card-new" style={{ borderColor: 'rgba(168, 85, 247, 0.1)' }}>

            {/* Channel URL input */}
            <div className="form-group">
              <label className="form-label">CHANNEL URL OR TOPIC</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-link" style={{ color: '#a855f7' }}></i>
                <input
                  type="text"
                  className="form-input"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && generate()}
                  placeholder="e.g. https://youtube.com/@channel  or  Spirituality"
                  style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}
                  disabled={loading}
                />
              </div>
              <span className="input-hint">Enter your channel URL or a general niche topic to target.</span>
            </div>

            {/* Timeframe dropdown */}
            <div className="form-group">
              <label className="form-label">CONTENT WINDOW</label>
              <div className="input-wrapper select-wrapper-new">
                <i className="fa-regular fa-calendar" style={{ color: '#a855f7' }}></i>
                <select
                  className="form-select"
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}
                  disabled={loading}
                >
                  <option value="7d">Past 7 days</option>
                  <option value="28d">Past 28 days</option>
                  <option value="90d">Past 90 days</option>
                  <option value="lifetime">All Time</option>
                </select>
              </div>
              <span className="input-hint">
                How far back to pull this channel's videos for style context.
                If no uploads exist in this window, the last 10 videos are used automatically.
              </span>
            </div>

            {/* Agent step progress (shown while loading) */}
            {loading && (
              <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(168,85,247,0.3)', borderTop: '2px solid #a855f7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}></div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 700, marginBottom: '1px' }}>8-Step Research Agent Running</p>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{stepLabel}</p>
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              className="btn-generate"
              onClick={generate}
              disabled={loading}
              style={{ background: 'linear-gradient(to right, #a855f7, #6b21a8)', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span className="btn-text">{loading ? 'Researching… (~3 min)' : 'Generate Viral Concepts'}</span>
            </button>

            {error && (
              <div className="error" style={{ marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center' }}>{error}</div>
            )}

            {/* Feature grid */}
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}><i className="fa-solid fa-fire"></i></div>
                <div className="feature-text"><h5>Trend Sniping</h5><p>Real-time market fit</p></div>
              </div>
              <div className="feature-item">
                <div className="feature-icon" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}><i className="fa-solid fa-rocket"></i></div>
                <div className="feature-text"><h5>Viral Modeling</h5><p>Hook &amp; topic scoring</p></div>
              </div>
              <div className="feature-item">
                <div className="feature-icon" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}><i className="fa-solid fa-bolt"></i></div>
                <div className="feature-text"><h5>Instant Outline</h5><p>Ready to script</p></div>
              </div>
            </div>

          </div>
        </div>

        <div className="footer-note">
          <i className="fa-solid fa-lock"></i>
          Powered by 8 live research sources. Every idea backed by real trending data.
        </div>
      </div>
    </section>
  );
};

export default TrendingIdeas;
