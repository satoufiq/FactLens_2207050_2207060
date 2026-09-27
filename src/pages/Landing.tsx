import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  FileCheck,
  Activity,
  Cpu,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// ─── Animated Floating Particle ─────────────────────────────────────────────
function Particle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0, 229, 153, 0.25)',
        pointerEvents: 'none',
      }}
      animate={{ y: [0, -35, 0], opacity: [0.15, 0.5, 0.15], scale: [1, 1.25, 1] }}
      transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

// ─── Animated Scan Demo Card ─────────────────────────────────────────────────
const scanStages = [
  { label: 'Ingesting claim input...', color: '#8E9E97', pct: 20 },
  { label: 'Running OCR & BangaBERT NLP stance model...', color: '#00D2C2', pct: 50 },
  { label: 'PID Gazette database cross-reference...', color: '#00E599', pct: 80 },
  { label: 'Generating evidence report & Bengali explanation...', color: '#00E599', pct: 100 },
];

function AnimatedScanCard() {
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setStage(0); setDone(false); }, 3000);
      return () => clearTimeout(t);
    }
    if (stage < scanStages.length - 1) {
      const t = setTimeout(() => setStage(s => s + 1), 1000);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setDone(true), 1000);
      return () => clearTimeout(t);
    }
  }, [stage, done]);

  const current = scanStages[stage];

  return (
    <div style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden', textAlign: 'left' }}>
      {/* Background ambient glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 140, height: 140, background: 'rgba(0, 229, 153, 0.1)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* URL bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0F1714', border: '1px solid #1B2923', borderRadius: 12, padding: '8px 14px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00E599' }} />
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          factlens://verify → gazette.pid.gov.bd
        </span>
      </div>

      {/* Claim text box */}
      <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#00E599', textTransform: 'uppercase', fontWeight: 700 }}>LIVE CLAIM INPUT</span>
        <p style={{ fontSize: 13, color: '#E2E8E5', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
          "আগামীকাল সারাদেশে সকল ব্যাংক ও শিক্ষাপ্রতিষ্ঠান বন্ধ ঘোষণা করেছে সরকার।"
        </p>
      </div>

      {/* Pipeline stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scanStages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: i <= stage ? 1 : 0.3, transition: 'all 0.5s ease' }}>
            {i < stage || done ? (
              <CheckCircle size={14} style={{ color: '#00E599', flexShrink: 0 }} />
            ) : i === stage ? (
              <motion.div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #00E599', borderTopColor: 'transparent', flexShrink: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #1B2923', flexShrink: 0 }} />
            )}
            <span style={{ fontFamily: 'monospace', color: i <= stage ? '#E2E8E5' : '#5A6E64', fontWeight: i <= stage ? 600 : 400 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Animated progress bar */}
      <div style={{ height: 6, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: 'linear-gradient(to right, #00D2C2, #00E599, #00F5A0)', borderRadius: 99 }}
          animate={{ width: `${current.pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      {/* Result verdict badge */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 14, flexWrap: 'wrap', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} style={{ color: '#FBBF24', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#FCD34D', margin: 0 }}>FALSE / UNVERIFIED CLAIM</p>
                <p style={{ fontSize: 10, color: '#8E9E97', margin: 0, marginTop: 2 }}>তথ্যটি ভুয়া — পিআইডি ও সরকারি গেজেটে কোনো বিজ্ঞপ্তি নেই</p>
              </div>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', background: 'rgba(0, 229, 153, 0.15)', padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)', fontWeight: 700 }}>
              Score: 94%
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useLanguage } from '../context/LanguageContext';

export default function Landing() {
  const { lang, setLang } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Background particles
  const particles = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 31 + 7) % 92,
    y: (i * 47 + 12) % 85,
    size: 4 + (i % 4) * 2,
    duration: 4 + (i % 3),
    delay: (i * 0.3) % 2.5,
  }));

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
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>VERIFICATION PLATFORM</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, fontWeight: 600, color: '#8E9E97' }} className="hidden md:flex">
            <Link to="/how-it-works" style={{ color: '#8E9E97', textDecoration: 'none' }}>How It Works</Link>
            <a href="#features" style={{ color: '#8E9E97', textDecoration: 'none' }}>Modules</a>
            <Link to="/architecture" style={{ color: '#8E9E97', textDecoration: 'none' }}>Architecture</Link>
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

      {/* ── HERO SECTION — CENTER ALIGNED & RESPONSIVE ─────────────── */}
      <section style={{ position: 'relative', padding: '64px 24px 80px', borderBottom: '1px solid #1B2923', overflow: 'hidden' }}>
        {/* Background Grid & Glows */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, #1B2923 1px, transparent 1px), linear-gradient(to bottom, #1B2923 1px, transparent 1px)', backgroundSize: '4rem 4rem', opacity: 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'rgba(0, 229, 153, 0.08)', borderRadius: '50%', filter: 'blur(160px)', pointerEvents: 'none' }} />

        {/* Floating Particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {particles.map((p, i) => <Particle key={i} {...p} />)}
        </div>

        {/* Main Center Container */}
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 40, position: 'relative', zIndex: 10 }}>

          {/* Top Badge & Titles */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 840 }}>
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', border: '1px solid rgba(0, 229, 153, 0.3)', padding: '6px 16px', borderRadius: 99, boxShadow: '0 0 20px rgba(0, 229, 153, 0.2)' }}
            >
              <Sparkles size={14} style={{ color: '#00E599' }} />
              <span>✦ ENGINEERING-GRADE VERIFICATION AI</span>
            </motion.div>

            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.03em', margin: 0 }}>
              Check before you{' '}
              <span style={{ background: 'linear-gradient(to right, #00E599, #00F5A0, #00D2C2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                trust
              </span>
              {' '}or share.
            </h1>

            <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: '#00E599', fontWeight: 600, margin: 0 }}>
              সন্দেহজনক তথ্য বা খবর শেয়ার করার আগে প্রমাণের মাধ্যমে নিশ্চিত হোন।
            </p>

            <p style={{ fontSize: 15, color: '#8E9E97', lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
              FactLens is an engineering-grade digital verification platform for Bangladesh. Evaluate viral claims, audit scam links, and inspect manipulated news images in real time.
            </p>

            {/* Action Buttons Centered */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              <Link
                to="/app"
                style={{ background: '#00E599', color: '#000', fontWeight: 900, fontSize: 14, padding: '14px 32px', borderRadius: 99, boxShadow: '0 0 30px rgba(0, 229, 153, 0.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Verify Something Now <ArrowRight size={16} />
              </Link>
              <Link
                to="/how-it-works"
                style={{ background: '#0F1714', border: '1px solid #1B2923', color: '#FFFFFF', fontWeight: 700, fontSize: 14, padding: '14px 28px', borderRadius: 99, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Explore Architecture
              </Link>
            </div>
          </div>

          {/* Centered Stats Overview Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, width: '100%', maxWidth: 760, padding: '20px 0', borderTop: '1px solid #1B2923', borderBottom: '1px solid #1B2923' }}>
            {[
              { icon: <Cpu size={16} />, val: '99.4%', label: 'OCR Accuracy' },
              { icon: <Activity size={16} />, val: '< 3s', label: 'Analysis Speed' },
              { icon: <ShieldCheck size={16} />, val: '4 Archives', label: 'Official Sources' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00E599' }}>
                  {stat.icon}
                  <span style={{ fontWeight: 800, fontSize: 20, color: '#FFFFFF', fontFamily: 'monospace' }}>{stat.val}</span>
                </div>
                <p style={{ fontSize: 12, color: '#8E9E97', margin: 0, fontWeight: 500 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Centered Interactive Console Demo Showcase */}
          <div style={{ width: '100%', maxWidth: 880, background: '#0A0F0D', border: '1px solid rgba(0, 229, 153, 0.3)', borderRadius: 24, boxShadow: '0 0 60px rgba(0, 229, 153, 0.15)', overflow: 'hidden' }}>
            {/* Header bar */}
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

            {/* Console body */}
            <div style={{ padding: 20 }}>
              <AnimatedScanCard />
            </div>
          </div>

        </div>
      </section>

      {/* ── INGESTION STRIP — CENTERED ───────────────────────────── */}
      <section style={{ padding: '48px 24px', borderBottom: '1px solid #1B2923', background: '#080C0B' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MULTIMODAL INGESTION</span>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0' }}>Accepts Every Format</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, width: '100%' }}>
            {[
              { emoji: '📝', label: 'Text Claims', sub: 'Bengali · English · Banglish' },
              { emoji: '🖼', label: 'Screenshots', sub: 'WhatsApp · Facebook cards' },
              { emoji: '🔗', label: 'Suspicious URLs', sub: 'Phishing · domain audit' },
              { emoji: '📁', label: 'Media Files', sub: 'EXIF · ELA compression' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: '#0F1714',
                  border: '1px solid #1B2923',
                  borderRadius: 18,
                  padding: 16,
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#1B2923', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {item.emoji}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 10, color: '#8E9E97', margin: 0, marginTop: 2 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 SPECIALIZED ENGINES — CENTERED ─────────────────────── */}
      <section id="features" style={{ padding: '80px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48, textAlign: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 640 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#0F1714', border: '1px solid #1B2923', padding: '6px 16px', borderRadius: 99 }}>
              VERIFICATION ENGINES
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Three specialized modules for specific digital threats.
            </h2>
            <p style={{ fontSize: 14, color: '#8E9E97', margin: 0 }}>
              Every request is dispatched to specialized analytical logic with distinct risk indicators and evidence output schemas.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, width: '100%' }}>
            {[
              {
                tag: 'MODULE 01',
                title: 'Rumor / Claim Scanner',
                titleBn: 'ভাইরাল তথ্য ও সংবাদের গেজেট যাচাই',
                desc: 'Evaluates factual claims against official government gazettes, PID releases, university registrar portals, and verified press archives.',
                features: ['BangaBERT NLP stance matching', 'OCR for Bengali text screenshots', 'PID Gazette database cross-reference'],
                cta: 'Launch Rumor Scanner',
                to: '/app/rumor',
                btnBg: '#00E599',
                color: '#00D2C2',
              },
              {
                tag: 'MODULE 02',
                title: 'Scam Alert',
                titleBn: 'ফিশিং লিঙ্ক ও প্রতারণামূলক এসএমএস স্ক্যান',
                desc: 'Identifies suspicious patterns in SMS lottery wins, fake mobile banking subsidies, smishing links, and fraudulent upfront fee requests.',
                features: ['Smishing intent & fee detection', 'Typo-squatted non-bank URL audit', 'Urgency pressure signal scoring'],
                cta: 'Launch Scam Alert',
                to: '/app/scam',
                btnBg: '#F97316',
                color: '#F97316',
              },
              {
                tag: 'MODULE 03',
                title: 'Image Forensic Check',
                titleBn: 'ফটোশপ কার্ড ও সম্পাদিত ছবি বিশ্লেষণ',
                desc: 'Inspects photos, viral thumbnails, and news image cards for indicators of AI generation, deepfake artifacts, and digital manipulation.',
                features: ['EXIF Metadata & C2PA Provenance', 'Error Level Analysis (ELA)', 'Neural Diffusion Artifact Inspection'],
                cta: 'Launch Image Check',
                to: '/app/image',
                btnBg: '#6366F1',
                color: '#6366F1',
              },
            ].map((module, i) => (
              <div
                key={i}
                style={{
                  background: '#0F1714',
                  border: '1px solid #1B2923',
                  borderRadius: 24,
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  gap: 20,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: module.color, background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 99, border: `1px solid ${module.color}40` }}>
                      {module.tag}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{module.title}</h3>
                    <p style={{ fontSize: 12, color: module.btnBg, margin: '4px 0 0', fontWeight: 600 }}>{module.titleBn}</p>
                  </div>

                  <p style={{ fontSize: 12, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>{module.desc}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid #1B2923' }}>
                    {module.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#E2E8E5' }}>
                        <CheckCircle size={13} style={{ color: module.btnBg, flexShrink: 0 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={module.to}
                  style={{
                    background: module.btnBg,
                    color: '#000000',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '12px 20px',
                    borderRadius: 16,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {module.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── TRANSPARENCY SECTION — CENTERED ──────────────────────── */}
      <section id="safety" style={{ padding: '80px 24px', background: '#080C0B', borderTop: '1px solid #1B2923' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48, textAlign: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 640 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#0F1714', border: '1px solid #1B2923', padding: '6px 16px', borderRadius: 99 }}>
              TRANSPARENT VERIFICATION
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              FactLens doesn't ask you to <span style={{ color: '#00E599' }}>blindly trust</span> a result.
            </h2>
            <p style={{ fontSize: 15, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>
              We believe user trust comes from visible evidence, auditable gazette sources, and clear Bengali explanations — not black-box machine learning scores.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, width: '100%' }}>
            {[
              {
                icon: <FileCheck size={20} style={{ color: '#00E599' }} />,
                title: 'Auditable Sources',
                desc: 'Every claim verdict shows exact government gazettes, university notices, and press archives consulted during evaluation.'
              },
              {
                icon: <ShieldCheck size={20} style={{ color: '#F97316' }} />,
                title: 'Unverified Distinction',
                desc: 'An Unverified result means evidence was insufficient — not that the claim is automatically false. Honesty is our core principle.'
              },
              {
                icon: <Globe size={20} style={{ color: '#00D2C2' }} />,
                title: 'Bengali-First Explanations',
                desc: 'Every analysis includes a plain Bengali explanation alongside the evidence trail.'
              },
            ].map((item, i) => (
              <div key={i} style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 20, padding: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0, 229, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{item.title}</h4>
                <p style={{ fontSize: 12, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div style={{ width: '100%', maxWidth: 760, background: '#0F1714', border: '1px solid rgba(0, 229, 153, 0.3)', borderRadius: 24, padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 0 40px rgba(0, 229, 153, 0.1)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', background: 'rgba(0, 229, 153, 0.1)', border: '1px solid rgba(0, 229, 153, 0.3)', padding: '4px 14px', borderRadius: 99 }}>
              FREE ACCESS
            </span>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Ready to verify suspicious digital content?</h3>
            <p style={{ fontSize: 13, color: '#8E9E97', margin: 0, maxWidth: 500 }}>Access the complete FactLens verification suite directly from your browser. No installation required.</p>
            <Link to="/app" style={{ background: '#00E599', color: '#000000', fontWeight: 900, fontSize: 14, padding: '12px 28px', borderRadius: 99, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              Open Verification Workspace <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── FOOTER — CENTERED ─────────────────────────────────────── */}
      <footer style={{ background: '#040706', borderTop: '1px solid #1B2923', padding: '32px 24px', fontSize: 12, color: '#8E9E97' }}>
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
