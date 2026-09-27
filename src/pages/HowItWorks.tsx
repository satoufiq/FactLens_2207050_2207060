import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Zap,
  Sparkles,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

import AnimatedGraphicalCurve from '../components/zebeyond/AnimatedGraphicalCurve';

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Digital Claim Ingestion',
    titleBn: 'ডিজিটাল ইনপুট ও প্রসেসিং',
    desc: 'Ingests Bengali or English text, news screenshot images, or suspicious links submitted by the user.',
    color: '#00E599',
    detail: 'Supports social media forwards, WhatsApp screenshots, raw news articles, and domain URLs. Text is extracted via OCR if an image is provided.',
  },
  {
    num: '02',
    title: 'BangaBERT NLP Stance Analysis',
    titleBn: 'নিউরাল টেক্সট স্ট্যান্স অ্যানালাইসিস',
    desc: 'Runs specialized transformer NLP models trained on Bengali gazettes and news corpora.',
    color: '#00D2C2',
    detail: 'Tokenizes Bengali text, normalizes spelling variations, detects claim intent, and computes semantic similarity against archived press releases.',
  },
  {
    num: '03',
    title: 'PID Gazette Cross-Reference',
    titleBn: 'সরকারি গেজেট ও পিআইডি ডাটাবেস যাচাই',
    desc: 'Executes real-time vector queries against Press Information Department (PID) gazette archives.',
    color: '#6366F1',
    detail: 'Cross-checks government gazettes, university notices, and press releases to confirm or refute official statements.',
  },
  {
    num: '04',
    title: 'Auditable Evidence Verdict',
    titleBn: 'প্রমাণসহ চূড়ান্ত সিদ্ধান্ত ও কারণ',
    desc: 'Generates a transparent verdict with direct links to gazette source documents and plain Bengali explanations.',
    color: '#F97316',
    detail: 'Produces an evidence-backed score (Verified, False/Unverified, Phishing Risk) with auditable citations for full transparency.',
  },
];

const OCR_SAMPLES = [
  {
    id: 'sample-1',
    label: 'Fake University Notice Screenshot',
    filename: 'ugc_notice_fake_2026.png',
    confidence: '99.4%',
    rawText: 'আগামীকাল সারাদেশে সকল বিশ্ববিদ্যালয় পরীক্ষা স্থগিত করা হয়েছে — বিশ্ববিদ্যালয় মঞ্জুরি কমিশন।',
    status: 'UNVERIFIED',
    verdict: 'কোনো গেজেট বিজ্ঞপ্তি পাওয়া যায়নি',
  },
  {
    id: 'sample-2',
    label: 'MFS Cashback SMS Scam',
    filename: 'bkash_reward_sms_scam.txt',
    confidence: '98.8%',
    rawText: 'অভিনন্দন! আপনি বিকাশ থেকে ১০০০০ টাকা বোনাস পেয়েছেন। ক্লেইম করতে ভিজিট করুন: http://bkash-reward.site',
    status: 'PHISHING RISK',
    verdict: 'প্রতারণামূলক লিঙ্ক সনাক্ত করা হয়েছে',
  },
];

import { useLanguage } from '../context/LanguageContext';

