import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Cpu,
  Terminal,
  Copy,
  Check,
  BookOpen,
  Database
} from 'lucide-react';

const DOC_SECTIONS = [
  {
    id: 'overview',
    label: 'Methodology Overview',
    icon: <BookOpen size={16} />,
  },
  {
    id: 'api-ref',
    label: 'API Reference & Endpoints',
    icon: <Terminal size={16} />,
  },
  {
    id: 'bangabert-spec',
    label: 'BangaBERT NLP Specs',
    icon: <Cpu size={16} />,
  },
  {
    id: 'pid-indexing',
    label: 'PID Gazette Indexing',
    icon: <Database size={16} />,
  },
  {
    id: 'faq',
    label: 'FAQ & Troubleshooting',
    icon: <HelpCircle size={16} />,
  },
];

const API_EXAMPLES = {
  curl: `curl -X POST https://api.factlens.bd/v1/verify \\
  -H "Authorization: Bearer fl_live_key_90218" \\
  -H "Content-Type: application/json" \\
  -d '{
    "claim_text": "আগামীকাল সারাদেশে সকল বিশ্ববিদ্যালয় পরীক্ষা স্থগিত করা হয়েছে",
    "language": "bn",
    "include_evidence_links": true
  }'`,
  python: `import requests

url = "https://api.factlens.bd/v1/verify"
headers = {
    "Authorization": "Bearer fl_live_key_90218",
    "Content-Type": "application/json"
}
payload = {
    "claim_text": "আগামীকাল সারাদেশে সকল বিশ্ববিদ্যালয় পরীক্ষা স্থগিত করা হয়েছে",
    "language": "bn",
    "include_evidence_links": True
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  javascript: `const response = await fetch('https://api.factlens.bd/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fl_live_key_90218',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    claim_text: 'আগামীকাল সারাদেশে সকল বিশ্ববিদ্যালয় পরীক্ষা স্থগিত করা হয়েছে',
    language: 'bn',
    include_evidence_links: true
  })
});

