import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  AlertCircle,
  FileText,
  RotateCcw,
  CheckCircle
} from 'lucide-react';

interface LocationState {
  claimText?: string;
}

type AssessmentType = 'UNVERIFIED' | 'CONTRADICTED' | 'SUPPORTED';

const scanStages = [
  { label: 'Ingesting claim input...', pct: 25 },
  { label: 'Running OCR & BangaBERT NLP stance model...', pct: 55 },
  { label: 'PID Gazette database cross-reference...', pct: 85 },
  { label: 'Generating evidence report & Bengali explanation...', pct: 100 },
];

export default function RumorResult() {
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const claimText = state.claimText || 'আগামীকাল সারাদেশে সকল ব্যাংক ও শিক্ষাপ্রতিষ্ঠান বন্ধ ঘোষণা করেছে সরকার।';

  // Live Scanning & Decision Percentage Counter
  const [scanProgress, setScanProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const [assessment, setAssessment] = useState<AssessmentType>('UNVERIFIED');
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Animated progress counter matching landing console
  useEffect(() => {
    setScanProgress(0);
    setStageIndex(0);
    setIsScanning(true);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 100) {
          const next = prev + 2;
          if (next >= 85) setStageIndex(3);
          else if (next >= 55) setStageIndex(2);
          else if (next >= 25) setStageIndex(1);
          return next;
        } else {
          setIsScanning(false);
          setStageIndex(3);
          clearInterval(interval);
          return 100;
        }
      });
    }, 30);

    return () => clearInterval(interval);
  }, [assessment]);

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getAssessmentConfig = () => {
    switch (assessment) {
      case 'SUPPORTED':
        return {
          title: 'VERIFIED / SUPPORTED CLAIM',
          titleBn: 'তথ্যটি সত্য — সরকারি গেজেট ও পরিপত্র দ্বারা সমর্থিত',
          color: '#00E599',
          bg: 'rgba(0, 229, 153, 0.1)',
          border: 'rgba(0, 229, 153, 0.4)',
          score: '99.4%',
          explanation: 'Relevant official evidence directly supports the submitted claim.',
          explanationBn: 'শিক্ষা মন্ত্রণালয় ও প্রেস ইনফরমেশন ডিপার্টমেন্ট (পিআইডি) কর্তৃক প্রকাশিত গেজেট পরিপত্র দ্বারা উক্ত দাবিটি সমর্থিত হয়েছে।',
          gazetteId: 'PID Gazette #2026-0922 (Ministry of Education)',
        };
      case 'CONTRADICTED':
        return {
          title: 'FALSE / CONTRADICTED CLAIM',
          titleBn: 'তথ্যটি ভুয়া — পিআইডি স্পষ্টীকরণ বিজ্ঞপ্তিতে খণ্ডন করা হয়েছে',
          color: '#F87171',
          bg: 'rgba(248, 113, 113, 0.1)',
          border: 'rgba(248, 113, 113, 0.4)',
          score: '98.2%',
          explanation: 'Official government advisories directly contradict the submitted claim.',
          explanationBn: 'শিক্ষা মন্ত্রণালয় কর্তৃক প্রকাশিত পরিপত্রে ছুটির দাবিটিকে সম্পূর্ণ ভিত্তিহীন ও অসত্য বলে নিশ্চিত করা হয়েছে।',
          gazetteId: 'PID Clarification Notice #2026-0923',
        };
      case 'UNVERIFIED':
      default:
        return {
          title: 'FALSE / UNVERIFIED CLAIM',
          titleBn: 'তথ্যটি ভুয়া — পিআইডি ও সরকারি গেজেটে কোনো বিজ্ঞপ্তি নেই',
          color: '#FBBF24',
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
          score: '94%',
          explanation: 'No authoritative official gazette or PID notice was found to confirm or contradict this claim.',
          explanationBn: 'দাবিটিকে নিশ্চিত করার মতো কোনো সরকারি গেজেট বা পিআইডি বিজ্ঞপ্তি সরকারি ডাটাবেসে পাওয়া যায়নি।',
          gazetteId: 'PID Search Index #2026-Q3 (No Official Match)',
        };
    }
  };

  const config = getAssessmentConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 960, margin: '0 auto', width: '100%', paddingBottom: 48, alignItems: 'center' }}>

      {/* ── TOP HEADER BRANDING & QUICK ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.12)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>
              MODULE 01 — PID GASETTE CONSOLE
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2' }}>RAG VERIFICATION</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Rumor Scanning & Verification Console
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setIsSaved(!isSaved)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              border: 'none',
              cursor: 'pointer',
              background: isSaved ? '#00E599' : '#0F1714',
              color: isSaved ? '#000000' : '#E2E8E5',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 0 15px rgba(0,0,0,0.3)',
            }}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isSaved ? 'Saved' : 'Save Evidence'}
          </button>

          <button
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              border: '1px solid #1B2923',
              cursor: 'pointer',
              background: '#0F1714',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {copiedLink ? <Check size={16} style={{ color: '#00E599' }} /> : <Share2 size={16} />}
            {copiedLink ? 'Copied' : 'Share'}
          </button>
        </div>
      </motion.div>

      {/* ── TEST MODE SWITCHER PILL ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0F1714', padding: '6px 14px', borderRadius: 99, border: '1px solid #1B2923', fontSize: 12 }}>
        <span style={{ color: '#8E9E97', fontFamily: 'monospace', fontWeight: 600 }}>Test Outcome State:</span>
        {(['UNVERIFIED', 'CONTRADICTED', 'SUPPORTED'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setAssessment(mode)}
            style={{
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: assessment === mode ? config.color : 'transparent',
              color: assessment === mode ? '#000000' : '#8E9E97',
              transition: 'all 0.2s ease',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── FACTLENS ENGINE CONSOLE V2.4 (EXACT LANDING HERO CONSOLE FRAME) ── */}
      <div style={{ width: '100%', maxWidth: 880, background: '#0A0F0D', border: '1px solid rgba(0, 229, 153, 0.35)', borderRadius: 24, boxShadow: '0 0 60px rgba(0, 229, 153, 0.15)', overflow: 'hidden', textAlign: 'left' }}>
        
        {/* Chrome Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#060A09', borderBottom: '1px solid #1B2923' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', marginLeft: 8 }}>FactLens Engine Console v2.4</span>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00E599', background: 'rgba(0, 229, 153, 0.15)', padding: '2px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>
            ● ONLINE
          </span>
        </div>

        {/* Console Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* URL bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0F1714', border: '1px solid #1B2923', borderRadius: 12, padding: '8px 14px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00E599' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              factlens://verify → gazette.pid.gov.bd
            </span>
          </div>

          {/* Claim text box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#00E599', textTransform: 'uppercase', fontWeight: 700 }}>LIVE CLAIM INPUT</span>
            <p style={{ fontSize: 14, color: '#E2E8E5', margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
              "{claimText}"
            </p>
          </div>

          {/* Pipeline stages checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scanStages.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: i <= stageIndex ? 1 : 0.3, transition: 'all 0.5s ease' }}>
                {i < stageIndex || !isScanning ? (
                  <CheckCircle size={14} style={{ color: '#00E599', flexShrink: 0 }} />
                ) : i === stageIndex && isScanning ? (
                  <motion.div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #00E599', borderTopColor: 'transparent', flexShrink: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                ) : (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #1B2923', flexShrink: 0 }} />
                )}
                <span style={{ fontFamily: 'monospace', color: i <= stageIndex ? '#E2E8E5' : '#5A6E64', fontWeight: i <= stageIndex ? 600 : 400 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Animated progress bar */}
          <div style={{ height: 6, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(to right, #00D2C2, #00E599, #00F5A0)', borderRadius: 99 }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Dynamic Result Verdict Box (Appears as scan completes) */}
          <AnimatePresence>
            {!isScanning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  background: config.bg,
                  border: `1px solid ${config.border}`,
                  borderRadius: 14,
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertCircle size={20} style={{ color: config.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 900, color: config.color, margin: 0, letterSpacing: '0.02em' }}>
                      {config.title}
                    </p>
                    <p style={{ fontSize: 11, color: '#8E9E97', margin: 0, marginTop: 2 }}>
                      {config.titleBn}
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', background: 'rgba(0, 229, 153, 0.15)', padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)', fontWeight: 800 }}>
                  Score: {config.score}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* ── EXPANDED EVIDENCE DEEP-DIVE & AUDIT DETAILS ── */}
      {!isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* Bengali Factual Explanation Box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>BangaBERT STANCE & RATIONALE REPORT</span>
            <p style={{ fontSize: 14, color: '#E2E8E5', margin: 0, lineHeight: 1.6 }}>{config.explanation}</p>
            <div style={{ padding: 14, background: '#080C0B', borderRadius: 14, border: '1px solid #1B2923', fontSize: 13, color: config.color, lineHeight: 1.6, fontWeight: 600 }}>
              📌 {config.explanationBn}
            </div>
          </div>

          {/* Gazette Reference & Actions */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8E9E97', fontFamily: 'monospace' }}>
              <FileText size={16} style={{ color: '#00E599' }} />
              <span>PID Gazette Citation: <strong style={{ color: '#FFFFFF' }}>{config.gazetteId}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert('Downloading Official Gazette PDF evidence document...'); }}
                style={{
                  padding: '10px 18px',
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#080C0B',
                  color: '#00E599',
                  border: '1px solid rgba(0, 229, 153, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Download size={14} /> Download Gazette PDF
              </a>
              <Link
                to="/app/rumor"
                style={{
                  padding: '10px 18px',
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 800,
                  background: '#00E599',
                  color: '#000000',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCcw size={14} /> Scan Another Claim
              </Link>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
