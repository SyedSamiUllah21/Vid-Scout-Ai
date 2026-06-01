import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, animate } from 'framer-motion';
import { Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { FiArrowRight } from 'react-icons/fi';

const AURORA_COLORS = ['#13FFAA', '#1E67C6', '#CE84CF', '#DD335C'];

const Home = ({ setActiveView }) => {
  const [showAbout, setShowAbout] = useState(false);

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
      color: '#22c55e',
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
    },
    {
      id: 'view-description',
      title: 'Description Generator',
      description: 'Generate SEO-optimized YouTube descriptions with hashtags from your title and script.',
      icon: 'fa-file-lines',
      color: '#06b6d4',
      marketingTitle: 'Write Once. Rank Forever.',
      marketingText: 'Paste your title and script — our AI crafts a keyword-rich description with a compelling hook, key points, and viral hashtags ready to paste into YouTube Studio.',
      tags: [
        { icon: 'fa-solid fa-magnifying-glass-chart', text: 'SEO Optimized' },
        { icon: 'fa-solid fa-hashtag', text: 'Viral Hashtags' },
        { icon: 'fa-solid fa-copy', text: '1-Click Copy' }
      ]
    }
  ];

  const heroRef = React.useRef(null);

  // Aurora color animation
  const auroraColor = useMotionValue(AURORA_COLORS[0]);
  useEffect(() => {
    const controls = animate(auroraColor, AURORA_COLORS, {
      ease: 'easeInOut',
      duration: 10,
      repeat: Infinity,
      repeatType: 'mirror',
    });
    return () => controls.stop();
  }, []);
  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #020617 50%, ${auroraColor})`;
  const border = useMotionTemplate`1px solid ${auroraColor}`;
  const boxShadow = useMotionTemplate`0px 4px 24px ${auroraColor}`;

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

      {/* ── Aurora Hero ── */}
      <motion.section
        style={{ backgroundImage }}
        className="aurora-hero"
      >
        {/* Navbar sits inside the aurora section */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 40px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ background: '#ff2a2a', borderRadius: '6px', width: '34px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,42,42,0.5)' }}>
              <i className="fa-solid fa-play" style={{ color: '#550000', fontSize: '0.75rem', marginLeft: '2px' }}></i>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', gap: '6px' }}>
              <span style={{ color: '#fff' }}>VID SCOUT</span>
              <span style={{ color: '#a855f7', textShadow: '0 0 12px rgba(168,85,247,0.7)' }}>AI</span>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* About */}
            <button
              onClick={() => setShowAbout(true)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '9px 18px',
                color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
            >
              About
            </button>
          </div>
        </div>

        {/* Hero content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          padding: '0 20px',
        }}>
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              marginBottom: '28px',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '999px',
              padding: '10px 24px',
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 700,
              letterSpacing: '1px',
            }}
          >
            <i className="fa-brands fa-youtube" style={{ color: '#ff2a2a', fontSize: '1.1rem' }}></i>
            WELCOME TO VID SCOUT AI
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{
              maxWidth: '820px',
              width: '100%',
              fontSize: 'clamp(2.6rem, 5vw, 5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-2px',
              color: '#ffffff',
              margin: '0 auto 28px auto',
              textAlign: 'center',
            }}
          >
            The Ultimate YouTube<br />
            <span>Creator Arsenal</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              maxWidth: '580px',
              width: '100%',
              fontSize: 'clamp(1rem, 1.6vw, 1.2rem)',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.75,
              margin: '0 auto 48px auto',
              textAlign: 'center',
            }}
          >
            Powerful tools to analyze, optimize, and grow your YouTube channel with data-driven insights.
          </motion.p>

          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => {
              document.querySelector('.tools-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{
              border,
              boxShadow,
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: 'rgba(2,6,23,0.15)',
              borderRadius: '999px',
              padding: '16px 40px',
              color: '#f1f5f9',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
              letterSpacing: '0.3px',
            }}
          >
            Explore All Tools
            <FiArrowRight style={{ transition: 'transform 0.2s', fontSize: '1.1rem' }} />
          </motion.button>
        </div>

        {/* Stars canvas background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Canvas>
            <Stars radius={50} count={2500} factor={4} fade speed={2} />
          </Canvas>
        </div>
      </motion.section>

      {/* ── About Modal ── */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAbout(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(14,8,28,0.98)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '20px', padding: '40px',
                maxWidth: '560px', width: '100%',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.1)',
              }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#ff2a2a', borderRadius: '8px', width: '40px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,42,42,0.5)' }}>
                    <i className="fa-solid fa-play" style={{ color: '#550000', fontSize: '0.8rem', marginLeft: '2px' }}></i>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#fff' }}>VID SCOUT</span>
                    <span style={{ color: '#a855f7' }}>AI</span>
                  </div>
                </div>
                <button onClick={() => setShowAbout(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '34px', height: '34px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Content */}
              <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: '24px' }}>
                <strong style={{ color: '#fff' }}>VID Scout AI</strong> is an all-in-one YouTube research and content creation toolkit powered by AI. It helps creators grow faster by combining real-time trend research, SEO tools, and AI-generated content — all in one place.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                {[
                  { icon: 'fa-chart-simple', color: '#ff2a2a', label: 'Channel Analytics' },
                  { icon: 'fa-lightbulb', color: '#a855f7', label: 'Trending Ideas' },
                  { icon: 'fa-magnifying-glass', color: '#3b82f6', label: 'Keyword Research' },
                  { icon: 'fa-pen-nib', color: '#14b8a6', label: 'AI Script Writer' },
                  { icon: 'fa-image', color: '#eab308', label: 'Thumbnail Analyzer' },
                  { icon: 'fa-tags', color: '#ec4899', label: 'Tags Generator' },
                  { icon: 'fa-file-lines', color: '#06b6d4', label: 'Description Generator' },
                  { icon: 'fa-users-rectangle', color: '#22c55e', label: 'Community Posts' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <i className={`fa-solid ${f.icon}`} style={{ color: f.color, fontSize: '1rem', width: '18px', textAlign: 'center' }}></i>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: 600 }}>{f.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#a855f7', marginRight: '8px' }}></i>
                Built for YouTube creators who want to grow smarter, not harder. Powered by AI, YouTube Data, and real-time web research.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      style={{ width: '35%', flexShrink: 0, textAlign: 'left', paddingRight: '20px' }}
                    >
                      <h3 style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', color: tool.color, marginBottom: '14px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2 }}>{tool.marketingTitle}</h3>
                      <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1rem)', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 500 }}>{tool.marketingText}</p>
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
                      style={{ width: '35%', flexShrink: 0, textAlign: 'left', paddingLeft: '20px' }}
                    >
                      <h3 style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', color: tool.color, marginBottom: '14px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2 }}>{tool.marketingTitle}</h3>
                      <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1rem)', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 500 }}>{tool.marketingText}</p>
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