const result = await response.json();
console.log(result);`,
};

export default function TechSpecHelp() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [codeLang, setCodeLang] = useState<'curl' | 'python' | 'javascript'>('curl');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(API_EXAMPLES[codeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                DOCUMENTATION & METHODOLOGY
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>v2.4 API DOCS</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Documentation & API Reference
            </h1>
            <p style={{ fontSize: 13, color: '#00E599', margin: 0 }}>
              ফ্যাক্টলেন্স প্ল্যাটফর্মের ডকুমেন্টেশন, মেথডোলজি এবং ডেভেলপার এপিআই গাইডে স্বাগতম।
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              to="/app/architecture"
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
              <Cpu size={15} /> System Architecture
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── DOC TABS & MAIN CONTENT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, alignItems: 'start' }}>

        {/* Left Navigation Sidebar */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97', textTransform: 'uppercase', padding: '8px 12px', fontWeight: 700 }}>DOCUMENTATION INDEX</span>
            {DOC_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveTab(sec.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 16,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: activeTab === sec.id ? '#080C0B' : 'transparent',
                  color: activeTab === sec.id ? '#00E599' : '#8E9E97',
                  boxShadow: activeTab === sec.id ? '0 0 15px rgba(0,229,153,0.15)' : 'none',
                  borderLeft: activeTab === sec.id ? '3px solid #00E599' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Quick API Key Box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>DEVELOPER CREDENTIALS</span>
            <p style={{ fontSize: 12, color: '#8E9E97', margin: 0 }}>Your active API Bearer Token:</p>
            <div style={{ padding: '10px 12px', background: '#080C0B', borderRadius: 12, border: '1px solid #1B2923', fontFamily: 'monospace', fontSize: 11, color: '#00E599', wordBreak: 'break-all' }}>
              fl_live_key_90218x772b
            </div>
          </div>
        </div>

        {/* Right Documentation Display */}
        <div style={{ gridColumn: 'span 8' }}>
          <AnimatePresence mode="wait">

            {/* TAB 1: OVERVIEW & METHODOLOGY */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1B2923', paddingBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>SECTION 01</span>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Methodology & Verification Logic</h2>
                </div>

                <p style={{ fontSize: 14, color: '#E2E8E5', lineHeight: 1.6, margin: 0 }}>
                  FactLens operates on a zero-trust multi-stage verification framework engineered specifically for Bangladeshi media ecosystems. It handles viral claims, deepfakes, and smishing scams across 4 core pipeline stages:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { step: '01', title: 'Multilingual NLP & Bengali Tokenization', desc: 'Claims are processed through BangaBERT fine-tuned on local Bangladeshi news syntax, dialect variations, and social media transliteration.' },
                    { step: '02', title: 'Fact Database & Gazette RAG Retrieval', desc: 'Retrieves verified gazettes from Bangladesh Press Information Department (PID), university registrar portals, and official ministry circulars.' },
                    { step: '03', title: 'Multimodal Deepfake Forensic Inspection', desc: 'Analyzes pixel noise distribution using Error Level Analysis (ELA), EXIF camera metadata, and GAN facial landmark alignment.' },
                    { step: '04', title: 'Explainable AI & Bengali Verdict Reports', desc: 'Generates evidence-backed side-by-side claim vs reality comparisons with plain Bengali explanations and PDF link citations.' },
                  ].map((s, idx) => (
                    <div key={idx} style={{ padding: 18, background: '#080C0B', borderRadius: 18, border: '1px solid #1B2923', display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: '#00E599', flexShrink: 0 }}>{s.step}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{s.title}</h4>
                        <p style={{ fontSize: 12, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 2: API REFERENCE & ENDPOINTS */}
            {activeTab === 'api-ref' && (
              <motion.div
                key="api-ref"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1B2923', paddingBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>SECTION 02</span>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>REST API Reference</h2>
                </div>

                {/* Endpoint badge */}
                <div style={{ padding: 16, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#000000', background: '#00E599', padding: '4px 10px', borderRadius: 8 }}>POST</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#FFFFFF', fontWeight: 700 }}>/v1/verify</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>JSON Body • Auth Required</span>
                </div>

                {/* Code Language Selector & Snippet */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['curl', 'python', 'javascript'] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => setCodeLang(l)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: codeLang === l ? '#00E599' : '#080C0B',
                            color: codeLang === l ? '#000000' : '#8E9E97',
                          }}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleCopyCode}
                      style={{ background: '#080C0B', border: '1px solid #1B2923', color: '#00E599', padding: '6px 12px', borderRadius: 10, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <pre style={{ padding: 20, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', color: '#00E599', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, overflowX: 'auto', margin: 0 }}>
                    {API_EXAMPLES[codeLang]}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* TAB 3: BANGABERT NLP SPECS */}
            {activeTab === 'bangabert-spec' && (
              <motion.div
                key="bangabert-spec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1B2923', paddingBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>SECTION 03</span>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>BangaBERT NLP Specifications</h2>
                </div>

                <p style={{ fontSize: 14, color: '#E2E8E5', lineHeight: 1.6, margin: 0 }}>
                  BangaBERT is a BERT-based transformer model fine-tuned on 120,000 Bangladeshi news headlines, rumor threads, and government gazette circulars.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  {[
                    { label: 'Vocabulary Size', val: '32,000 Tokens' },
                    { label: 'Stance F1-Score', val: '94.8%' },
                    { label: 'Dialect Normalizer', val: 'Banglish + Standard BN' },
                    { label: 'Inference Latency', val: '120ms / Batch' },
                  ].map((stat, idx) => (
                    <div key={idx} style={{ padding: 16, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', textAlign: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#00E599', fontFamily: 'monospace' }}>{stat.val}</span>
                      <p style={{ fontSize: 11, color: '#8E9E97', margin: '4px 0 0' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: PID GAZETTE INDEXING */}
            {activeTab === 'pid-indexing' && (
              <motion.div
                key="pid-indexing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1B2923', paddingBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>SECTION 04</span>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>PID Gazette & Gazette Indexing</h2>
                </div>

                <p style={{ fontSize: 14, color: '#E2E8E5', lineHeight: 1.6, margin: 0 }}>
                  FactLens maintains a continuous RAG vector index of Press Information Department (PID) gazettes, Ministry advisories, and university registrar portals.
                </p>

                <div style={{ padding: 20, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#8E9E97' }}>Synchronized Sources:</span>
                    <span style={{ color: '#00E599', fontFamily: 'monospace', fontWeight: 700 }}>48,420 Circulars</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#8E9E97' }}>Sync Frequency:</span>
                    <span style={{ color: '#00E599', fontFamily: 'monospace', fontWeight: 700 }}>Every 15 Minutes</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: FAQ & TROUBLESHOOTING */}
            {activeTab === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1B2923', paddingBottom: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700 }}>SECTION 05</span>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Frequently Asked Questions</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { q: 'What does an "Unverified" result status mean?', a: 'Unverified means evidence in gazette databases was insufficient to make a definitive ruling — not that the claim is automatically false. Transparency is our core principle.' },
                    { q: 'How does FactLens detect Photoshop newspaper edits?', a: 'Error Level Analysis (ELA) isolates JPEG re-compression gradients. Text overlays inserted via Photoshop display conflicting compression noise levels.' },
                    { q: 'Can I verify claims written in Banglish or local dialects?', a: 'Yes. BangaBERT contains tokenizers trained on social media Banglish transliterations and local Bengali dialects.' },
                  ].map((faq, idx) => (
                    <div key={idx} style={{ padding: 18, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{faq.q}</h4>
                      <p style={{ fontSize: 12, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
