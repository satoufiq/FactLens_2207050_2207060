import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Database,
  ShieldCheck,
  FileCheck,
  Zap,
  Layers,
  Code,
  Server
} from 'lucide-react';

const ARCHITECTURE_MODULES = [
  {
    id: 'ingestion',
    tag: 'LAYER 01',
    title: 'Multimodal Ingestion Layer',
    titleBn: 'মাল্টিমোডাল ইনজেস্ট ও প্রিপ্রসেসিং',
    icon: <Layers size={22} style={{ color: '#00E599' }} />,
    color: '#00E599',
    summary: 'Receives raw digital input across text, screenshot images, social media links, and audio files.',
    specs: [
      { name: 'Bengali Tesseract OCR', val: 'v5.4 Fine-Tuned' },
      { name: 'Spell Normalizer', val: 'Bangla-BERT Rule Engine' },
      { name: 'URL Scraper', val: 'Headless DOM Audit' },
      { name: 'Supported Formats', val: 'JPG, PNG, WEBP, TXT, URL' },
    ],
    details: 'Converts unstructured Bengali screenshots into clean UTF-8 text. Strips noise artifacts, handles Benglish transliteration, and isolates verifiable factual claims from opinion statements.',
  },
  {
    id: 'nlp-core',
    tag: 'LAYER 02',
    title: 'BangaBERT Neural Stance Core',
    titleBn: 'নিউরাল ল্যাঙ্গুয়েজ স্ট্যান্স ইঞ্জিন',
    icon: <Cpu size={22} style={{ color: '#00D2C2' }} />,
    color: '#00D2C2',
    summary: 'Transformer NLP model calculating semantic agreement between input claims and gazette archives.',
    specs: [
      { name: 'Model Architecture', val: 'BangaBERT-Base-V2' },
      { name: 'Context Length', val: '512 Tokens' },
      { name: 'Fine-Tuned On', val: '120k BD News Sentences' },
      { name: 'Stance Classes', val: 'Agree, Disagree, Unrelated' },
    ],
    details: 'Evaluates claim intent, extracts named entities (ministers, dates, universities), and computes vector embedding distances against verified government circulars.',
  },
  {
    id: 'gazette-vault',
    tag: 'LAYER 03',
    title: 'PID Gazette Vector Vault',
    titleBn: 'সরকারি গেজেট ও পিআইডি ডাটাবেস',
    icon: <Database size={22} style={{ color: '#6366F1' }} />,
    color: '#6366F1',
    summary: 'Hybrid RAG retrieval database containing official government gazettes, PID circulars, and university notifications.',
    specs: [
      { name: 'Vector Index', val: 'HNSW Cosine Index' },
      { name: 'Indexed Documents', val: '48,000+ Gazettes' },
      { name: 'Source Sync', val: 'Automated 15-min Cron' },
      { name: 'Latency', val: '< 180ms RAG Search' },
    ],
    details: 'Stores official Bangladesh Gazette PDFs, PID media advisories, education board routines, and verified press releases with full provenance tracking.',
  },
  {
    id: 'forensics',
    tag: 'LAYER 04',
    title: 'Image Forensics & ELA Inspector',
    titleBn: 'ফটোশপ কারসাজি ও ডিপফেক ডিটেক্টর',
    icon: <ShieldCheck size={22} style={{ color: '#F97316' }} />,
    color: '#F97316',
    summary: 'Computer vision engine scanning pixel-level error compression (ELA) and camera metadata.',
    specs: [
      { name: 'Forensic Method', val: 'Error Level Analysis (ELA)' },
      { name: 'Deepfake Model', val: 'ResNet-50 GAN Classifier' },
      { name: 'Metadata Inspection', val: 'EXIF & C2PA Certificates' },
      { name: 'Font Alignment', val: 'Newspaper Template Match' },
    ],
    details: 'Detects Photoshop text overlay edits on newspaper cards (e.g. Somoy TV, Prothom Alo), fake varsity seal stamps, and GAN facial blending seams.',
  },
  {
    id: 'explainability',
    tag: 'LAYER 05',
    title: 'Auditable XAI Output Generator',
    titleBn: 'ব্যাখ্যাযোগ্য এআই ও প্রমাণ রিপোর্ট',
    icon: <FileCheck size={22} style={{ color: '#00E599' }} />,
    color: '#00E599',
    summary: 'Synthesizes evidence trails, Bengali explanations, confidence scores, and PDF gazette link citations.',
    specs: [
      { name: 'Output Schema', val: 'Auditable JSON + UI Card' },
      { name: 'Explanation Lang', val: 'Plain Bengali + English' },
      { name: 'Verdict Classes', val: 'VERIFIED, UNVERIFIED, SCAM' },
      { name: 'Audit Proof', val: 'Gazette URL & Timestamp' },
    ],
    details: 'Combines outputs from NLP, forensic, and RAG layers into a clear, non-blackbox report with exact gazette PDF link evidence for complete auditability.',
  },
];

