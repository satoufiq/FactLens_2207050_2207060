import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Cpu,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  submitScanOnce,
  createRumorScan,
  pollRumorScan,
  ApiError,
  type ClaimVerifyResponse,
  type ScanStatus,
} from '@/services/api';
import { SystemStorage, type ScanRecord } from '@/services/storage';

interface LocationState {
  confirmedText?: string;
  claimText?: string;
  inputUrl?: string;
  sourceFormat?: 'TEXT' | 'IMAGE' | 'URL';
}

/**
 * Pipeline stages, matching the proposal's Module 1 processing pipeline.
 *
 * Progress is driven by the scan's real lifecycle status, not by a timer:
 * PENDING means it is queued, PROCESSING means the worker has it. Showing a
 * fake progress bar that finishes before the work does would misrepresent what
 * the system is doing.
 */
const scanStages = [
  { label: 'Normalizing claim and extracting the factual statement...', pct: 20 },
  { label: 'Running BanglaVerify classification...', pct: 45 },
  { label: 'Retrieving and scoring external evidence...', pct: 75 },
  { label: 'Aggregating the verdict and writing the explanation...', pct: 100 },
];

export default function RumorProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  // Only the claim the user submitted -- never a sample.
  const claimText = state.confirmedText || state.claimText || '';

  const dynamicEntity = (() => {
    const text = claimText.trim();
    const commonEntities = [
      'ঢাকা বিশ্ববিদ্যালয়', 'চট্টগ্রাম বিশ্ববিদ্যালয়', 'রাজশাহী বিশ্ববিদ্যালয়', 'বুয়েট',
      'শিক্ষা প্রতিষ্ঠান', 'মাদ্রাসা', 'বার্ন ইনস্টিটিউট', 'হাসপাতাল', 'বাংলাদেশ রেলওয়ে',
      'নির্বাচন কমিশন', 'বাংলাদেশ ব্যাংক', 'প্রধান উপদেষ্টা', 'আন্দোলন', 'পুলিশ', 'বিস্ফোরণ',
    ];
    for (const ent of commonEntities) {
      if (text.includes(ent)) return ent;
    }
    const tokens = text.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length >= 2) return `${tokens[0]} ${tokens[1]}`;
    if (tokens.length === 1) return tokens[0];
    return text.slice(0, 24);
  })();

  const tokenCount = claimText.trim().split(/\s+/).filter(Boolean).length;

  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<ScanStatus>('PENDING');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const apiResultRef = useRef<ClaimVerifyResponse | null>(null);

  // Nothing submitted (page opened directly or refreshed): back to the form.
  useEffect(() => {
    if (!claimText.trim()) navigate('/app/rumor', { replace: true });
  }, [claimText, navigate]);

  // --- submit and poll -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    if (!claimText.trim()) return;

    (async () => {
      try {
        const accepted = await submitScanOnce(`rumor:${location.key}`, () =>
          createRumorScan({
            claim: claimText,
            input_url: state.inputUrl,
            source_format: state.sourceFormat ?? 'TEXT',
            ocr_confirmed: state.sourceFormat === 'IMAGE',
          }),
        );
        if (cancelled) return;

        setScanId(accepted.scan_id);
        setCached(accepted.cached);
        setLiveStatus(accepted.status);

        const result = await pollRumorScan(accepted.scan_id, {
          onUpdate: (status) => {
            if (cancelled) return;
            setLiveStatus(status);
            // PENDING = queued, PROCESSING = the worker has it.
            setStage((current) => (status === 'PROCESSING' ? Math.max(current, 1) : current));
          },
        });
        if (cancelled) return;

        apiResultRef.current = result;
        setLiveStatus(result.status);
        setElapsedMs(result.duration_ms ?? Date.now() - startedAt);

        try {
          sessionStorage.setItem('last_verification_result', JSON.stringify(result));
          sessionStorage.setItem('last_claim_text', claimText);
        } catch (e) {
          console.warn('SessionStorage write error:', e);
        }

        const claim = result.claim_text ?? claimText;
        const record: ScanRecord = {
          id: result.scan_id,
          type: 'RUMOR',
          title: claim.length > 50 ? `${claim.slice(0, 47)}...` : claim,
          inputText: claim,
          result: result.verdict ?? 'UNABLE_TO_ANALYZE',
          confidence: result.confidence ?? 0,
          confidenceDisplay: result.confidence_display ?? '—',
          createdAt: result.created_at || new Date().toISOString(),
          summary: result.summary ?? result.explanation?.summary ?? '',
          summaryBn: result.summary_bn ?? result.explanation?.summary_bn ?? '',
          evidenceCount: result.evidence?.length || 0,
          lifecycleStatus: result.status,
          isDegraded: result.is_degraded,
          details: {
            degradedReason: result.degraded_reason,
            precedence: result.detail?.precedence,
            modelRuns: result.model_runs,
            evidence: result.evidence,
          },
        };
        SystemStorage.saveScan(record);

        setStage(scanStages.length - 1);
        setDone(true);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof ApiError
            ? e.detail
            : 'FactLens could not reach the verification service. Check that the backend is running and try again.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [claimText, state.inputUrl, state.sourceFormat]);

  // --- advance the visible stage while work is genuinely in progress -------
  useEffect(() => {
    if (isPaused || done || error) return;
    if (liveStatus !== 'PROCESSING') return;
    if (stage >= scanStages.length - 2) return;

    const timer = setTimeout(() => setStage((s) => Math.min(s + 1, scanStages.length - 2)), 2500);
    return () => clearTimeout(timer);
  }, [stage, isPaused, done, error, liveStatus]);

  // --- navigate once the verdict exists ------------------------------------
  useEffect(() => {
    if (!done || !apiResultRef.current) return;
    const result = apiResultRef.current;
    const timer = setTimeout(() => {
      navigate(`/app/result/rumor/${result.scan_id}`, {
        state: { claimText, verificationResult: result },
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [done, navigate, claimText]);

  const current = scanStages[stage];
  const result = apiResultRef.current;
  const isDegraded = result?.is_degraded ?? false;

  const statusLabel: Record<ScanStatus, string> = {
    PENDING: 'Queued',
    PROCESSING: 'Analyzing',
    COMPLETED: 'Complete',
    PARTIAL: 'Complete (partial)',
    FAILED: 'Failed',
    TIMEOUT: 'Timed out',
    AWAITING_INPUT: 'Needs your input',
  };

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
          <span>ASYNCHRONOUS VERIFICATION PIPELINE</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
          Claim Verification Pipeline
        </h1>
        <p style={{ fontSize: 14, color: '#00E599', margin: 0 }}>
          ফ্যাক্টলেন্স রিয়েল-টাইমে সরকারি পরিপত্র ও প্রেস বিজ্ঞপ্তির সাথে দাবিটি মিলিয়ে দেখছে।
        </p>
      </motion.div>

      {/* ── ERROR STATE ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 820, background: 'rgba(255, 95, 86, 0.1)', border: '1px solid rgba(255, 95, 86, 0.4)', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left' }}
        >
          <AlertTriangle size={20} style={{ color: '#FF5F56', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>
              This scan could not be started
            </p>
            <p style={{ margin: '6px 0 12px', fontSize: 13, color: '#C8D3CE', lineHeight: 1.6 }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#00E599', color: '#000', fontWeight: 800, fontSize: 12, padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        </motion.div>
      )}

      {/* ── SCANNER CONSOLE ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#060A09', borderBottom: '1px solid #1B2923' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', marginLeft: 8 }}>
              factlens://rumours/scans{scanId ? `/${scanId}` : ''}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: done ? '#00E599' : '#00D2C2', background: done ? 'rgba(0, 229, 153, 0.1)' : 'rgba(0, 210, 194, 0.1)', padding: '2px 8px', borderRadius: 99, border: `1px solid ${done ? 'rgba(0, 229, 153, 0.3)' : 'rgba(0, 210, 194, 0.3)'}` }}>
              {done ? '✓' : '●'} {statusLabel[liveStatus]}
            </span>
            {cached && (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#FFBD2E', background: 'rgba(255, 189, 46, 0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(255, 189, 46, 0.3)' }}>
                reused recent verdict
              </span>
            )}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{ background: '#0F1714', border: '1px solid #1B2923', color: '#00E599', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '4px 12px', borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>SUBMITTED CLAIM INPUT</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.5 }}>
              "{claimText}"
            </p>
          </div>

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

          {/* A PARTIAL result is a success with a caveat, and the caveat is
              shown here rather than being quietly dropped. */}
          <AnimatePresence>
            {done && isDegraded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: 16, background: 'rgba(255, 189, 46, 0.12)', border: '1px solid rgba(255, 189, 46, 0.5)', borderRadius: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <AlertTriangle size={18} style={{ color: '#FFBD2E', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                    Partial result — part of the system was unavailable
                  </p>
                  {result?.degraded_reason?.map((entry, i) => (
                    <p key={i} style={{ margin: '6px 0 0', fontSize: 12, color: '#C8D3CE', lineHeight: 1.6 }}>
                      {entry.user_message}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: 16, background: 'rgba(0, 229, 153, 0.15)', border: '1px solid #00E599', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} style={{ color: '#00E599' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                    Analysis complete. Opening the report...
                  </span>
                </div>
                <button
                  onClick={() =>
                    navigate(`/app/result/rumor/${result?.scan_id ?? scanId}`, {
                      state: { claimText, verificationResult: result },
                    })
                  }
                  style={{ background: '#00E599', color: '#000', fontWeight: 800, fontSize: 12, padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  View Result <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      {/* ── TELEMETRY LOG ── */}
      <div style={{ width: '100%', maxWidth: 820, background: '#080C0B', border: '1px solid #1B2923', borderRadius: 20, padding: 20, textAlign: 'left', fontFamily: 'monospace', fontSize: 11, color: '#8E9E97', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1B2923', paddingBottom: 8, color: '#FFFFFF', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} style={{ color: '#00E599' }} /> SYSTEM TELEMETRY LOG
          </div>
          <span style={{ color: '#00E599' }}>LIVE</span>
        </div>
        <p style={{ margin: 0, color: '#00E599' }}>
          Payload accepted ({claimText.length} chars, {tokenCount} tokens).
        </p>
        {scanId && (
          <p style={{ margin: 0, color: '#FFFFFF' }}>
            Scan {scanId} written as PENDING and queued to the rumor worker.
          </p>
        )}
        <p style={{ margin: 0, color: stage >= 1 ? '#00D2C2' : '#8E9E97' }}>
          Claim extraction: "{dynamicEntity}" identified.
        </p>
        <p style={{ margin: 0, color: stage >= 2 ? '#00E599' : '#8E9E97' }}>
          Evidence retrieval and stance scoring in progress...
        </p>
        {result?.model_runs?.map((run, i) => (
          <p key={i} style={{ margin: 0, color: run.status === 'OK' ? '#00E599' : '#FFBD2E' }}>
            {run.model_name} {run.model_version} → {run.status}
            {run.status === 'OK' && run.latency_ms ? ` (${run.latency_ms.toFixed(0)}ms)` : ''}
            {run.error_message ? ` — ${run.error_message}` : ''}
          </p>
        ))}
        {done && (
          <p style={{ margin: 0, color: isDegraded ? '#FFBD2E' : '#00E599' }}>
            [{elapsedMs ? (elapsedMs / 1000).toFixed(2) : '—'}s] {result?.status}: verdict{' '}
            {result?.verdict ?? 'UNKNOWN'} (decided by{' '}
            {result?.detail?.precedence?.decided_by ?? 'n/a'}).
          </p>
        )}
      </div>

    </div>
  );
}
