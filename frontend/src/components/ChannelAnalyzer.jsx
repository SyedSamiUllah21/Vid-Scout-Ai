import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LabelList } from 'recharts';
import { requestJson } from '../lib/api';











const ChannelAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [lastUrl, setLastUrl] = useState('');

  const [contentDistribution, setContentDistribution] = useState([]);
  const [engagementData, setEngagementData] = useState([]);

  const [recentVideos, setRecentVideos] = useState([]);
  const [viralVideo, setViralVideo] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const bottomGridRef = useRef(null);
  const [chartAnimationKey, setChartAnimationKey] = useState(0);

  // Trigger animations when the bottom grid scrolls into view
  useEffect(() => {
    if (!results) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Incrementing the key forces React to fully unmount and remount the charts,
            // triggering their built-in Recharts animation sequences perfectly.
            setChartAnimationKey(prev => prev + 1);
          }
        });
      },
      { threshold: 0.1 }
    );

    // Short timeout to ensure the DOM is rendered after results change
    const timer = setTimeout(() => {
      if (bottomGridRef.current) {
        observer.observe(bottomGridRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [results]);

  const generate = async (overrideUrl) => {
    const clickedFromEvent = overrideUrl && typeof overrideUrl === 'object' && 'currentTarget' in overrideUrl;
    const channelUrl = clickedFromEvent ? url : (overrideUrl || url);
    if (!channelUrl) {
      setError('Please enter a valid channel URL');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson('/analyze', {
        method: 'POST',
        body: JSON.stringify({ channel_url: channelUrl }),
      }, 240000);
      if (data.error) {
        setError(data.error);
      } else {
        // Fetch dynamic insights first so the whole dashboard appears at once
        if (data.channel && data.channel.channel_id) {
          try {
            const insightsData = await requestJson('/api/channel-insights', {
              method: 'POST',
              body: JSON.stringify({ channel_id: data.channel.channel_id })
            }, 120000);
            if (insightsData && insightsData.content_distribution) {
              setContentDistribution(insightsData.content_distribution);
            }
            if (insightsData && insightsData.engagement_data) {
              setEngagementData(insightsData.engagement_data);
            }

            if (insightsData && insightsData.videos) {
              const sorted = insightsData.videos.sort((a, b) => new Date(a.published) - new Date(b.published));
              const formatted = sorted.map(v => ({ name: v.published.substring(5), views: v.views }));
              setRecentVideos(formatted);
            }

            if (insightsData && insightsData.viral_video) {
              setViralVideo(insightsData.viral_video);
            }

          } catch (insightsErr) {
            console.error('Failed to fetch channel insights:', insightsErr);
          }
        }
        
        // Show the completed dashboard
        setResults(data);
        setLastUrl(channelUrl);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const subscribers = results?.channel?.subscribers || 0;
  const totalViews = results?.channel?.total_views || 0;
  const videoCount = results?.channel?.video_count || 0;
  const avgViews = results?.channel?.avg_views_per_video || 0;

  const getCountryName = (code) => {
    if (!code) return 'Unknown';
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    } catch {
      return code;
    }
  };
  const mainCountry = getCountryName(results?.channel?.country);

  return (
    <section className="tool-view active">
      {!results ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <div className="top-badge">
            <i className="fa-solid fa-unlock"></i> CHANNEL ANALYZER
          </div>
          <h1 className="hero-title">
            Uncover Insights. <span className="gradient-text">Grow Smarter.</span>
          </h1>
          <p className="hero-subtitle">
            Analyze any YouTube channel to track performance, discover growth<br />
            opportunities, and stay ahead of the competition.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon">
              <i className="fa-solid fa-wave-square"></i>
            </div>
            <div className="analyzer-card-new">
              <div className="form-group">
                <label className="form-label">CHANNEL URL</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-link"></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/@channelname" 
                  />
                </div>
                <span className="input-hint">Enter the full URL of the YouTube channel you want to analyze.</span>
              </div>


              <button className="btn-generate" onClick={generate} disabled={loading}>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span className="btn-text">{loading ? 'Analyzing...' : 'Analyze'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="adv-dashboard">
          <button className="dash-back-btn" onClick={() => setResults(null)}>← Back</button>
          
          <div className="adv-header">
            <div>
              <h2 className="adv-title">{results.channel?.channel_name || 'Analysis'} <i className="fa-solid fa-circle-check" style={{ color: '#ff2a2a', fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px rgba(255, 42, 42, 0.8))' }}></i></h2>
              <p className="adv-desc">{results.channel?.description?.substring(0, 150) || ''}...</p>
            </div>

          </div>

          <div className="adv-stat-grid">
            <div className="adv-stat-card">
              <div className="adv-icon-box" style={{ background: 'linear-gradient(135deg, #ff2a2a, #ff5555)', boxShadow: '0 0 15px rgba(255, 42, 42, 0.4)' }}>
                <i className="fa-solid fa-users" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))' }}></i>
              </div>
              <div className="adv-stat-info">
                <span className="adv-stat-label">SUBSCRIBERS</span>
                <span className="adv-stat-val">{results.channel?.subscribers?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>
            <div className="adv-stat-card">
              <div className="adv-icon-box" style={{ background: 'linear-gradient(135deg, #a855f7, #c084fc)', boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)' }}>
                <i className="fa-solid fa-eye" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))' }}></i>
              </div>
              <div className="adv-stat-info">
                <span className="adv-stat-label">TOTAL VIEWS</span>
                <span className="adv-stat-val">{results.channel?.total_views?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>
            <div className="adv-stat-card">
              <div className="adv-icon-box" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' }}>
                <i className="fa-solid fa-play" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))' }}></i>
              </div>
              <div className="adv-stat-info">
                <span className="adv-stat-label">VIDEOS</span>
                <span className="adv-stat-val">{results.channel?.video_count?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>
          </div>

          
          
          
          {viralVideo && (

            <div className="adv-chart-panel" style={{marginBottom: '20px'}}>
              <div className="adv-chart-header" style={{ marginBottom: '10px' }}>
                <span className="adv-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-brands fa-youtube" style={{ color: '#ff0000', fontSize: '1.3rem', filter: 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))' }}></i>
                  MOST VIRAL VIDEO
                </span>
              </div>
              <div style={{ padding: '20px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, letterSpacing: '1px' }}>TITLE</span>
                    <h3 style={{ margin: '0', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>{viralVideo.title}</h3>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, letterSpacing: '1px' }}>DESCRIPTION</span>
                    <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{viralVideo.description}</p>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, letterSpacing: '1px' }}>TAGS</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {viralVideo.tags && viralVideo.tags.map((tag, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '0 10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 600, letterSpacing: '1px' }}>LIFETIME VIEWS</span>
                  <span className="adv-stat-val" style={{ fontSize: '1.8rem', color: '#fff', margin: 0 }}>{viralVideo.views.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="adv-chart-panel" style={{marginBottom: '20px'}}>
            <div className="adv-chart-header">
              <span className="adv-chart-title">RECENT VIDEOS VIEW COUNT (LAST 50)</span>
            </div>
            <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentVideos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: '#4ade80' }} />
                  <Area type="monotone" dataKey="views" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" isAnimationActive={true} animationBegin={100} animationDuration={2500} animationEasing="ease-in-out" style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.6))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="adv-bottom-grid" ref={bottomGridRef}>
            <div className="adv-chart-panel">
              <div className="adv-chart-header">
                <span className="adv-chart-title">CONTENT DISTRIBUTION</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                <div style={{ width: '200px', height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={`pie-${chartAnimationKey}`}>
                      {contentDistribution.length > 0 && (
                        <Pie data={contentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" isAnimationActive={true} animationBegin={300} animationDuration={2000}>
                          {contentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 5px ${entry.color}88)` }} />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flexGrow: 1, paddingLeft: '30px' }}>
                  {contentDistribution.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, boxShadow: `0 0 8px ${item.color}88` }}></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="adv-chart-panel">
              <div className="adv-chart-header">
                <span className="adv-chart-title">AVERAGE VIEWS BY UPLOAD DAY</span>
              </div>
              <div style={{ height: '220px', width: '100%', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart key={`bar-${chartAnimationKey}`} data={engagementData} barSize={35} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)' }} />
                    {engagementData.length > 0 && (
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={500} animationDuration={2000}>
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}aa)` }} />
                        ))}
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            

          </div>
        </div>
      )}
    </section>
  );
};

export default ChannelAnalyzer;
