import React, { useState } from 'react';
import { requestJson } from '../lib/api';

const CommunityPosts = () => {
  const [topic, setTopic] = useState('');
  const [pollType, setPollType] = useState('Text Poll');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const themeColor = '#06b6d4'; // Cyan aesthetic

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic or niche first.");
      return;
    }

    setLoading(true);
    setError(null);
    setPosts([]);
    setCopiedIndex(null);

    try {
      const data = await requestJson('/api/community-generate', {
        method: 'POST',
        body: JSON.stringify({ topic, poll_type: pollType })
      });
      
      if (data.posts && Array.isArray(data.posts)) {
        setPosts(data.posts);
      } else {
        throw new Error(data.error || "Invalid response format from server.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPost = (post, index) => {
    let copyText = '';
    if (post.type === 'Poll') {
      copyText = `${post.content}\n\nOptions:\n${post.options?.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
    } else if (post.type === 'Quiz') {
      copyText = `${post.content}\n\nOptions:\n${post.options?.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nCorrect Answer: ${post.correct_answer}\nExplanation: ${post.explanation}`;
    } else {
      copyText = post.content;
    }

    navigator.clipboard.writeText(copyText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="tool-view active">
      {posts.length === 0 ? (
        <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          
          <div className="top-badge">
            <i className="fa-solid fa-users-rectangle"></i> COMMUNITY POST GENERATOR
          </div>
          
          <h1 className="hero-title">
            Boost Audience <span className="gradient-text">Engagement.</span>
          </h1>
          
          <p className="hero-subtitle">
            Our AI will generate 3 highly interactive Community Tab posts (a poll, an engaging question, and a story) tailored to your niche to keep your audience hooked between uploads.
          </p>

          <div className="analyzer-wrapper">
            <div className="pulse-icon" style={{ borderColor: 'rgba(6, 182, 212, 0.5)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}>
              <i className="fa-solid fa-users-rectangle" style={{ color: themeColor }}></i>
            </div>
            
            <div className="analyzer-card-new" style={{ borderColor: 'rgba(6, 182, 212, 0.1)' }}>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">TOPIC OR NICHE</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-hashtag" style={{ color: themeColor }}></i>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g., Tech Reviews, Fitness Tips, Minimalist Setup"
                    style={{ borderColor: 'rgba(6, 182, 212, 0.15)' }}
                  />
                </div>
                <span className="input-hint">Enter your channel's niche or a specific topic you want to post about.</span>
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label">POLL TYPE</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    onClick={() => setPollType('Text Poll')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: pollType === 'Text Poll' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${pollType === 'Text Poll' ? themeColor : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '10px',
                      color: pollType === 'Text Poll' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: pollType === 'Text Poll' ? `0 0 15px rgba(6, 182, 212, 0.2)` : 'none'
                    }}
                  >
                    <i className="fa-solid fa-chart-pie" style={{ color: pollType === 'Text Poll' ? themeColor : 'rgba(255, 255, 255, 0.3)' }}></i>
                    Text Poll
                  </button>
                  <button
                    onClick={() => setPollType('Quiz')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: pollType === 'Quiz' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${pollType === 'Quiz' ? themeColor : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '10px',
                      color: pollType === 'Quiz' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: pollType === 'Quiz' ? `0 0 15px rgba(6, 182, 212, 0.2)` : 'none'
                    }}
                  >
                    <i className="fa-solid fa-clipboard-question" style={{ color: pollType === 'Quiz' ? themeColor : 'rgba(255, 255, 255, 0.3)' }}></i>
                    Quiz
                  </button>
                </div>
                <span className="input-hint" style={{ display: 'block', marginTop: '12px' }}>Choose whether you want to ask for opinions or test their knowledge.</span>
              </div>

              <button 
                className="btn-generate" 
                onClick={handleGenerate} 
                disabled={loading}
                style={{ 
                  background: `linear-gradient(to right, ${themeColor}, #0891b2)`,
                  boxShadow: `0 4px 15px ${themeColor}60`
                }}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span className="btn-text">{loading ? 'Generating Posts...' : 'Generate Community Posts'}</span>
              </button>

              {error && <div className="error" style={{marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center'}}>{error}</div>}

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(6, 182, 212, 0.1)' }}><i className="fa-solid fa-chart-pie"></i></div>
                  <div className="feature-text">
                    <h5>Interactive Polls</h5>
                    <p>Drive instant votes</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(6, 182, 212, 0.1)' }}><i className="fa-solid fa-comment-dots"></i></div>
                  <div className="feature-text">
                    <h5>Engaging Questions</h5>
                    <p>Spark comment sections</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ color: themeColor, background: 'rgba(6, 182, 212, 0.1)' }}><i className="fa-solid fa-heart"></i></div>
                  <div className="feature-text">
                    <h5>Audience Loyalty</h5>
                    <p>Build strong communities</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-note">
            <i className="fa-solid fa-lock"></i>
            Designed to match the YouTube Community Tab algorithm.
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <button className="dash-back-btn" onClick={() => setPosts([])} style={{ color: '#ec4899' }}>← Back to Generator</button>
          
          <div className="results-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '16px', 
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.2))', 
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' 
                }}>
                  <i className="fa-solid fa-users-rectangle" style={{ color: '#d8b4fe', fontSize: '1.8rem' }}></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Community Posts</h1>
                    <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(6, 182, 212, 0.3)' }}>3 Generated</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', margin: 0, maxWidth: '500px', lineHeight: '1.5' }}>
                    Create engaging Community posts to boost interaction, get feedback, and build a stronger connection with your audience.
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
              
              {posts.map((post, idx) => {
                // Determine styling based on type
                let typeColor, typeGradient, typeIcon, typeDesc;
                if (post.type === 'Poll' || post.type === 'Quiz') {
                  typeColor = '#ec4899'; // Pink
                  typeGradient = 'linear-gradient(135deg, #f43f5e, #c026d3)';
                  typeIcon = post.type === 'Quiz' ? 'fa-clipboard-question' : 'fa-chart-simple';
                  typeDesc = post.type === 'Quiz' ? 'Test your audience\'s knowledge with a fun quiz.' : 'Ask your audience a question and get instant feedback.';
                } else if (post.type === 'Question') {
                  typeColor = '#3b82f6'; // Blue
                  typeGradient = 'linear-gradient(135deg, #3b82f6, #4338ca)';
                  typeIcon = 'fa-circle-question';
                  typeDesc = 'Start a conversation by asking a thought-provoking question.';
                } else {
                  typeColor = '#14b8a6'; // Teal
                  typeGradient = 'linear-gradient(135deg, #14b8a6, #0f766e)';
                  typeIcon = 'fa-book-open';
                  typeDesc = 'Share behind-the-scenes stories and connect on a deeper level.';
                }

                return (
                  <div key={idx} style={{ 
                    background: '#000000', 
                    border: `1px solid rgba(255,255,255,0.05)`, 
                    borderRadius: '16px', 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    boxShadow: `0 8px 30px rgba(0,0,0,0.3), inset 0 0 20px ${typeColor}10`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Glowing Top Border */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: typeGradient, opacity: 0.7 }}></div>
                    
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{ color: typeColor, fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={`fa-solid ${typeIcon}`}></i> {post.type}
                      </span>
                      
                      <button 
                        onClick={() => handleCopyPost(post, idx)}
                        style={{
                          background: copiedIndex === idx ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: copiedIndex === idx ? '#4ade80' : '#fff',
                          border: `1px solid ${copiedIndex === idx ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {copiedIndex === idx ? <><i className="fa-solid fa-check"></i> Copied</> : <><i className="fa-regular fa-copy"></i> Copy</>}
                      </button>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      {typeDesc}
                    </p>

                    {/* Inner Dark Card */}
                    <div style={{ 
                      background: '#050505', 
                      borderRadius: '12px', 
                      padding: '20px', 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '1px solid rgba(255,255,255,0.03)',
                      marginBottom: '20px'
                    }}>
                      <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: (post.type === 'Poll' || post.type === 'Quiz') ? '20px' : '0' }}>
                        {post.content}
                      </p>

                      {/* Poll Options */}
                      {(post.type === 'Poll' || post.type === 'Quiz') && post.options && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {post.options.map((opt, oIdx) => {
                            const isCorrect = post.type === 'Quiz' && opt === post.correct_answer;
                            const optionIcons = ['fa-tag', 'fa-location-dot', 'fa-leaf', 'fa-star'];
                            const optIconColor = [typeColor, '#ef4444', '#22c55e', '#eab308'];
                            
                            return (
                              <div key={oIdx} style={{ 
                                background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'transparent', 
                                border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.1)'}`, 
                                padding: '12px 16px', 
                                borderRadius: '8px', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: isCorrect ? '#4ade80' : 'rgba(255,255,255,0.7)',
                                fontSize: '0.85rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <i className="fa-regular fa-circle" style={{ color: isCorrect ? '#4ade80' : 'rgba(255,255,255,0.3)', fontSize: '1rem' }}></i>
                                  <span>{opt}</span>
                                </div>
                                {isCorrect ? (
                                  <i className="fa-solid fa-circle-check"></i>
                                ) : (
                                  <i className={`fa-solid ${optionIcons[oIdx % 4]}`} style={{ color: optIconColor[oIdx % 4], opacity: 0.7 }}></i>
                                )}
                              </div>
                            );
                          })}
                          
                          {post.type === 'Quiz' && post.explanation && (
                            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid #22c55e` }}>
                              <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase', marginBottom: '4px' }}>Explanation</span>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{post.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Giant Icon for Question */}
                      {post.type === 'Question' && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
                          <i className="fa-solid fa-question" style={{ 
                            fontSize: '6rem', 
                            background: typeGradient, 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent',
                            filter: `drop-shadow(0 0 30px ${typeColor}80)`
                          }}></i>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Button */}
                    <button 
                      onClick={() => handleCopyPost(post, idx)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: typeGradient,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 15px ${typeColor}40`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${typeColor}60`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 4px 15px ${typeColor}40`;
                      }}
                    >
                      <i className="fa-solid fa-bolt"></i> Use This {post.type}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pro Tip Footer */}
            <div style={{ 
              background: '#000000', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '12px', 
              padding: '16px 24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9rem',
              maxWidth: '800px'
            }}>
              <i className="fa-regular fa-star" style={{ color: '#a855f7', fontSize: '1.2rem' }}></i>
              <p style={{ margin: 0 }}><strong>Pro Tip:</strong> Mix different types of posts to keep your community engaged and conversations flowing!</p>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default CommunityPosts;
