import React, { useState } from 'react';
import { requestJson } from '../lib/api';

const themeColor = '#06b6d4'; // Cyan

const DescriptionGenerator = () => {
  const [title, setTitle]     = useState('');
  const [script, setScript]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);
  const [copied, setCopied]   = useState(false);

  const handleGenerate = async () => {
    if (!title.trim()) { setError('Please enter a video title.'); return; }
    if (!script.trim()) { setError('Please enter your video script or summary.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await requestJson('/api/description-generate', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), script: script.trim() }),
      }, 60000);
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to generate description.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const full = `${result.title}\n\n${result.description}\n\n${result.hashtags.join(' ')}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Results view ────────────────────────────────────────────────────────────
  if (result) {

    const CopyBtn = ({ text, small }) => {
      const [c, setC] = useState(false);
      const copy = () => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); };
      return (
        <button onClick={copy} style={{
          background: c ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${c ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px',
          padding: small ? '7px 10px' : '9px 12px',
          color: c ? '#4ade80' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.78rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          flexShrink: 0,
        }}>
          <i className={c ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i>
          {!small && (c ? 'Copied' : 'Copy')}
        </button>
      );
    };

    const fullText = `${result.title}\n\n${result.description}\n\n${result.hashtags.join(' ')}`;

    return (
      <section className="tool-view active">
        <div className="dashboard">
          <button className="dash-back-btn" onClick={() => setResult(null)}>← Back to Generator</button>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── Header card — purple + cyan gradient ── */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '16px',
              padding: '22px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 30px rgba(168,85,247,0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(6,182,212,0.25))',
                  border: '1px solid rgba(168,85,247,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 24px rgba(168,85,247,0.3)',
                }}>
                  <i className="fa-solid fa-file-circle-check" style={{ color: '#c084fc', fontSize: '1.4rem' }}></i>
                </div>
                <div>
                  <p style={{ fontSize: '0.62rem', fontWeight: 700, color: themeColor, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 5px 0' }}>
                    SEO-OPTIMIZED DESCRIPTION
                  </p>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 3px 0' }}>
                    Ready to paste into YouTube Studio
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                    This description is SEO-optimized to boost visibility and engagement.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '12px 22px',
                  background: copied ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #a855f7, #06b6d4)',
                  color: copied ? '#4ade80' : '#fff',
                  border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(168,85,247,0.5)'}`,
                  borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                  boxShadow: copied ? 'none' : '0 4px 20px rgba(168,85,247,0.35)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i>
                {copied ? 'Copied!' : 'Copy Full Description'}
              </button>
            </div>

            {/* ── Title card — yellow ── */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(234,179,8,0.25)',
              borderRadius: '16px', padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: '18px',
              boxShadow: '0 2px 24px rgba(234,179,8,0.08)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(249,115,22,0.2))',
                border: '1px solid rgba(234,179,8,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(234,179,8,0.2)',
              }}>
                <i className="fa-solid fa-film" style={{ color: '#eab308', fontSize: '1.1rem' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#eab308', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 7px 0' }}>
                  VIDEO TITLE
                </p>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: '1.5', wordBreak: 'break-word', textAlign: 'left' }}>
                  {result.title}
                </p>
              </div>
              <CopyBtn text={result.title} small />
            </div>

            {/* ── Description card — green ── */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: '16px', padding: '20px 24px',
              display: 'flex', alignItems: 'flex-start', gap: '18px',
              boxShadow: '0 2px 24px rgba(34,197,94,0.08)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(6,182,212,0.15))',
                border: '1px solid rgba(34,197,94,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(34,197,94,0.2)',
              }}>
                <i className="fa-solid fa-align-left" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px 0' }}>
                  DESCRIPTION
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <p key={i} style={{
                      fontSize: '0.95rem',
                      color: '#ffffff',
                      margin: 0,
                      lineHeight: '1.75',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'left',
                      width: '100%',
                    }}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <CopyBtn text={result.description} small />
            </div>

            {/* ── Hashtags card — blue ── */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '16px', padding: '20px 24px',
              display: 'flex', alignItems: 'flex-start', gap: '18px',
              boxShadow: '0 2px 24px rgba(59,130,246,0.08)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.2))',
                border: '1px solid rgba(59,130,246,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(59,130,246,0.2)',
              }}>
                <i className="fa-solid fa-hashtag" style={{ color: '#3b82f6', fontSize: '1.2rem' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px 0' }}>
                  HASHTAGS
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.hashtags.map((tag, i) => {
                    const tagColors = ['#3b82f6','#06b6d4','#a855f7','#22c55e'];
                    const c = tagColors[i % tagColors.length];
                    return (
                      <span key={i} style={{
                        padding: '7px 16px',
                        background: `${c}15`,
                        border: `1px solid ${c}40`,
                        borderRadius: '20px',
                        color: c,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}>
                        {tag.toLowerCase()}
                      </span>
                    );
                  })}
                </div>
              </div>
              <CopyBtn text={result.hashtags.join(' ')} small />
            </div>

            {/* ── Pro Tip — orange accent ── */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: '12px', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <i className="fa-solid fa-star" style={{ color: '#f97316', fontSize: '1rem', flexShrink: 0 }}></i>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: '1.5' }}>
                <strong style={{ color: '#f97316' }}>Pro Tip:</strong> A strong title, description, and hashtags can significantly increase your video's discoverability.
              </p>
            </div>

          </div>
        </div>
      </section>
    );
  }

  // ── Input view ──────────────────────────────────────────────────────────────
  return (
    <section className="tool-view active">
      <div id="inputCard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>

        <div className="top-badge">
          <i className="fa-solid fa-file-lines"></i> DESCRIPTION GENERATOR
        </div>

        <h1 className="hero-title">
          Write Once. <span className="gradient-text">Rank Forever.</span>
        </h1>
        <p className="hero-subtitle">
          Paste your title and script — our AI writes a fully SEO-optimized YouTube<br />
          description with a compelling intro, key points, and viral hashtags.
        </p>

        <div className="analyzer-wrapper">
          <div className="pulse-icon" style={{ borderColor: `${themeColor}80`, boxShadow: `0 0 20px ${themeColor}44` }}>
            <i className="fa-solid fa-file-lines" style={{ color: themeColor }}></i>
          </div>

          <div className="analyzer-card-new" style={{ borderColor: `${themeColor}18` }}>

            {/* Title input */}
            <div className="form-group">
              <label className="form-label">VIDEO TITLE</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-heading" style={{ color: themeColor }}></i>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. I Survived 100 Days in the Amazon Rainforest"
                  style={{ borderColor: `${themeColor}20` }}
                  disabled={loading}
                />
              </div>
              <span className="input-hint">Enter the exact title of your video.</span>
            </div>

            {/* Script input */}
            <div className="form-group">
              <label className="form-label">SCRIPT / SUMMARY</label>
              <div className="input-wrapper" style={{ alignItems: 'flex-start' }}>
                <i className="fa-solid fa-scroll" style={{ color: themeColor, marginTop: '14px' }}></i>
                <textarea
                  className="form-input"
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder="Paste your full script or a short summary of what the video covers..."
                  style={{
                    borderColor: `${themeColor}20`,
                    minHeight: '140px',
                    resize: 'vertical',
                    lineHeight: '1.6',
                    paddingTop: '12px',
                  }}
                  disabled={loading}
                />
              </div>
              <span className="input-hint">The more detail you provide, the better the description.</span>
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                background: `linear-gradient(to right, ${themeColor}, #0891b2)`,
                boxShadow: `0 4px 15px ${themeColor}44`,
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span className="btn-text">{loading ? 'Writing Description...' : 'Generate SEO Optimized Description'}</span>
            </button>

            {error && (
              <div className="error" style={{ marginTop: '15px', color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon" style={{ color: themeColor, background: `${themeColor}18` }}>
                  <i className="fa-solid fa-magnifying-glass-chart"></i>
                </div>
                <div className="feature-text"><h5>SEO Optimized</h5><p>Keyword-rich copy</p></div>
              </div>
              <div className="feature-item">
                <div className="feature-icon" style={{ color: themeColor, background: `${themeColor}18` }}>
                  <i className="fa-solid fa-hashtag"></i>
                </div>
                <div className="feature-text"><h5>Viral Hashtags</h5><p>3–4 trending tags</p></div>
              </div>
              <div className="feature-item">
                <div className="feature-icon" style={{ color: themeColor, background: `${themeColor}18` }}>
                  <i className="fa-solid fa-copy"></i>
                </div>
                <div className="feature-text"><h5>1-Click Copy</h5><p>Paste into Studio</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-note">
          <i className="fa-solid fa-lock"></i>
          Crafted to match YouTube's SEO ranking signals.
        </div>
      </div>
    </section>
  );
};

export default DescriptionGenerator;
