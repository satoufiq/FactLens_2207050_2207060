import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Cpu
} from 'lucide-react';

interface LocationState {
  confirmedText?: string;
  claimText?: string;
}

const scanStages = [
  { label: 'Ingesting claim & extracting entities...', color: '#8E9E97', pct: 20 },
  { label: 'Running BangaBERT NLP stance model...', color: '#00D2C2', pct: 50 },
  { label: 'PID Gazette vector database search...', color: '#00E599', pct: 80 },
  { label: 'Generating auditable Bengali verdict report...', color: '#00E599', pct: 100 },
];

export default function RumorProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const claimText = state.confirmedText || state.claimText || 'আগামীকাল সারাদেশে সকল বিশ্ববিদ্যালয় ও শিক্ষাপ্রতিষ্ঠান বন্ধ ঘোষণা করেছে সরকার।';

  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    if (stage < scanStages.length - 1) {
      const t = setTimeout(() => setStage(s => s + 1), 1100);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDone(true);
        setTimeout(() => {
          navigate('/app/result/rumor/scan-001', { state: { claimText } });
        }, 1200);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [stage, isPaused, navigate, claimText]);

  const current = scanStages[stage];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1000, margin: '0 auto', width: '100%', paddingBottom: 48, alignItems: 'center', textAlign: 'center' }}>

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 700 }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', border: '1px solid rgba(0, 229, 153, 0.3)', padding: '4px 14px', borderRadius: 99 }}>
          <Sparkles size={14} style={{ color: '#00E599' }} />
          <span>REAL-TIME GASETTE PIPELINE RUNNING</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
          Claim Verification Pipeline
        </h1>
        <p style={{ fontSize: 14, color: '#00E599', margin: 0 }}>
          ফ্যাক্টলেন্স রিয়েল-টাইমে সরকারি পরিপত্র ও প্রেস বিজ্ঞপ্তির সাথে দাবিটি মিলিয়ে দেখছে।
        </p>
      </motion.div>

      {/* ── HERO-STYLE SCANNER CONSOLE CARD (LIKE LANDING PAGE HERO) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: 820,
          background: '#0A0F0D',
          border: '1px solid rgba(0, 229, 153, 0.35)',
          borderRadius: 24,
          boxShadow: '0 0 60px rgba(0, 229, 153, 0.15)',
          overflow: 'hidden',
          textAlign: 'left',
        }}
      >
        {/* Top Browser Chrome Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#060A09', borderBottom: '1px solid #1B2923' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', marginLeft: 8 }}>factlens://verify → gazette.pid.gov.bd</span>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{ background: '#0F1714', border: '1px solid #1B2923', color: '#00E599', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '4px 12px', borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Console Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Submitted Claim Statement Box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>SUBMITTED CLAIM INPUT</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.5 }}>
              "{claimText}"
            </p>
          </div>

          {/* Stage Progress Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scanStages.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, opacity: i <= stage ? 1 : 0.25, transition: 'all 0.5s ease' }}>
                {i < stage || done ? (
                  <CheckCircle size={16} style={{ color: '#00E599', flexShrink: 0 }} />
                ) : i === stage ? (
                  <motion.div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #00E599', borderTopColor: 'transparent', flexShrink: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid #1B2923', flexShrink: 0 }} />
                )}
                <span style={{ fontFamily: 'monospace', color: i <= stage ? '#FFFFFF' : '#8E9E97', fontWeight: i <= stage ? 700 : 400 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Glowing Animated Progress Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>
              <span>PIPELINE PROGRESS</span>
              <span style={{ color: '#00E599', fontWeight: 700 }}>{current.pct}%</span>
            </div>
            <div style={{ height: 8, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(to right, #00D2C2, #00E599, #00F5A0)', borderRadius: 99 }}
                animate={{ width: `${current.pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>

          {/* Completion verdict transition notice */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: 16, background: 'rgba(0, 229, 153, 0.15)', border: '1px solid #00E599', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} style={{ color: '#00E599' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>Analysis Complete! Redirecting to report...</span>
                </div>
                <button
                  onClick={() => navigate('/app/result/rumor/scan-001', { state: { claimText } })}
                  style={{ background: '#00E599', color: '#000', fontWeight: 800, fontSize: 12, padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  View Result <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      {/* ── TERMINAL LOG STREAM ── */}
      <div style={{ width: '100%', maxWidth: 820, background: '#080C0B', border: '1px solid #1B2923', borderRadius: 20, padding: 20, textAlign: 'left', fontFamily: 'monospace', fontSize: 11, color: '#8E9E97', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1B2923', paddingBottom: 8, color: '#FFFFFF', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} style={{ color: '#00E599' }} /> SYSTEM TELEMETRY LOG
          </div>
          <span style={{ color: '#00E599' }}>LIVE STREAMING</span>
        </div>
        <p style={{ margin: 0, color: '#00E599' }}>[0.00s] Ingestion initialized for Bengali payload.</p>
        <p style={{ margin: 0, color: '#FFFFFF' }}>[0.24s] BangaBERT NLP Transformer initialized.</p>
        <p style={{ margin: 0 }}>[0.68s] Entity extraction: "শিক্ষা প্রতিষ্ঠান" identified.</p>
        <p style={{ margin: 0, color: '#00E599' }}>[1.12s] Vector HNSW query against PID Gazette Archive (48k docs)...</p>
      </div>

    </div>
  );
}