export default function HowItWorks() {
  const { lang, setLang } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedOcrSample, setSelectedOcrSample] = useState(0);
  const [ocrRunning, setOcrRunning] = useState(false);

  const sample = OCR_SAMPLES[selectedOcrSample];

  const handleRunOcrDemo = () => {
    setOcrRunning(true);
    setTimeout(() => setOcrRunning(false), 1000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060A09', color: '#E2E8E5', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      
      {/* ── STICKY NAVBAR ───────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6, 10, 9, 0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1B2923' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #00E599, #00D2C2)', boxShadow: '0 0 20px rgba(0, 229, 153, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
                <path d="m8.5 11 1.8 1.8 3.7-3.7" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>FactLens</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>HOW IT WORKS</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, fontWeight: 600, color: '#8E9E97' }} className="hidden md:flex">
            <Link to="/how-it-works" style={{ color: '#00E599', fontWeight: 700, textDecoration: 'none' }}>How It Works</Link>
            <Link to="/architecture" style={{ color: '#8E9E97', textDecoration: 'none' }}>Architecture</Link>
            <a href="#pipeline" style={{ color: '#8E9E97', textDecoration: 'none' }}>Pipeline Steps</a>
            <a href="#ocr" style={{ color: '#8E9E97', textDecoration: 'none' }}>Bengali OCR</a>
            <Link to="/app/help" style={{ color: '#8E9E97', textDecoration: 'none' }}>Resources</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="hidden md:flex">
            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0F1714', border: '1px solid #1B2923', borderRadius: 99, padding: 3 }}>
              <button onClick={() => setLang('bn')} style={{ padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', background: lang === 'bn' ? '#00E599' : 'transparent', color: lang === 'bn' ? '#000' : '#8E9E97', fontWeight: 700, fontSize: 12 }}>বাংলা</button>
              <button onClick={() => setLang('en')} style={{ padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', background: lang === 'en' ? '#00E599' : 'transparent', color: lang === 'en' ? '#000' : '#8E9E97', fontWeight: 700, fontSize: 12 }}>EN</button>
            </div>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: '#8E9E97', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/app" style={{ background: '#00E599', color: '#000', fontWeight: 800, fontSize: 13, padding: '10px 22px', borderRadius: 99, boxShadow: '0 0 20px rgba(0, 229, 153, 0.35)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} /> Launch Platform
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION — CENTER ALIGNED ───────────────────────────── */}
      <section style={{ position: 'relative', padding: '64px 24px 80px', borderBottom: '1px solid #1B2923', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'rgba(0, 229, 153, 0.08)', borderRadius: '50%', filter: 'blur(160px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 32, position: 'relative', zIndex: 10 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 800 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', border: '1px solid rgba(0, 229, 153, 0.3)', padding: '6px 16px', borderRadius: 99 }}>
              <Sparkles size={14} style={{ color: '#00E599' }} />
              <span>END-TO-END VERIFICATION ARCHITECTURE</span>
            </div>

            <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}>
              From raw digital input to <br />
              <span style={{ background: 'linear-gradient(to right, #00E599, #00F5A0, #00D2C2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                auditable evidence results.
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#00E599', fontWeight: 600, margin: 0 }}>
              ডিজিটাল ইনপুট থেকে নির্ভরযোগ্য প্রমাণভিত্তিক ফলাফল পর্যন্ত।
            </p>

            <p style={{ fontSize: 15, color: '#8E9E97', lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
              FactLens ingests Bengali text claims, screenshot news images, and URLs; processes them through BangaBERT NLP and forensic engines; and cross-references official gazette archives.
            </p>
          </div>

          {/* Workflow Diagram Card Showcase */}
          <div style={{ width: '100%', maxWidth: 900, background: '#0A0F0D', border: '1px solid rgba(0, 229, 153, 0.3)', borderRadius: 24, padding: 12, boxShadow: '0 0 50px rgba(0, 229, 153, 0.15)', overflow: 'hidden' }}>
            <img
              src="/factlens_workflow.jpg"
              alt="FactLens 3D AI Workflow Diagram"
              style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block', objectFit: 'cover' }}
            />
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE PIPELINE STEPS SECTION — CENTERED ──────────── */}
      <section id="pipeline" style={{ padding: '80px 24px', borderBottom: '1px solid #1B2923', background: '#080C0B' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, textAlign: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 640 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#0F1714', border: '1px solid #1B2923', padding: '6px 16px', borderRadius: 99 }}>
              NEURAL STAGE PIPELINE
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              How FactLens Verifies Content
            </h2>
            <p style={{ fontSize: 14, color: '#8E9E97', margin: 0 }}>
              Click any stage below to inspect the detailed verification process.
            </p>
          </div>

          {/* Step Selector Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, width: '100%' }}>
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={i}
                onClick={() => setActiveStep(i)}
                style={{
                  background: activeStep === i ? '#0F1714' : '#080C0B',
                  border: `1px solid ${activeStep === i ? step.color : '#1B2923'}`,
                  borderRadius: 20,
                  padding: 20,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: activeStep === i ? `0 0 20px ${step.color}25` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: step.color }}>STEP {step.num}</span>
                  {activeStep === i && <CheckCircle size={14} style={{ color: step.color }} />}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{step.title}</h4>
                <p style={{ fontSize: 11, color: step.color, margin: 0 }}>{step.titleBn}</p>
              </div>
            ))}
          </div>

          {/* Active Step Details Box */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                width: '100%',
                maxWidth: 880,
                background: '#0F1714',
                border: `1px solid ${PIPELINE_STEPS[activeStep].color}50`,
                borderRadius: 24,
                padding: 32,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: `0 0 35px ${PIPELINE_STEPS[activeStep].color}15`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: PIPELINE_STEPS[activeStep].color, background: `${PIPELINE_STEPS[activeStep].color}15`, padding: '4px 12px', borderRadius: 99, border: `1px solid ${PIPELINE_STEPS[activeStep].color}40` }}>
                  STAGE {PIPELINE_STEPS[activeStep].num} DETAILS
                </span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{PIPELINE_STEPS[activeStep].title}</h3>
              <p style={{ fontSize: 14, color: '#E2E8E5', margin: 0, lineHeight: 1.6 }}>{PIPELINE_STEPS[activeStep].desc}</p>
              <div style={{ padding: 16, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', fontSize: 13, color: '#8E9E97', lineHeight: 1.6 }}>
                💡 <strong style={{ color: '#FFFFFF' }}>Technical Implementation:</strong> {PIPELINE_STEPS[activeStep].detail}
              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </section>

      {/* ── BENGALI OCR DEMONSTRATION SECTION — CENTERED ───────────── */}
      <section id="ocr" style={{ padding: '80px 24px', borderBottom: '1px solid #1B2923' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, textAlign: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 640 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#0F1714', border: '1px solid #1B2923', padding: '6px 16px', borderRadius: 99 }}>
              BENGALI OCR PIPELINE
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              OCR Built for Bengali & English Screenshots
            </h2>
            <p style={{ fontSize: 14, color: '#8E9E97', margin: 0 }}>
              Forwarded social media messages and low-resolution news cards are parsed and converted to editable text for complete user review.
            </p>
          </div>

          {/* Sample Switcher Tabs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {OCR_SAMPLES.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSelectedOcrSample(i); handleRunOcrDemo(); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedOcrSample === i ? '#00E599' : '#0F1714',
                  color: selectedOcrSample === i ? '#000000' : '#8E9E97',
                  boxShadow: selectedOcrSample === i ? '0 0 20px rgba(0, 229, 153, 0.3)' : 'none',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Interactive OCR Result Showcase Box */}
          <div style={{ width: '100%', maxWidth: 880, background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
            {/* Raw Input Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00E599', textTransform: 'uppercase' }}>RAW SCREENSHOT INGESTION</span>
              <div style={{ padding: 16, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>{sample.filename}</span>
                  <button onClick={handleRunOcrDemo} style={{ background: 'none', border: 'none', color: '#00E599', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'monospace' }}>
                    <RefreshCw size={12} className={ocrRunning ? 'animate-spin' : ''} /> Re-scan
                  </button>
                </div>
                <div style={{ padding: 14, background: '#0F1714', borderRadius: 12, border: '1px solid #1B2923', fontSize: 13, color: '#FFFFFF', lineHeight: 1.6 }}>
                  "{sample.rawText}"
                </div>
              </div>
            </div>

            {/* Extracted Output Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00D2C2', textTransform: 'uppercase' }}>PARSED TEXT & GASETTE VERDICT</span>
              <div style={{ padding: 16, background: '#080C0B', borderRadius: 16, border: '1px solid rgba(0, 229, 153, 0.3)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>Confidence: {sample.confidence}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#F97316', background: 'rgba(249, 115, 22, 0.15)', padding: '2px 8px', borderRadius: 99 }}>{sample.status}</span>
                </div>
                <div style={{ padding: 14, background: '#0F1714', borderRadius: 12, border: '1px solid rgba(0, 229, 153, 0.2)', fontSize: 13, color: '#00E599', lineHeight: 1.6, fontWeight: 600 }}>
                  {sample.rawText}
                </div>
                <p style={{ fontSize: 11, color: '#8E9E97', margin: 0 }}>📌 <strong style={{ color: '#FFFFFF' }}>Verdict:</strong> {sample.verdict}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE PIPELINE GRAPHIC CURVE — CENTERED ──────────── */}
      <section style={{ padding: '80px 24px', background: '#080C0B', borderBottom: '1px solid #1B2923' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 640 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#0F1714', border: '1px solid #1B2923', padding: '6px 16px', borderRadius: 99 }}>
              INTERACTIVE PIPELINE GRAPH
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Visual Node Architecture</h2>
            <p style={{ fontSize: 14, color: '#8E9E97', margin: 0 }}>Interactive graphic showing data flow across neural and gazette verification nodes.</p>
          </div>

          <div style={{ width: '100%', background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 24 }}>
            <AnimatedGraphicalCurve />
          </div>
        </div>
      </section>

      {/* ── FOOTER — CENTERED ─────────────────────────────────────── */}
      <footer style={{ background: '#040706', padding: '32px 24px', fontSize: 12, color: '#8E9E97' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #00E599, #00D2C2)', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>FL</div>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>FactLens Bangladesh</span>
            <span>|</span>
            <span style={{ fontFamily: 'monospace' }}>Verification Platform</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link to="/architecture" style={{ color: '#8E9E97', textDecoration: 'none' }}>Architecture</Link>
            <Link to="/app" style={{ color: '#8E9E97', textDecoration: 'none' }}>Platform</Link>
            <Link to="/login" style={{ color: '#8E9E97', textDecoration: 'none' }}>Sign In</Link>
          </div>
          <p style={{ color: '#5A6E64', fontFamily: 'monospace', margin: 0 }}>© 2026 FactLens Initiative. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
