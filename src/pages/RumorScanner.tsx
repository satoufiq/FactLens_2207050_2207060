import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Link as LinkIcon, ArrowRight, CheckCircle, Zap, ShieldCheck, Radar } from 'lucide-react';
import UploadZone from '@/components/scanner/UploadZone';
import EvidenceTabCanvas from '@/components/zebeyond/EvidenceTabCanvas';
import { useLanguage } from '@/context/LanguageContext';

export default function RumorScanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialText = (location.state as any)?.text || '';
  const { t } = useLanguage();

  const modes = [
    { key: 'text', icon: FileText, label: t('টেক্সট দাবি', 'Text Claim'), sub: t('বাংলা বা ইংরেজি', 'Bengali or English') },
    { key: 'image', icon: Upload, label: t('স্ক্রিনশট', 'Screenshot'), sub: t('ওসিআর অটো এক্সট্রাক্ট', 'OCR auto-extract') },
    { key: 'url', icon: LinkIcon, label: t('নিউজ ইউআরএল', 'Article URL'), sub: t('লিংক স্ক্যান', 'News link scan') },
  ] as const;



  const [mode, setMode] = useState<'text' | 'image' | 'url'>('text');
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const isReady = (mode === 'text' && text.trim().length > 3) ||
    (mode === 'image' && file !== null) ||
    (mode === 'url' && url.startsWith('http'));

  const analyze = () => {
    if (!isReady) return;
    setLoading(true);
    setTimeout(() => {
      if (mode === 'image') navigate('/app/ocr-review', { state: { file } });
      else navigate('/app/result/rumor/scan-001', { state: { claimText: text || url } });
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 20, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00D2C2, transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#00D2C2', background: 'rgba(0,210,194,0.1)', border: '1px solid rgba(0,210,194,0.25)', borderRadius: 20, padding: '3px 12px', marginBottom: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('দাবি যাচাইকরণ — ইঞ্জিন ০১', 'CLAIM VERIFICATION — MODULE 01')}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>{t('গুজব ও দাবি স্ক্যানার', 'Rumor / Claim Scanner')}</h1>
              <p style={{ fontSize: 13.5, color: '#00D2C2', marginTop: 6, fontFamily: '"Noto Sans Bengali", sans-serif' }}>{t('সন্দেহজনক সংবাদ বা ভাইরাল পোস্টের সত্যতা সরকারি গেজেটের সাহায্যে নিশ্চিত করুন।', 'Verify claims against Ministry gazettes, university notices, and press archives using BangaBERT NLP.')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[{ v: '5', l: t('পাইপলাইন ধাপ', 'Pipeline Stages') }, { v: '48', l: t('প্রমাণ উৎস', 'Evidence Sources') }, { v: '99.4%', l: t('নির্ভুলতা', 'Accuracy') }].map((s, i) => (
                <div key={i} style={{ background: '#060A09', border: '1px solid #1B2923', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#8E9E97', textTransform: 'uppercase', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Input Panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Mode selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'monospace' }}>{t('ইনপুট মোড নির্বাচন করুন', 'SELECT INPUT MODE')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#060A09', border: '1px solid #1B2923', borderRadius: 14, padding: 6 }}>
                {modes.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMode(m.key)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        background: active ? '#00E599' : 'transparent',
                        color: active ? '#040A07' : '#8E9E97',
                        fontWeight: 700,
                        fontSize: 12,
                        transition: 'all 0.2s',
                        boxShadow: active ? '0 0 16px rgba(0,229,153,0.3)' : 'none',
                      }}
                    >
                      <Icon size={18} />
                      <span>{m.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>{m.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input area */}
            <AnimatePresence mode="wait">
              {mode === 'text' && (
                <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#E2E8E5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('দাবির বিবরণ লিখুন:', 'Enter Claim Text:')}</label>
                    <button
                      onClick={() => setText(t('আগামীকাল দেশের সব বিশ্ববিদ্যালয় বন্ধ থাকবে।', 'All universities in the country will be closed tomorrow.'))}
                      style={{ fontSize: 11, color: '#00E599', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ↗ {t('ডেমো পোস্ট লোড করুন', 'Load demo claim')}
                    </button>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("বাংলা বা ইংরেজিতে পোস্টের দাবি লিখুন... যেমন: 'আগামীকাল সব বিশ্ববিদ্যালয় বন্ধ থাকবে।'", "Paste Bengali or English claim here... e.g. 'All universities will be closed tomorrow.'")}
                    rows={6}
                    style={{
                      width: '100%',
                      background: '#060A09',
                      border: '1px solid #1B2923',
                      borderRadius: 12,
                      padding: '14px 16px',
                      fontSize: 14,
                      color: '#E2E8E5',
                      fontFamily: '"Noto Sans Bengali", Inter, sans-serif',
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.6,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  {text.trim() && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#00E599' }}>
                      <CheckCircle size={12} />
                      {text.trim().split(/\s+/).length} {t('টি শব্দ · ভাষা স্বয়ংক্রিয়ভাবে সনাক্ত করা হচ্ছে', 'words · auto-detecting language')}
                    </div>
                  )}
                </motion.div>
              )}

              {mode === 'image' && (
                <motion.div key="img" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#E2E8E5', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Upload News Screenshot:</label>
                  <UploadZone onFileSelect={(f: File) => setFile(f)} />
                  {file && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#00E599' }}>
                      <CheckCircle size={13} /> {file.name} — ready for OCR
                    </div>
                  )}
                </motion.div>
              )}

              {mode === 'url' && (
                <motion.div key="url" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#E2E8E5', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paste News Article URL:</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://prothomalo.com/... or https://facebook.com/..."
                    style={{
                      width: '100%',
                      background: '#060A09',
                      border: '1px solid #1B2923',
                      borderRadius: 12,
                      padding: '14px 16px',
                      fontSize: 14,
                      color: '#E2E8E5',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#00E599'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#1B2923'; }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyze button */}
            <button
              onClick={analyze}
              disabled={!isReady || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '15px 24px',
                background: isReady && !loading ? '#00E599' : '#1B2923',
                color: isReady && !loading ? '#040A07' : '#5A6E64',
                border: 'none',
                borderRadius: 40,
                fontSize: 14,
                fontWeight: 800,
                cursor: isReady && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: isReady && !loading ? '0 0 24px rgba(0,229,153,0.3)' : 'none',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid #040A0740', borderTop: '2px solid #040A07', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Initializing BangaBERT Analysis...
                </>
              ) : (
                <><Zap size={17} /> Verify Claim Against Evidence <ArrowRight size={17} /></>
              )}
            </button>
          </div>
        </motion.div>

        {/* Gazette Scope Radar Sweep HUD Panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #1B2923' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                {t('গেজেট আর্কাইভ স্কোপ', 'GAZETTE ARCHIVE SCOPE')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#00E599', fontFamily: 'monospace', background: 'rgba(0,229,153,0.1)', border: '1px solid rgba(0,229,153,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                <Radar size={12} className="animate-spin" />
                {t('স্কোপ সক্রিয়', 'SCOPE ACTIVE')}
              </div>
            </div>

            {/* ── GAZETTE SCOPE RADAR SWEEP ANIMATION ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 10px', background: '#060A09', borderRadius: 16, border: '1px solid rgba(0,229,153,0.35)', position: 'relative', overflow: 'hidden' }}>
              
              {/* Circular Radar Scope Viewport */}
              <div style={{ position: 'relative', width: 180, height: 180, borderRadius: '50%', background: '#0A0F0D', border: '2px solid rgba(0,229,153,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,229,153,0.15)' }}>
                
                {/* Concentric Radar Rings */}
                <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', border: '1px dashed rgba(0,229,153,0.3)' }} />
                <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '1px dashed rgba(0,229,153,0.4)' }} />
                <div style={{ position: 'absolute', width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(0,229,153,0.6)' }} />

                {/* Crosshairs */}
                <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(0,229,153,0.2)' }} />
                <div style={{ position: 'absolute', height: '100%', width: 1, background: 'rgba(0,229,153,0.2)' }} />

                {/* 360-Degree Rotating Radar Sweep Blade */}
                <motion.div
                  style={{
                    position: 'absolute',
                    width: '50%',
                    height: '50%',
                    top: 0,
                    right: 0,
                    transformOrigin: 'bottom left',
                    background: 'conic-gradient(from 0deg at 0% 100%, rgba(0,229,153,0.45) 0deg, rgba(0,210,194,0.15) 45deg, transparent 90deg)',
                    borderLeft: '2px solid #00E599',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />

                {/* Blinking Evidence Pings on Scope */}
                <div style={{ position: 'absolute', top: 40, left: 50, width: 8, height: 8, borderRadius: '50%', background: '#00E599', boxShadow: '0 0 10px #00E599', animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                <div style={{ position: 'absolute', bottom: 45, right: 40, width: 6, height: 6, borderRadius: '50%', background: '#00D2C2', boxShadow: '0 0 8px #00D2C2' }} />
              </div>

              {/* Status Info */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>
                  <span>{t('পিআইডি গেজেট ম্যাচিং...', 'PID GAZETTE MATCHING...')}</span>
                  <span>{loading ? '84%' : '100%'}</span>
                </div>
                <div style={{ height: 6, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, #00D2C2, #00E599)', borderRadius: 99 }} animate={{ width: loading ? '84%' : '100%' }} />
                </div>
              </div>

            </div>

            <div style={{ background: 'rgba(0,229,153,0.06)', border: '1px solid rgba(0,229,153,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={14} color="#00E599" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{t('অফিসিয়াল প্রমাণ গ্যারান্টি', 'Official Evidence Guarantee')}</span>
              </div>
              <p style={{ fontSize: 11.5, color: '#8E9E97', lineHeight: 1.5 }}>
                {t('সমস্ত রায়ে সরকারি গেজেট পৃষ্ঠা নম্বর ও সংবাদপত্র আর্কাইভ সংযোগ প্রদান করা হয়।', 'All verdicts cite specific gazette page numbers and article archive links for full auditability.')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Evidence Sources */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div style={{ paddingTop: 4, borderTop: '1px solid #1B2923' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: 4 }}>EVIDENCE REPOSITORIES</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Official Archives & Sources</h3>
            <p style={{ fontSize: 13, color: '#8E9E97', marginTop: 4 }}>Click to explore the official archives connected to FactLens.</p>
          </div>
          <EvidenceTabCanvas />
        </div>
      </motion.div>

    </div>
  );
}
