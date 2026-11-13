import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
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
  CheckCircle,
  Cpu,
  Layers,
  ExternalLink,
  Globe,
  Sliders,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import {
  createRumorScan,
  pollRumorScan,
  submitScanOnce,
  getRumorScan,
  checkBackendHealth,
  downloadScanPdf,
  type ClaimVerifyResponse,
} from '@/services/api';
import { SystemStorage } from '@/services/storage';

interface LocationState {
  claimText?: string;
  verificationResult?: ClaimVerifyResponse;
}

const scanStages = [
  { label: 'Ingesting claim & running Unicode normalization...', pct: 20 },
  { label: 'Running the BanglaVerify model...', pct: 45 },
  { label: 'Executing automated DDGS web search & SSRF URL validation...', pct: 70 },
  { label: 'Extracting articles & Mamdani fuzzy logic decision synthesis...', pct: 100 },
];

export default function RumorResult() {
  const location = useLocation();
  const { id: routeScanId } = useParams<{ id: string }>();
  const state = (location.state as LocationState) || {};

  const cachedResult = (() => {
    try {
      const item = sessionStorage.getItem('last_verification_result');
      return item ? (JSON.parse(item) as ClaimVerifyResponse) : null;
    } catch {
      return null;
    }
  })();

  const cachedText = (() => {
    try {
      return sessionStorage.getItem('last_claim_text');
    } catch {
      return null;
    }
  })();

  // Only a claim the user actually submitted -- never a sample.
  const claimText = state.claimText || cachedText || '';
  const initialResult = state.verificationResult || cachedResult;
  const [liveResult, setLiveResult] = useState<ClaimVerifyResponse | null>(initialResult);
  // Service reachability and model availability are separate facts. The
  // Rumor Scanner is fully online while BanglaVerify is unregistered — it just
  // runs on the evidence pipeline and marks scans PARTIAL. Conflating the two
  // would report a healthy system as down.
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [isModelRegistered, setIsModelRegistered] = useState<boolean>(false);

  const [scanProgress, setScanProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(!initialResult);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (scanId: string) => {
    setIsDownloadingPdf(true);
    try {
      const ok = await downloadScanPdf(scanId, `FactLens_Scan_${scanId}.pdf`);
      if (!ok) {
        alert('PDF Report Generation: Connecting to Rumour Verification Service... If running standalone, verify port 8002 or 8000.');
      }
    } catch {
      alert('Error initiating PDF download.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    checkBackendHealth().then((health) => {
      if (!isMounted) return;
      setIsBackendOnline(!!health);
      setIsModelRegistered(!!health?.model?.available);
    });

    if (initialResult) {
      setIsScanning(false);
    } else if (routeScanId && routeScanId !== 'scan-live') {
      // Opened by URL (from History, or a shared link): fetch that scan rather
      // than re-running the claim, which would create a duplicate scan and
      // could return a different verdict.
      setIsScanning(true);
      getRumorScan(routeScanId)
        .then((res) => {
          if (!isMounted) return;
          setLiveResult(res);
          setIsScanning(false);
        })
        .catch(() => {
          if (isMounted) {
            setLoadError('This scan could not be loaded.');
            setIsScanning(false);
          }
        });
    } else if (!claimText.trim()) {
      // Opened directly with nothing to show.
      setIsScanning(false);
    } else {
      setIsScanning(true);
      submitScanOnce(`rumor-result:${location.key}`, () =>
        createRumorScan({ claim: claimText, source_format: 'TEXT', ocr_confirmed: false }),
      )
        .then((accepted) => pollRumorScan(accepted.scan_id))
        .then((res) => {
          if (!isMounted) return;
          if (res) {
            setLiveResult(res);
            try {
              sessionStorage.setItem('last_verification_result', JSON.stringify(res));
              sessionStorage.setItem('last_claim_text', claimText);
            } catch {
              /* sessionStorage unavailable */
            }
          }
          setIsScanning(false);
        })
        .catch((err) => {
          if (isMounted) {
            setLoadError(
              err instanceof Error && err.message
                ? err.message
                : 'FactLens could not reach the Rumor Scanner. Check that the backend is running.',
            );
            setIsScanning(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [claimText, initialResult]);

  useEffect(() => {
    if (!isScanning) {
      setScanProgress(100);
      setStageIndex(3);
      return;
    }

    setScanProgress(0);
    setStageIndex(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 95) {
          const next = prev + 3;
          if (next >= 85) setStageIndex(3);
          else if (next >= 55) setStageIndex(2);
          else if (next >= 25) setStageIndex(1);
          return next;
        }
        return prev;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isScanning]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleSave = () => {
    if (!isSaved) {
      if (themeConfig.evidence.length > 0) {
        themeConfig.evidence.forEach((ev) => {
          SystemStorage.saveEvidence({
            // Evidence rows are keyed by an integer in the database; saved
            // evidence is keyed by string.
            id: String(ev.id),
            scanId: themeConfig.scanId,
            title: ev.title,
            sourceName: ev.publisher || ev.source_name || 'Web Source',
            sourceType: ev.source_type,
            url: ev.url,
            relevanceScore: ev.relevance_score,
            relationship: ev.stance || ev.relationship || 'NEUTRAL',
            snippet: ev.snippet || '',
            savedAt: new Date().toISOString(),
            collection: 'Web & Gazette Evidence',
          });
        });
      } else {
        // Nothing was retrieved for this claim, so there is no evidence to
        // save. Never store a placeholder as if it were a real source.
        return;
      }
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  };

  const verdict = liveResult?.verdict || 'UNVERIFIED';
  const isSupported = verdict === 'SUPPORTED';
  const isContradicted = verdict === 'CONTRADICTED';
  // "Unverified - suspicious pattern" is still an unverified result: the
  // absence of evidence, with a note about the wording. It must never be
  // styled as a finding of falsehood.
  const isSuspicious = verdict === 'UNVERIFIED_SUSPICIOUS';
  const isUnverified = verdict === 'UNVERIFIED' || isSuspicious;

  // A PARTIAL scan produced a verdict without part of the system.
  const isDegraded = liveResult?.is_degraded ?? false;
  const degradedReasons = liveResult?.degraded_reason ?? [];
  const precedence = liveResult?.detail?.precedence;
  const modelRun = liveResult?.model_runs?.find((r) => r.model_name === 'BanglaVerify');

  const themeConfig = {
    color: isSupported ? '#00E599' : isContradicted ? '#F87171' : isUnverified ? '#FBBF24' : '#8E9E97',
    bg: isSupported ? 'rgba(0, 229, 153, 0.08)' : isContradicted ? 'rgba(248, 113, 113, 0.08)' : isUnverified ? 'rgba(245, 158, 11, 0.08)' : 'rgba(142, 158, 151, 0.08)',
    border: isSupported ? 'rgba(0, 229, 153, 0.35)' : isContradicted ? 'rgba(248, 113, 113, 0.35)' : isUnverified ? 'rgba(245, 158, 11, 0.35)' : 'rgba(142, 158, 151, 0.35)',
    title: liveResult?.title || (isSupported ? 'VERIFIED / SUPPORTED CLAIM' : isContradicted ? 'FALSE / CONTRADICTED CLAIM' : 'UNVERIFIED / INSUFFICIENT EVIDENCE'),
    titleBn: liveResult?.title_bn || (isSupported ? 'প্রাপ্ত প্রমাণে দাবিটি সমর্থিত' : isContradicted ? 'প্রাপ্ত প্রমাণে দাবিটি খণ্ডিত' : 'দাবিটি যাচাই করা যায়নি — যথেষ্ট প্রমাণ পাওয়া যায়নি'),
    displayLabel: isSupported
      ? 'Supported by retrieved evidence'
      : isContradicted
        ? 'Contradicted by retrieved evidence'
        : isSuspicious
          ? 'No confirming evidence, and the wording resembles known false claims'
          : 'Insufficient evidence - this does not mean the claim is false',
    score: liveResult?.confidence_display || '--',
    explanationEn:
      liveResult?.explanation?.summary ||
      liveResult?.summary ||
      'This verdict was produced from the retrieved evidence and the model prior, with evidence taking precedence.',
    explanationBn:
      liveResult?.explanation?.summary_bn ||
      liveResult?.summary_bn ||
      'প্রাপ্ত প্রমাণ ও মডেলের পূর্বানুমান থেকে এই রায় তৈরি।',
    gazetteId: 'FactLens evidence index',
    scanId: liveResult?.scan_id || '—',
    // Which layer settled the verdict: evidence, the fuzzy engine, or the
    // model prior when no evidence was found.
    decidedBy: ({
      model: 'BanglaVerify model',
      'model+evidence': 'BanglaVerify model + web evidence',
      evidence: 'Web evidence',
      no_signal: 'No signal available',
    } as Record<string, string>)[precedence?.decided_by ?? liveResult?.evidence_summary?.decided_by ?? ''] ?? 'n/a',
    disagreement: precedence?.disagreement ?? liveResult?.explanation?.disagreement ?? null,
    reasoning: liveResult?.explanation?.reasoning ?? [],
    unverifiedNotice: liveResult?.explanation?.unverified_notice ?? null,
    unverifiedNoticeBn: liveResult?.explanation?.unverified_notice_bn ?? null,
    latency: modelRun?.latency_ms ?? liveResult?.duration_ms ?? 0,
    tokens: liveResult?.detail?.model_prediction?.n_tokens ?? 0,
    modelMode: liveResult?.detail?.model_prediction?.head ?? null,
    modelPFake: liveResult?.detail?.model_prediction?.p_fake ?? null,
    modelThreshold: liveResult?.detail?.model_prediction?.threshold ?? null,
    modelPredictionReason: liveResult?.detail?.model_prediction?.reason ?? null,
    modelAvailable: liveResult?.banglaverify?.available ?? false,
    modelVersion: liveResult?.banglaverify?.version ?? '0.0.0-unregistered',
    modelReason: liveResult?.banglaverify?.reason ?? modelRun?.error_message ?? null,
    bertPrediction: liveResult?.detail?.model_prediction?.label ?? 'UNAVAILABLE',
    bertConfidence: liveResult?.detail?.model_prediction?.confidence ?? 0,
    fuzzySupport: liveResult?.fuzzy_scores?.support_score ?? 50,
    fuzzyContra: liveResult?.fuzzy_scores?.contradiction_score ?? 50,
    fuzzyMargin: liveResult?.fuzzy_scores?.decision_margin ?? 0,
    webSearchPerformed: liveResult?.web_search?.performed ?? false,
    webQueries: liveResult?.web_search?.queries_executed ?? [],
    totalResults: liveResult?.web_search?.total_results ?? 0,
    relevantResults: liveResult?.evidence?.length ?? 0,
    limitations: liveResult?.limitations ?? [],
    evidence: liveResult?.evidence ?? [],
    normalizedText: liveResult?.normalized_text || claimText,
  };

  const supportingEvidence = themeConfig.evidence.filter(e => (e.stance || e.relationship) === 'SUPPORTING');
  const contradictingEvidence = themeConfig.evidence.filter(e => (e.stance || e.relationship) === 'CONTRADICTING');
  const otherEvidence = themeConfig.evidence.filter(e => !['SUPPORTING', 'CONTRADICTING'].includes(e.stance || e.relationship));

  if (!isScanning && !liveResult) {
    return (
      <div style={{ maxWidth: 640, margin: '48px auto', padding: 28, borderRadius: 18, border: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FBBF24' }}>
          {loadError ? 'No result — the scan did not complete' : 'No claim to show'}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#E2E8E5', lineHeight: 1.6 }}>
          {loadError ??
            'Open the Rumor Scanner, enter a claim and press Verify. Results are shown only for a claim you submitted.'}
        </p>
        <Link to="/app/rumor" style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 12, background: '#00E599', color: '#040A07', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
          Go to the Rumor Scanner
        </Link>
      </div>
    );
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.12)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>
              MODULE 01 — BANGLAVERIFY + WEB + FUZZY LOGIC
            </span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: isBackendOnline ? '#00E599' : '#8E9E97', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isBackendOnline ? '#00E599' : '#FBBF24', display: 'inline-block', boxShadow: isBackendOnline ? '0 0 8px #00E599' : 'none' }} />
              {isBackendOnline === null
                ? 'Connecting to the Rumor Scanner...'
                : isBackendOnline
                  ? `Rumor Scanner online · BanglaVerify ${isModelRegistered ? 'loaded' : 'not loaded'}`
                  : 'Rumor Scanner unreachable'}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Hybrid Rumor Verification Console
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleToggleSave}
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

      {/* ── LIVE PIPELINE ARCHITECTURE BADGE ── */}
      <div style={{ width: '100%', background: '#0A0F0D', border: '1px solid #1B2923', borderRadius: 16, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Cpu size={16} style={{ color: '#00E599' }} />
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#FFFFFF', fontWeight: 700 }}>
            Tri-Tier Verification: <span style={{ color: '#00E599' }}>BanglaBERT</span> + <span style={{ color: '#00D2C2' }}>DDGS Web Evidence</span> + <span style={{ color: '#FBBF24' }}>Mamdani Fuzzy FIS</span>
          </span>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00D2C2' }}>
          Scan ID: <strong style={{ color: '#FFFFFF' }}>{themeConfig.scanId}</strong>
        </span>
      </div>

      {/* ── FACTLENS ENGINE CONSOLE HERO FRAME ── */}
      <div style={{ width: '100%', maxWidth: 880, background: '#0A0F0D', border: '1px solid rgba(0, 229, 153, 0.35)', borderRadius: 24, boxShadow: '0 0 60px rgba(0, 229, 153, 0.15)', overflow: 'hidden', textAlign: 'left' }}>
        
        {/* Chrome Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#060A09', borderBottom: '1px solid #1B2923' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', marginLeft: 8 }}>FactLens Hybrid Core v3.0</span>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00E599', background: 'rgba(0, 229, 153, 0.15)', padding: '2px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>
            ● {isScanning ? 'EVALUATING SIGNALS' : 'VERIFIED'}
          </span>
        </div>

        {/* Console Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* User's Submitted Claim text box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#00E599', textTransform: 'uppercase', fontWeight: 700 }}>
                SUBMITTED CLAIM INPUT
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>
                Unicode Normalized • Multilingual
              </span>
            </div>
            <p style={{ fontSize: 15, color: '#FFFFFF', margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
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

          {/* Dynamic Result Verdict Box */}
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
                  padding: 18,
                  background: themeConfig.bg,
                  border: `1px solid ${themeConfig.border}`,
                  borderRadius: 14,
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AlertCircle size={22} style={{ color: themeConfig.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: themeConfig.color, margin: 0, letterSpacing: '0.02em' }}>
                      {themeConfig.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#E2E8E5', margin: 0, marginTop: 3 }}>
                      {themeConfig.titleBn}
                    </p>
                    <p style={{ fontSize: 11, color: '#8E9E97', margin: 0, marginTop: 2, fontStyle: 'italic' }}>
                      {themeConfig.displayLabel}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: themeConfig.color, background: 'rgba(0, 0, 0, 0.4)', padding: '6px 14px', borderRadius: 99, border: `1px solid ${themeConfig.border}`, fontWeight: 800 }}>
                    Confidence: {themeConfig.score}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* ── PARTIAL RESULT NOTICE ──
          A degraded scan still produced a verdict, but the user is told which
          component was missing. The proposal requires a model's absence to
          change the confidence *and* the explanation, so this is not optional
          chrome: it is part of the result. */}
      {isDegraded && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            background: 'rgba(255, 189, 46, 0.1)',
            border: '1px solid rgba(255, 189, 46, 0.45)',
            borderRadius: 18,
            padding: 20,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={20} style={{ color: '#FFBD2E', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#FFBD2E' }}>
              Partial result — part of the system was unavailable
            </p>
            {degradedReasons.map((entry, i) => (
              <div key={i} style={{ marginTop: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#E2E8E5', lineHeight: 1.6 }}>
                  {entry.user_message}
                </p>
                {entry.user_message_bn && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8E9E97', lineHeight: 1.7 }}>
                    {entry.user_message_bn}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── UNVERIFIED IS NOT FALSE ──
          The single most important piece of UI copy in the project. */}
      {themeConfig.unverifiedNotice && (
        <div
          style={{
            width: '100%',
            background: 'rgba(0, 210, 194, 0.08)',
            border: '1px solid rgba(0, 210, 194, 0.3)',
            borderRadius: 18,
            padding: 18,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#E2E8E5', lineHeight: 1.6, fontWeight: 700 }}>
            {themeConfig.unverifiedNotice}
          </p>
          {themeConfig.unverifiedNoticeBn && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8E9E97', lineHeight: 1.8 }}>
              {themeConfig.unverifiedNoticeBn}
            </p>
          )}
        </div>
      )}

      {/* ── MODEL / EVIDENCE DISAGREEMENT ──
          When the classifier and the evidence disagree, the verdict follows
          the evidence and the disagreement is disclosed rather than hidden. */}
      {themeConfig.disagreement && (
        <div
          style={{
            width: '100%',
            background: 'rgba(142, 158, 151, 0.08)',
            border: '1px solid rgba(142, 158, 151, 0.3)',
            borderRadius: 18,
            padding: 18,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#8E9E97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Model and evidence disagreed
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#E2E8E5', lineHeight: 1.6 }}>
            {themeConfig.disagreement}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#8E9E97' }}>
            Verdict decided by: <strong style={{ color: '#00E599' }}>{themeConfig.decidedBy}</strong>
          </p>
        </div>
      )}

      {/* ── HYBRID INTELLIGENCE METRICS: BANGLAVERIFY + FUZZY FIS + SEARCH ── */}
      {!isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* Tri-Branch Diagnostic Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            
            {/* 1. BanglaBERT Local Stance Model Card */}
            <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={16} style={{ color: '#00E599' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', fontWeight: 800 }}>BANGLAVERIFY v2</span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>
                  {themeConfig.modelMode === 'full' ? 'Headline + article' : themeConfig.modelMode === 'short' ? 'Short text' : 'BanglaBERT'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Model Prediction:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: themeConfig.bertPrediction === 'FAKE' ? '#F87171' : themeConfig.bertPrediction === 'REAL' ? '#00E599' : '#FBBF24' }}>
                  {themeConfig.bertPrediction === 'FAKE'
                    ? 'Fake-news pattern'
                    : themeConfig.bertPrediction === 'REAL'
                      ? 'Reads as genuine reporting'
                      : 'Unavailable'}
                </span>
              </div>
              {themeConfig.bertPrediction === 'FAKE' || themeConfig.bertPrediction === 'REAL' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#E2E8E5' }}>Classification Confidence:</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#FFFFFF' }}>
                      {(themeConfig.bertConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {themeConfig.modelPFake !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#E2E8E5' }}>Fake probability / threshold:</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#FFFFFF' }}>
                        {(themeConfig.modelPFake * 100).toFixed(1)}%
                        {themeConfig.modelThreshold !== null ? ` / ${(themeConfig.modelThreshold * 100).toFixed(1)}%` : ''}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 11, color: '#FBBF24', margin: 0, lineHeight: 1.4 }}>
                  {themeConfig.modelPredictionReason || themeConfig.modelReason || 'The model gave no signal for this scan.'}
                </p>
              )}
              <p style={{ fontSize: 10.5, color: '#8E9E97', margin: 0, lineHeight: 1.4, borderTop: '1px solid #1B2923', paddingTop: 8 }}>
                Evaluates stylistic and structural rumor features; external primary evidence can override this signal.
              </p>
            </div>

            {/* 2. Web Search & Retrieval Status Card */}
            <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} style={{ color: '#00D2C2' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00D2C2', fontWeight: 800 }}>WEB RETRIEVAL</span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: themeConfig.webSearchPerformed ? '#00E599' : '#F87171' }}>
                  {themeConfig.webSearchPerformed ? '● ACTIVE' : '○ OFFLINE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Queries Executed:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#FFFFFF' }}>
                  {themeConfig.webQueries.length} Queries
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Inspected Sources:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#00D2C2' }}>
                  {themeConfig.relevantResults} Articles
                </span>
              </div>
              {themeConfig.webQueries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 9.5, color: '#8E9E97', textTransform: 'uppercase', fontFamily: 'monospace' }}>Searched Queries:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {themeConfig.webQueries.slice(0, 3).map((q, idx) => (
                      <span key={idx} style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#00D2C2', background: '#080C0B', padding: '2px 6px', borderRadius: 4, border: '1px solid #1B2923', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🔍 {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 10.5, color: '#8E9E97', margin: 0, lineHeight: 1.4, borderTop: '1px solid #1B2923', paddingTop: 8 }}>
                Trafilatura parsed HTML with strict SSRF defenses to prevent internal IP exposure.
              </p>
            </div>

            {/* 3. Mamdani Fuzzy Inference Engine Card */}
            <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={16} style={{ color: '#FBBF24' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#FBBF24', fontWeight: 800 }}>FUZZY LOGIC FIS</span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>Centroid Defuzz</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Support Score:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#00E599' }}>
                  {themeConfig.fuzzySupport}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Contradiction Score:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#F87171' }}>
                  {themeConfig.fuzzyContra}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E2E8E5' }}>Decision Margin:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#FFFFFF' }}>
                  {themeConfig.fuzzyMargin}%
                </span>
              </div>
            </div>

          </div>

          {/* Bilingual Factual Analysis Box */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>
                AUDITABLE SYNTHESIS & RATIONALE
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2', background: 'rgba(0, 210, 194, 0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(0, 210, 194, 0.25)' }}>
                BILINGUAL EXPLANATION
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#E2E8E5', margin: 0, lineHeight: 1.6 }}>{themeConfig.explanationEn}</p>
            <div style={{ padding: 14, background: '#080C0B', borderRadius: 14, border: '1px solid #1B2923', fontSize: 13.5, color: themeConfig.color, lineHeight: 1.6, fontWeight: 600 }}>
              📌 {themeConfig.explanationBn}
            </div>
          </div>

          {/* Supporting Evidence Section */}
          {supportingEvidence.length > 0 && (
            <div style={{ background: '#0F1714', border: '1px solid rgba(0, 229, 153, 0.3)', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} style={{ color: '#00E599' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', fontWeight: 800, textTransform: 'uppercase' }}>
                    SUPPORTING EVIDENCE SOURCES ({supportingEvidence.length})
                  </span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>
                  Authoritative Corroboration
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {supportingEvidence.map((item) => (
                  <div key={item.id} style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{item.title}</span>
                      <p style={{ fontSize: 12, color: '#A0AEC0', margin: 0, lineHeight: 1.5 }}>{item.snippet}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2' }}>
                          Publisher: <strong>{item.publisher || item.source_name}</strong> {item.published_date ? `(${item.published_date})` : ''}
                        </span>
                        {item.source_reliability && (
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            Reliability: {item.source_reliability}%
                          </span>
                        )}
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#00E599', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace' }}>
                          Source Article <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', border: '1px solid rgba(0, 229, 153, 0.3)' }}>
                      SUPPORTING
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradicting Evidence Section */}
          {contradictingEvidence.length > 0 && (
            <div style={{ background: '#0F1714', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} style={{ color: '#F87171' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#F87171', fontWeight: 800, textTransform: 'uppercase' }}>
                    CONTRADICTING & REFUTATION EVIDENCE ({contradictingEvidence.length})
                  </span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>
                  Authoritative Debunking
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contradictingEvidence.map((item) => (
                  <div key={item.id} style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{item.title}</span>
                      <p style={{ fontSize: 12, color: '#A0AEC0', margin: 0, lineHeight: 1.5 }}>{item.snippet}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00D2C2' }}>
                          Publisher: <strong>{item.publisher || item.source_name}</strong> {item.published_date ? `(${item.published_date})` : ''}
                        </span>
                        {item.source_reliability && (
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#F87171', background: 'rgba(248, 113, 113, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            Reliability: {item.source_reliability}%
                          </span>
                        )}
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#F87171', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace' }}>
                          Refutation Source <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#F87171', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                      CONTRADICTING
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Neutral Context Evidence Section */}
          {otherEvidence.length > 0 && (
            <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} style={{ color: '#8E9E97' }} />
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', fontWeight: 800, textTransform: 'uppercase' }}>
                    CONTEXTUAL WEB FINDINGS ({otherEvidence.length})
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {otherEvidence.map((item) => (
                  <div key={item.id} style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{item.title}</span>
                      <p style={{ fontSize: 12, color: '#A0AEC0', margin: 0, lineHeight: 1.5 }}>{item.snippet}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E9E97' }}>
                          Source: {item.publisher || item.source_name}
                        </span>
                        <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#00D2C2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace' }}>
                          View Link <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      NEUTRAL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Epistemic Limitation Notice */}
          <div style={{ background: '#080C0B', border: '1px solid #1B2923', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <HelpCircle size={16} style={{ color: '#FBBF24', flexShrink: 0 }} />
            <p style={{ fontSize: 11.5, color: '#8E9E97', margin: 0, lineHeight: 1.5 }}>
              <strong>Epistemic Notice:</strong> FactLens evaluates claims by analyzing available public gazettes, institutional releases, and reputable news outlets. It indicates evidentiary confidence, not absolute metaphysical truth.
            </p>
          </div>

          {/* Navigation Actions */}
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8E9E97', fontFamily: 'monospace' }}>
              <FileText size={16} style={{ color: '#00E599' }} />
              <span>Reference Index: <strong style={{ color: '#FFFFFF' }}>{themeConfig.gazetteId}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDownloadPdf(liveResult?.scan_id || themeConfig.scanId)}
                disabled={isDownloadingPdf}
                style={{
                  padding: '10px 18px',
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #00E599, #00D2C2)',
                  color: '#000000',
                  border: 'none',
                  cursor: isDownloadingPdf ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 0 16px rgba(0, 229, 153, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Download size={15} />
                {isDownloadingPdf ? 'Generating PDF Dossier...' : 'Download PDF Report'}
              </button>
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(liveResult || themeConfig, null, 2))}`}
                download={`FactLens_Scan_${themeConfig.scanId}.json`}
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
                <FileText size={14} /> Export JSON
              </a>
              <Link
                to="/app/rumor"
                style={{
                  padding: '10px 18px',
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 800,
                  background: '#0F1714',
                  color: '#FFFFFF',
                  border: '1px solid #1B2923',
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
