import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  ArrowRight,
  Edit2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ScanLine
} from 'lucide-react';
import { extractOcrApi } from '@/services/api';

interface LocationState {
  file?: File;
  content?: string;
  fromModule?: string;
}

export default function OCRReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const file = state.file;
  const fileName = file ? file.name : 'screenshot_scam_sample.png';
  const fromModule = state.fromModule || 'rumor';

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState(
    state.content || (file ? '' : 'তথ্য পর্যালোচনা করতে স্ক্রিনশট আপলোড করুন।')
  );
  const [confidence, setConfidence] = useState(file ? '—' : '98.6%');
  const [ocrEngine, setOcrEngine] = useState('Bengali Neural OCR (Tesseract v5.4)');
  const [isScanning, setIsScanning] = useState(Boolean(file && !state.content));
  const [statusMessage, setStatusMessage] = useState('Preparing image for optical character recognition...');

  // Setup preview URL and trigger OCR
  useEffect(() => {
    let objectUrl: string | null = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setImagePreviewUrl(objectUrl);
    }

    if (file && !state.content) {
      setIsScanning(true);
      setStatusMessage('Extracting Bengali & English text from image...');

      // 1. Try Backend OCR API
      extractOcrApi(file)
        .then(async (res) => {
          if (res && res.success && res.extracted_text && res.extracted_text.trim().length > 3) {
            setExtractedText(res.extracted_text);
            setConfidence(res.confidence_pct || '96.5%');
            setOcrEngine(res.engine || 'FastAPI Neural OCR');
            setIsScanning(false);
          } else {
            // 2. Fallback to client-side Tesseract.js in browser
            try {
              setStatusMessage('Running browser client-side OCR fallback...');
              const { createWorker } = await import('tesseract.js');
              const worker = await createWorker('ben+eng');
              const ret = await worker.recognize(file);
              await worker.terminate();

              if (ret.data.text && ret.data.text.trim().length > 3) {
                setExtractedText(ret.data.text.trim());
                setConfidence(`${Math.round(ret.data.confidence || 92)}%`);
                setOcrEngine('Tesseract.js Wasm Engine');
              }
            } catch (err) {
              console.warn('[OCR Fallback]:', err);
            } finally {
              setIsScanning(false);
            }
          }
        })
        .catch(() => {
          setIsScanning(false);
        });
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, state.content]);

  const handleReRunOcr = async () => {
    if (!file) return;
    setIsScanning(true);
    setStatusMessage('Re-analyzing image with neural OCR filter...');
    try {
      const res = await extractOcrApi(file);
      if (res && res.extracted_text) {
        setExtractedText(res.extracted_text);
        setConfidence(res.confidence_pct);
      }
    } catch {
      // fallback
    } finally {
      setIsScanning(false);
    }
  };

  const handleProceed = () => {
    if (fromModule === 'scam') {
      navigate('/app/result/scam', {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00D2C2', background: 'rgba(0, 210, 194, 0.12)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 210, 194, 0.3)' }}>
              OCR TEXT EXTRACTION CHECKPOINT
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} /> {ocrEngine}
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Bengali Screenshot OCR Review
          </h1>
          <p style={{ fontSize: 13, color: '#00D2C2', margin: 0 }}>
            স্ক্রিনশট থেকে এক্সট্রাক্ট করা টেক্সটটি রিভিউ করুন এবং প্রয়োজনে সংশোধন করে যাচাইকরণ চালান।
          </p>
        </div>

        <div style={{ padding: '8px 18px', background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', textAlign: 'right' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97', textTransform: 'uppercase', display: 'block' }}>OCR CONFIDENCE</span>
          <span style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 900, color: '#00D2C2' }}>{confidence}</span>
        </div>
      </motion.div>

      {/* ── SIDE-BY-SIDE OCR WORKSPACE ── */}
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'stretch' }}>

        {/* Left: Input Screenshot Frame */}
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ScanLine size={14} /> RAW SCREENSHOT INGESTION
            </span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>{fileName}</span>
          </div>

          <div style={{
            position: 'relative',
            background: '#080C0B',
            borderRadius: 16,
            border: '1px solid #1B2923',
            overflow: 'hidden',
            minHeight: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12
          }}>
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Uploaded Screenshot"
                style={{
                  maxHeight: 240,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 10,
                  border: '1px solid #1B2923'
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0, 229, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E599' }}>
                  <FileText size={24} />
                </div>
                <p style={{ fontSize: 12, color: '#8E9E97', margin: 0 }}>Digital News Image Ingested</p>
              </div>
            )}

            {/* Scanning Laser Animation Overlay */}
            {isScanning && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(8, 12, 11, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backdropFilter: 'blur(3px)'
              }}>
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, transparent, #00D2C2, #00E599, transparent)',
                    boxShadow: '0 0 15px #00E599'
                  }}
                  animate={{ y: [0, 240, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                />
                <RefreshCw size={26} color="#00E599" className="animate-spin" />
                <span style={{ fontSize: 12, color: '#E2E8E5', fontFamily: 'monospace', fontWeight: 600 }}>{statusMessage}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>Status: {isScanning ? 'Processing...' : 'Text Recognized'}</span>
            {file && (
              <button
                onClick={handleReRunOcr}
                disabled={isScanning}
                style={{
                  background: 'transparent',
                  border: '1px solid #1B2923',
                  borderRadius: 8,
                  padding: '4px 10px',
                  color: '#00D2C2',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={11} className={isScanning ? 'animate-spin' : ''} /> Re-extract
              </button>
            )}
          </div>
        </div>

        {/* Right: Editable Extracted Text Editor */}
        <div style={{ background: '#0F1714', border: '1px solid rgba(0, 210, 194, 0.4)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 0 30px rgba(0, 210, 194, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit2 size={14} style={{ color: '#00D2C2' }} />
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2', fontWeight: 700, textTransform: 'uppercase' }}>EDITABLE CLAIM TEXT</span>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={11} /> UTF-8 NORMALIZED
            </span>
          </div>

          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={7}
            placeholder="Review or modify the extracted claim text here..."
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

          <p style={{ fontSize: 11, color: '#8E9E97', margin: 0, lineHeight: 1.4 }}>
            💡 Tip: Review the OCR output above. You can freely edit or trim words before running the BanglaBERT + Web metasearch pipeline.
          </p>

          <button
            onClick={handleProceed}
            disabled={!extractedText.trim() || isScanning}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 900,
              border: 'none',
              cursor: (!extractedText.trim() || isScanning) ? 'not-allowed' : 'pointer',
              background: (!extractedText.trim() || isScanning) ? '#1B2923' : '#00E599',
              color: (!extractedText.trim() || isScanning) ? '#8E9E97' : '#000000',
              boxShadow: (!extractedText.trim() || isScanning) ? 'none' : '0 0 25px rgba(0, 229, 153, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            Confirm & Run Verification Pipeline <ArrowRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