export default function Architecture() {
  const [activeTab, setActiveTab] = useState<string>('ingestion');
  const activeModule = ARCHITECTURE_MODULES.find(m => m.id === activeTab) || ARCHITECTURE_MODULES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto', width: '100%', paddingBottom: 48 }}>

      {/* ── PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          background: '#0F1714',
          border: '1px solid #1B2923',
          borderRadius: 24,
          padding: '28px 32px',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(0, 229, 153, 0.08)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, rgba(0, 229, 153, 0.4), transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.12)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>
                SYSTEM SPECIFICATIONS v2.4
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>PRODUCTION READY</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              FactLens System Architecture
            </h1>
            <p style={{ fontSize: 13, color: '#00E599', margin: 0 }}>
              ফ্যাক্টলেন্স প্ল্যাটফর্মের কারিগরি ইনফ্রাস্ট্রাকচার, নিউরাল পাইপলাইন এবং গেজেট ডাটাবেস আর্কিটেকচার।
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              to="/app/help"
              style={{
                padding: '12px 20px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                background: '#080C0B',
                color: '#FFFFFF',
                border: '1px solid #1B2923',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Code size={15} /> API Documentation
            </Link>
            <Link
              to="/app"
              style={{
                padding: '12px 24px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 800,
                background: '#00E599',
                color: '#000000',
                boxShadow: '0 0 20px rgba(0, 229, 153, 0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Zap size={15} /> Open Workspace
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── PIPELINE FLOW DIAGRAM CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {ARCHITECTURE_MODULES.map((mod) => (
          <div
            key={mod.id}
            onClick={() => setActiveTab(mod.id)}
            style={{
              padding: 20,
              background: activeTab === mod.id ? '#0F1714' : '#080C0B',
              border: `1px solid ${activeTab === mod.id ? mod.color : '#1B2923'}`,
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: activeTab === mod.id ? `0 0 25px ${mod.color}20` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, color: mod.color }}>{mod.tag}</span>
              {mod.icon}
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>{mod.title}</h4>
            <p style={{ fontSize: 11, color: mod.color, margin: 0 }}>{mod.titleBn}</p>
          </div>
        ))}
      </div>

      {/* ── ACTIVE MODULE INSPECTOR BOX ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            background: '#0F1714',
            border: `1px solid ${activeModule.color}40`,
            borderRadius: 24,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            boxShadow: `0 0 40px ${activeModule.color}15`,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1B2923', paddingBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${activeModule.color}15`, border: `1px solid ${activeModule.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeModule.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, color: activeModule.color }}>{activeModule.tag} INSPECTION</span>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{activeModule.title}</h2>
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', background: '#080C0B', padding: '6px 14px', borderRadius: 99, border: '1px solid #1B2923' }}>
              PROVENANCE TRACKING ACTIVE
            </span>
          </div>

          {/* Details & Specs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
            <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: '#E2E8E5', margin: 0, lineHeight: 1.6 }}>{activeModule.summary}</p>
              <div style={{ padding: 18, background: '#080C0B', borderRadius: 18, border: '1px solid #1B2923', fontSize: 13, color: '#8E9E97', lineHeight: 1.6 }}>
                💡 <strong style={{ color: '#FFFFFF' }}>Architectural Workflow:</strong> {activeModule.details}
              </div>
            </div>

            <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>TECHNICAL PARAMETERS</span>
              <div style={{ background: '#080C0B', borderRadius: 18, border: '1px solid #1B2923', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeModule.specs.map((spec, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, borderBottom: idx < activeModule.specs.length - 1 ? '1px solid #1B2923' : 'none', paddingBottom: 8 }}>
                    <span style={{ color: '#8E9E97' }}>{spec.name}</span>
                    <span style={{ color: activeModule.color, fontFamily: 'monospace', fontWeight: 700 }}>{spec.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── PIPELINE FLOW OVERVIEW TABLE ── */}
      <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} style={{ color: '#00E599' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>End-to-End Pipeline Execution Stack</h3>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>ZERO-TRUST VERIFICATION</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { stage: '1. Ingestion', latency: '< 50ms', desc: 'Text, image file, or URL ingestion' },
            { stage: '2. Tokenization', latency: '< 120ms', desc: 'BangaBERT Bengali text parsing' },
            { stage: '3. Vector RAG Search', latency: '< 180ms', desc: 'HNSW Cosine search on 48k Gazettes' },
            { stage: '4. Forensic Inspection', latency: '< 450ms', desc: 'ELA pixel noise & EXIF analysis' },
            { stage: '5. XAI Synthesis', latency: '< 200ms', desc: 'Bengali explanation & audit PDF links' },
          ].map((item, idx) => (
            <div key={idx} style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>{item.stage}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>{item.latency}</span>
              </div>
              <p style={{ fontSize: 11, color: '#8E9E97', margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
