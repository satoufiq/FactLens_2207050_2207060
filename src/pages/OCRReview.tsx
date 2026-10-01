import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  ArrowRight,
  Edit2
} from 'lucide-react';

interface LocationState {
  file?: File;
  content?: string;
  fromModule?: string;
}

export default function OCRReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const fileName = state.file ? state.file.name : 'screenshot_scam_sample.png';
  const fromModule = state.fromModule || 'rumor';

  const [extractedText, setExtractedText] = useState(
    state.content || 'অভিনন্দন! আপনি ৫০,০০০ টাকা পুরস্কার জিতেছেন। পুরস্কার পেতে এখনই ৫০০ টাকা প্রসেসিং ফি প্রদান করুন।'
  );
  const confidence = '99.4%';

  const handleProceed = () => {
    if (fromModule === 'scam') {
      navigate('/app/scam/processing', {
        state: { content: extractedText, type: 'OCR' }
      });
    } else {
      navigate('/app/rumor/processing', {
        state: { confirmedText: extractedText }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100, margin: '0 auto', width: '100%', paddingBottom: 48, alignItems: 'center' }}>

      {/* ── HEADER BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          background: '#0F1714',
          border: '1px solid rgba(0, 210, 194, 0.3)',
          borderRadius: 24,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00D2C2', background: 'rgba(0, 210, 194, 0.12)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 210, 194, 0.3)', width: 'fit-content' }}>
            OCR TEXT EXTRACTION CHECKPOINT
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Bengali Screenshot OCR Review
          </h1>
          <p style={{ fontSize: 13, color: '#00D2C2', margin: 0 }}>
            স্ক্রিনশট থেকে এক্সট্রাক্ট করা বাংলা টেক্সটটি রিভিউ করুন এবং প্রয়োজনে সংশোধন করুন।
          </p>
        </div>

        <div style={{ padding: '8px 18px', background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', textAlign: 'right' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97', textTransform: 'uppercase', display: 'block' }}>OCR CONFIDENCE</span>
          <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 900, color: '#00D2C2' }}>{confidence}</span>
        </div>
      </motion.div>

      {/* ── SIDE-BY-SIDE OCR WORKSPACE ── */}
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>

        {/* Left: Input Screenshot Frame */}
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>RAW SCREENSHOT INGESTION</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>{fileName}</span>
          </div>

          <div style={{ padding: 24, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0, 229, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E599' }}>
              <FileText size={20} />
            </div>
            <p style={{ fontSize: 13, color: '#E2E8E5', fontWeight: 700, margin: 0 }}>"{extractedText}"</p>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>Resolution: 1080x720 • Bounding Box Detected</span>
          </div>
        </div>

        {/* Right: Editable Extracted Text Editor */}
        <div style={{ background: '#0F1714', border: '1px solid rgba(0, 210, 194, 0.4)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 0 30px rgba(0, 210, 194, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit2 size={14} style={{ color: '#00D2C2' }} />
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2', fontWeight: 700, textTransform: 'uppercase' }}>EDITABLE CLAIM TEXT</span>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599' }}>UTF-8 NORMALIZED</span>
          </div>

          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              background: '#080C0B',
              border: '1px solid #1B2923',
              borderRadius: 16,
              padding: 16,
              color: '#FFFFFF',
              fontSize: 15,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              fontFamily: '"Noto Sans Bengali", sans-serif',
              fontWeight: 600,
            }}
          />

          <button
            onClick={handleProceed}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 900,
              border: 'none',
              cursor: 'pointer',
              background: '#00E599',
              color: '#000000',
              boxShadow: '0 0 25px rgba(0, 229, 153, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            Confirm & Run Gazette Verification <ArrowRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
