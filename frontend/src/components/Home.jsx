import React from 'react';
import { motion } from 'framer-motion';

const Home = ({ setActiveView }) => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  };

  const tools = [
    {
      id: 'view-channel',
      title: 'Channel Analyzer',
      description: 'Deep dive into any YouTube channel\'s performance, growth, and competitors.',
      icon: 'fa-chart-simple',
      color: '#ff2a2a',
      marketingTitle: 'Spy On Your Rivals',
      marketingText: 'Uncover the hidden strategies driving millions of views. Reverse-engineer what works and dominate your niche.',
      tags: [
        { icon: 'fa-solid fa-chart-line', text: 'Performance Insights' },
        { icon: 'fa-solid fa-bullseye', text: 'Competitor Tracking' }
      ]
    },
    {
      id: 'view-ideas',
      title: 'Trending Ideas',
      description: 'Discover trending topics and viral video ideas based on real-time data.',
      icon: 'fa-lightbulb',
      color: '#a855f7',
      marketingTitle: 'Ride The Trend Wave',
      marketingText: 'Stop guessing what to film. Let real-time data point you to the next viral sensation before the competition catches on.',
      tags: [
        { icon: 'fa-solid fa-fire', text: 'Trend Discovery' },
        { icon: 'fa-solid fa-rocket', text: 'Viral Potential' }
      ]
    },
    {
      id: 'view-keyword',
      title: 'Keyword Explorer',
      description: 'Find high-volume, low-competition keywords to rank higher in search.',
      icon: 'fa-magnifying-glass',
      color: '#3b82f6',
      marketingTitle: 'Dominate Search Results',
      marketingText: 'Find untapped, high-volume keywords. Position your videos exactly where your hungry audience is searching.',
      tags: [
        { icon: 'fa-solid fa-magnifying-glass-chart', text: 'Keyword Research' },
        { icon: 'fa-solid fa-eye', text: 'Search Insights' }
      ]
    },
    {
      id: 'view-community',
      title: 'Community Posts',
      description: 'Keep your audience engaged between uploads.',
      icon: 'fa-users-rectangle',
      color: '#06b6d4',
      marketingTitle: 'Boost Audience Engagement',
      marketingText: 'Keep your audience engaged between uploads. Auto-generate interactive polls, questions, and behind-the-scenes posts tailored to your niche.',
      tags: [
        { icon: 'fa-solid fa-chart-pie', text: 'Interactive Polls' },
        { icon: 'fa-solid fa-comment-dots', text: 'Engaging Questions' },
        { icon: 'fa-solid fa-heart', text: 'Audience Loyalty' }
      ]
    },
    {
      id: 'view-niche',
      title: 'Niche Validator',
      description: 'Validate niche profitability and uncover high-potential opportunities.',
      icon: 'fa-crosshairs',
      color: '#f97316',
      marketingTitle: 'Validate Before You Create',
      marketingText: 'Don\'t waste time on dead ends. Analyze market demand and profitability to ensure your channel is set up for massive success.',
      tags: [
        { icon: 'fa-solid fa-scale-balanced', text: 'Market Demand' },
        { icon: 'fa-solid fa-chart-pie', text: 'Profitability Analysis' }
      ]
    },
    {
      id: 'view-script',
      title: 'AI Script Writer',
      description: 'Create engaging, SEO-optimized scripts in minutes with AI.',
      icon: 'fa-pen-nib',
      color: '#14b8a6',
      marketingTitle: 'Write Scripts That Hook',
      marketingText: 'Turn viewers into subscribers with AI-powered scripts optimized for retention and maximum engagement.',
      tags: [
        { icon: 'fa-solid fa-clock', text: 'Instant Generation' },
        { icon: 'fa-solid fa-wand-magic-sparkles', text: 'Hook Optimization' }
      ]
    },
    {
      id: 'view-thumbnail',
      title: 'Thumbnail Analyzer',
      description: 'Analyze thumbnails for CTR potential and visual effectiveness.',
      icon: 'fa-image',
      color: '#eab308',
      marketingTitle: 'Skyrocket Your CTR',
      marketingText: 'Predict and optimize thumbnail performance before you even publish. Get more clicks and dominate the feed.',
      tags: [
        { icon: 'fa-solid fa-eye', text: 'CTR Prediction' },
        { icon: 'fa-solid fa-palette', text: 'Visual Aesthetics' }
      ]
    },
    {
      id: 'view-tags',
      title: 'Tags Generator',
      description: 'Generate highly searchable, SEO-optimized tags for any video title.',
      icon: 'fa-tags',
      color: '#ec4899',
      marketingTitle: 'Hack The Algorithm',
      marketingText: 'Stop guessing which tags work. Let our AI instantly generate the perfect set of viral, high-ranking tags to explode your reach.',
      tags: [
        { icon: 'fa-solid fa-fire', text: 'Viral SEO' },
        { icon: 'fa-solid fa-magnifying-glass-chart', text: 'Search Ranking' }
      ]
    }
  ];

  const heroRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heroRef.current.style.setProperty('--mouse-x', `${x}px`);
    heroRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="home-dashboard" style={{ position: 'relative' }}>
      
      {/* Top Left Logo */}
      <div style={{ position: 'absolute', top: '35px', left: '45px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 50 }}>
        <div style={{ background: '#ff2a2a', borderRadius: '6px', width: '38px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255, 42, 42, 0.4)' }}>
          <i className="fa-solid fa-play" style={{ color: '#550000', fontSize: '0.8rem', marginLeft: '3px' }}></i>
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '0.5px', display: 'flex', gap: '8px' }}>
          <span style={{ color: '#fff' }}>VID SCOUT</span>
          <span style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.6)' }}>AI</span>
        </div>
      </div>

      <div 
        className="home-hero-full" 
        ref={heroRef} 
        onMouseMove={handleMouseMove}
      >
        <div className="hero-glow-overlay"></div>
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-badge"
          >
            <i className="fa-brands fa-youtube" style={{ color: '#ff2a2a', filter: 'drop-shadow(0 0 6px rgba(255, 42, 42, 0.6))', fontSize: '1.2rem' }}></i> 
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, opacity: 0.85, letterSpacing: '0.5px' }}>WELCOME TO</span>
              <span style={{ color: '#ffffff', fontWeight: 900, letterSpacing: '0.5px', textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>VID SCOUT</span>
              <span style={{ color: '#a855f7', fontWeight: 900, textShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>AI</span>
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero-title"
          >
            The Ultimate <br />
            <span className="gradient-text">YouTube Creator Arsenal</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hero-subtitle"
          >
            Powerful tools to analyze, optimize, and grow your YouTube channel with data-driven insights.
          </motion.p>
        </div>
        
        <motion.img 
          initial={{ opacity: 0, x: -100, y: 20, rotateZ: -10 }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: [0, -15, 0],
            rotateX: [0, 8, 0],
            rotateY: [0, -12, 0],
            rotateZ: [-10, -14, -10]
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.5 },
            x: { duration: 1, delay: 0.5 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateX: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateZ: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
          }}
          src="/mockup_left.png" 
          className="hero-mockup mockup-left" 
          alt="Graph Mockup" 
        />
        
        <motion.img 
          initial={{ opacity: 0, x: 100, y: 20, rotateZ: 10 }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: [0, -20, 0],
            rotateX: [0, 10, 0],
            rotateY: [0, 15, 0],
            rotateZ: [10, 14, 10]
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.5 },
            x: { duration: 1, delay: 0.5 },
            y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateY: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            rotateZ: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
          }}
          src="/mockup_right.png" 
          className="hero-mockup mockup-right" 
          alt="Chart Mockup" 
        />

        <div className="wave-bg"></div>
      </div>

      <div className="tools-section">
        <div className="section-header">
          <i className="fa-solid fa-bolt" style={{color: '#eab308'}}></i>
          <h3>CHOOSE A TOOL TO GET STARTED</h3>
        </div>

        <div className="tool-cards-grid">
          {tools.map((tool, index) => {
            // Alternating layouts: Even indices (Card 1, 3, 5) align right and slide in from right.
            // Odd indices (Card 2, 4, 6) align left and slide in from left.
            const isRightAligned = index % 2 === 0;
            const initialX = isRightAligned ? 150 : -150;

            return (
              <React.Fragment key={tool.id}>
                <div className="tool-card-row">
                  
                  {isRightAligned && (
                    <motion.div 
                      className="marketing-copy"
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.3 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      style={{ flex: 1, textAlign: 'right', paddingRight: '20px' }}
                    >
                      <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', color: tool.color, marginBottom: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>{tool.marketingTitle}</h3>
                      <p style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.15rem)', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500 }}>{tool.marketingText}</p>
                    </motion.div>
                  )}

                  <motion.div
                    className={`tool-card-grid-item glass-card`}
                    initial={{ opacity: 0, x: initialX }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, amount: 0.15 }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.1 }}
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    style={{
                      margin: '0',
                      borderColor: `rgba(${hexToRgb(tool.color)}, 0.35)`,
                      boxShadow: `0 20px 40px rgba(${hexToRgb(tool.color)}, 0.12), 0 1px 1px rgba(255, 255, 255, 0.05)`,
                      background: 'rgba(22, 27, 34, 0.6)',
                      '--tool-color': tool.color,
                      '--tool-color-rgb': hexToRgb(tool.color)
                    }}
                  >
                    <div className="card-main-content">
                      {isRightAligned && (
                        <motion.div 
                          className="card-arrow-action arrow-right-aligned" 
                          onClick={() => setActiveView(tool.id)} 
                          style={{ marginRight: '24px', marginLeft: 0 }}
                          initial={{ opacity: 0, x: 30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4, type: 'spring' }}
                        >
                          <div 
                            className="arrow-circle" 
                            style={{ 
                              borderColor: `rgba(${hexToRgb(tool.color)}, 0.4)`, 
                              boxShadow: `0 0 20px rgba(${hexToRgb(tool.color)}, 0.3)`,
                              background: `rgba(${hexToRgb(tool.color)}, 0.15)`
                            }}
                          >
                            <i className="fa-solid fa-chevron-right" style={{ color: 'rgba(255, 255, 255, 0.7)' }}></i>
                          </div>
                        </motion.div>
                      )}

                      <div 
                        className="card-icon" 
                        style={{ 
                          borderColor: `${tool.color}30`, 
                          boxShadow: `0 0 20px ${tool.color}15`,
                          background: `linear-gradient(135deg, ${tool.color}0a, ${tool.color}18)`,
                          marginRight: isRightAligned ? '0' : '24px',
                          marginLeft: isRightAligned ? '24px' : '0'
                        }}
                      >
                        <i className={`fa-solid ${tool.icon}`} style={{ color: tool.color }}></i>
                      </div>
                      
                      <div className="card-details" style={{ textAlign: isRightAligned ? 'right' : 'left' }}>
                        <h2>{tool.title}</h2>
                        <p>{tool.description}</p>
                        <button 
                          className="card-launch-btn-small" 
                          style={{ 
                            borderColor: `${tool.color}40`, 
                            color: tool.color,
                            background: `linear-gradient(135deg, ${tool.color}05, ${tool.color}12)`,
                            alignSelf: isRightAligned ? 'flex-end' : 'flex-start'
                          }}
                          onClick={() => setActiveView(tool.id)}
                        >
                          Launch Tool <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      </div>

                      {!isRightAligned && (
                        <motion.div 
                          className="card-arrow-action arrow-left-aligned" 
                          onClick={() => setActiveView(tool.id)} 
                          style={{ marginLeft: 'auto', marginRight: 0 }}
                          initial={{ opacity: 0, x: -30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4, type: 'spring' }}
                        >
                          <div 
                            className="arrow-circle" 
                            style={{ 
                              borderColor: `rgba(${hexToRgb(tool.color)}, 0.4)`, 
                              boxShadow: `0 0 20px rgba(${hexToRgb(tool.color)}, 0.3)`,
                              background: `rgba(${hexToRgb(tool.color)}, 0.15)`
                            }}
                          >
                            <i className="fa-solid fa-chevron-left" style={{ color: 'rgba(255, 255, 255, 0.7)' }}></i>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {tool.tags.length > 0 && (
                      <div className="card-tags-row" style={{ justifyContent: isRightAligned ? 'flex-end' : 'flex-start' }}>
                        {tool.tags.map((tag, i) => (
                          <div key={i} className="card-tag-item">
                            <i className={tag.icon} style={{ color: tool.color }}></i>
                            <span>{tag.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {!isRightAligned && (
                    <motion.div 
                      className="marketing-copy"
                      initial={{ opacity: 0, x: 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.3 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      style={{ flex: 1, textAlign: 'left', paddingLeft: '20px' }}
                    >
                      <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', color: tool.color, marginBottom: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>{tool.marketingTitle}</h3>
                      <p style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.15rem)', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500 }}>{tool.marketingText}</p>
                    </motion.div>
                  )}

                </div>
                {index < tools.length - 1 && (
                  <div className="flow-arrow-connector">
                    <i className="fa-solid fa-arrow-down"></i>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;
