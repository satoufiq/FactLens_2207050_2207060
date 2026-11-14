import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Activity,
  Bookmark,
  BookmarkCheck,
  Download,
  Terminal,
  Link2,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  ApiError,
  createScamScan,
  getScamScan,
  pollScamScan,
  submitScanOnce,
  type ScamScanResponse,
  type ScanStatus,
} from '@/services/api';
import { SystemStorage, type ScanRecord } from '@/services/storage';

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"')]+)/gi;

const RISK_LABEL_BN: Record<string, string> = {
  'High Risk': 'উচ্চ ঝুঁকি',
  'Medium Risk': 'মাঝারি ঝুঁকি',
  'Low Risk': 'নিম্ন ঝুঁকি',
  'Promotional message': 'প্রচারমূলক বার্তা',
};

const SEVERITY_LABEL: Record<string, [string, string]> = {
  CRITICAL: ['গুরুতর', 'Critical'],
  HIGH: ['উচ্চ', 'High'],
  MEDIUM: ['মাঝারি', 'Medium'],
  LOW: ['নিম্ন', 'Low'],
};

const LINK_RE = /(?:https?:\/\/|www\.)[^\s<>"')]+/gi;

/** The history row for a finished scan. */
function toScanRecord(result: ScamScanResponse, text: string): ScanRecord {
  return {
    id: result.scan_id,
    type: 'SCAM',
    title: text.length > 50 ? `${text.slice(0, 47)}...` : text,
    inputText: text,
    inputUrl: text.match(LINK_RE)?.[0],
    result: (result.risk_level ?? 'UNABLE_TO_ANALYZE') as ScanRecord['result'],
    confidence: result.confidence ?? 0,
    confidenceDisplay: result.confidence_display ?? '--',
    createdAt: result.created_at || new Date().toISOString(),
    summary: result.summary ?? result.explanation?.summary ?? '',
    summaryBn: result.summary_bn ?? result.explanation?.headline_bn ?? '',
    evidenceCount: result.indicator_details?.length ?? 0,
    lifecycleStatus: result.status,
    isDegraded: result.is_degraded,
    details: {
      degradedReason: result.degraded_reason,
      indicators: result.indicator_details,
      modelIndicators: result.indicators,
      messageClass: result.class,
      probabilities: result.probabilities,
      modelVersion: result.model_version,
      riskLabel: result.risk_label,
      urlAnalyses: result.url_analyses,
      modelRuns: result.model_runs,
      riskScore: result.risk_score,
    },
  };
}

/**
 * Scam Alert result page. It also runs the scan: opened with a message in the
 * navigation state (from the Scam Alert form or the OCR review), it submits
 * it, shows the scan's real progress, and then shows the report in place.
 */
export const ScamResult: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const navState = location.state as
    | { content?: string; type?: 'text' | 'OCR'; scanId?: string; scamResult?: ScamScanResponse | null }
    | undefined;

  // A message to check: present when arriving from the form, not when
  // opening a recorded scan by its id.
  const submitText = !id && !navState?.scamResult ? (navState?.content ?? '').trim() : '';
  const isOCR = navState?.type === 'OCR';

  const [liveResult, setLiveResult] = useState<ScamScanResponse | null>(navState?.scamResult ?? null);
  const [loading, setLoading] = useState<boolean>(!navState?.scamResult && !!id && id.startsWith('FL-'));
  const [accepted, setAccepted] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // While printing, the page renders its light variant so the PDF is readable on paper.
  const [printing, setPrinting] = useState(false);
  const isLight = theme === 'light' || printing;
  const scanning = !!submitText && !liveResult && !submitError;

  // Nothing to show and nothing to check (page opened directly): back to the form.
  useEffect(() => {
    if (!id && !navState?.scamResult && !submitText) navigate('/app/scam', { replace: true });
  }, [id, navState?.scamResult, submitText, navigate]);

  // Run the scan. The API accepts it at once and the worker runs ScamNet-BN;
  // submitScanOnce keeps React's double-mount from sending it twice.
  useEffect(() => {
    if (!submitText) return;
    let cancelled = false;
    setAccepted(false);
    setScanStatus(null);
    setSubmitError(null);
    (async () => {
      try {
        const acc = await submitScanOnce(`scam:${location.key}`, () =>
          createScamScan({ message: submitText, source_format: isOCR ? 'IMAGE' : 'TEXT', ocr_confirmed: isOCR }),
        );
        if (cancelled) return;
        setAccepted(true);
        setScanStatus(acc.status);
        const result = await pollScamScan(acc.scan_id, {
          onUpdate: (status) => {
            if (!cancelled) setScanStatus(status);
          },
        });
        if (cancelled) return;
        SystemStorage.saveScan(toScanRecord(result, submitText));
        setLiveResult(result);
        // Give the report its own address, so a refresh or a shared link reopens it
        navigate(`/app/result/scam/${result.scan_id}`, {
          replace: true,
          state: { content: submitText, scamResult: result },
        });
      } catch (e) {
        if (cancelled) return;
        setSubmitError(
          e instanceof ApiError
            ? e.detail
            : isBn
              ? 'স্ক্যাম অ্যালার্ট সার্ভিসের সঙ্গে সংযোগ করা যায়নি। ব্যাকএন্ড চালু আছে কি না দেখুন।'
              : 'FactLens could not reach the Scam Alert service. Check that the backend is running.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitText, isOCR, location.key]);

  // Seconds since the scan started, shown while waiting
  useEffect(() => {
    if (!scanning) return;
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [scanning, location.key]);

  // Opened by URL (from History or a shared link): fetch the recorded scan.
  useEffect(() => {
    if (liveResult || !id || !id.startsWith('FL-')) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getScamScan(id)
      .then((res) => {
        if (!cancelled) setLiveResult(res);
      })
      .catch(() => {
        /* shown below as "no ScamNet-BN result" */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, liveResult]);

  useEffect(() => {
    if (liveResult?.scan_id) setIsSaved(SystemStorage.isEvidenceSaved(`ev-${liveResult.scan_id}`));
  }, [liveResult?.scan_id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Print once the light variant has rendered; restore afterwards.
  useEffect(() => {
    if (!printing) return;
    const previousTitle = document.title;
    if (liveResult) document.title = `FactLens-Scam-Report-${liveResult.scan_id}`;
    const done = () => {
      document.title = previousTitle;
      setPrinting(false);
    };
    window.addEventListener('afterprint', done, { once: true });
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', done);
    };
  }, [printing, liveResult]);

  const rawInput =
    liveResult?.message_text || navState?.content || (id ? SystemStorage.getScanById(id)?.inputText : '') || '';

  const rescan = () =>
    rawInput
      ? navigate('/app/result/scam', { state: { content: rawInput, type: isOCR ? 'OCR' : 'text' } })
      : navigate('/app/scam');

  // Only ScamNet-BN's verdict is ever shown; there is no in-browser fallback.
  const noVerdict =
    !!liveResult &&
    (!liveResult.risk_level ||
      liveResult.risk_level === 'UNABLE_TO_ANALYZE' ||
      ['FAILED', 'TIMEOUT', 'AWAITING_INPUT'].includes(liveResult.status));

  const card = isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#0F1714] border-[#1B2923]';
  const muted = isLight ? 'text-gray-600' : 'text-emerald-200/70';
  const accentText = isLight ? 'text-[#007A50]' : 'text-[#00E599]';

  /** The message with its links highlighted. */
  const messageCard = (text: string) => (
    <div className={`rounded-3xl border p-6 md:p-7 shadow-xl ${card}`} style={{ breakInside: 'avoid' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <Terminal className={`w-4 h-4 ${accentText}`} />
        <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${accentText}`}>{isBn ? 'বার্তা' : 'Message'}</h3>
      </div>
      <p
        className={`whitespace-pre-wrap break-words text-base leading-relaxed rounded-2xl border p-5 ${
          isLight ? 'bg-[#F4F9F6] border-[#C2DCD0] text-gray-900' : 'bg-[#080C0B] border-[#1B2923] text-emerald-100'
        }`}
        style={{ fontFamily: '"Noto Sans Bengali", Inter, sans-serif' }}
      >
        {text.split(URL_RE).map((part, i) =>
          /^(?:https?:\/\/|www\.)/i.test(part) ? (
            <span key={i} className={`font-bold underline px-1 rounded ${isLight ? 'bg-red-100 text-red-800' : 'bg-red-500/20 text-red-300'}`}>
              {part}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          ),
        )}
      </p>
    </div>
  );

  // ── While the scan runs ────────────────────────────────────────────────
  if (scanning) {
    const analysing = accepted && scanStatus !== 'COMPLETED' && scanStatus !== 'PARTIAL';
    const steps: { label: string; state: 'done' | 'active' | 'waiting' }[] = [
      { label: isBn ? 'বার্তা পাঠানো হয়েছে' : 'Message received', state: accepted ? 'done' : 'active' },
      {
        label: isBn ? 'ScamNet-BN বার্তাটি বিশ্লেষণ করছে' : 'ScamNet-BN is analysing the message',
        state: !accepted ? 'waiting' : analysing ? 'active' : 'done',
      },
      { label: isBn ? 'ফলাফল প্রস্তুত করা হচ্ছে' : 'Preparing the result', state: accepted && !analysing ? 'active' : 'waiting' },
    ];
    return (
      <div className={`pb-24 max-w-3xl mx-auto px-4 md:px-8 pt-4 md:pt-8 space-y-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/scam')}
            className={`p-3 rounded-2xl border transition-all shadow-xl shrink-0 ${
              isLight ? 'bg-white border-[#C2DCD0] hover:bg-emerald-50 text-[#007A50]' : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-emerald-300'
            }`}
            title={isBn ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-1.5">
            <span
              className={`self-start px-3.5 py-1 rounded-full text-[11px] font-black uppercase font-mono flex items-center gap-2 border ${
                isLight ? 'bg-red-100 text-red-900 border-red-300' : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-red-500" />
              {isBn ? 'স্ক্যাম অ্যালার্ট' : 'SCAM ALERT'}
            </span>
            <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
              {isBn ? 'বার্তাটি যাচাই করা হচ্ছে…' : 'Checking the message…'}
            </h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`rounded-3xl border p-7 shadow-2xl ${card}`}
        >
          <ul className="space-y-4">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm font-bold">
                {s.state === 'done' ? (
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${accentText}`} />
                ) : s.state === 'active' ? (
                  <RefreshCw className={`w-5 h-5 shrink-0 animate-spin ${accentText}`} />
                ) : (
                  <span className={`w-5 h-5 shrink-0 rounded-full border-2 ${isLight ? 'border-gray-300' : 'border-[#1B2923]'}`} />
                )}
                <span className={s.state === 'waiting' ? muted : ''}>{s.label}</span>
              </li>
            ))}
          </ul>
          <div className={`mt-6 h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
            <motion.div
              className={`h-full w-1/3 rounded-full ${isLight ? 'bg-[#00A870]' : 'bg-[#00E599]'}`}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className={`mt-4 text-xs ${muted}`}>
            {elapsed} {isBn ? 'সেকেন্ড' : 's'} ·{' '}
            {isBn
              ? 'সাধারণত কয়েক সেকেন্ড লাগে; সার্ভিস চালুর পর প্রথম স্ক্যানে মডেল লোড হতে বেশি সময় লাগতে পারে।'
              : 'Usually a few seconds; the first scan after start-up takes longer while the model loads.'}
          </p>
        </motion.div>

        {messageCard(submitText)}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`max-w-3xl mx-auto px-4 pt-24 text-center ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        <RefreshCw className="w-8 h-8 mx-auto animate-spin opacity-70" />
        <p className="mt-4 text-sm font-semibold">
          {isBn ? 'ScamNet-BN ফলাফল লোড হচ্ছে…' : 'Loading the ScamNet-BN result…'}
        </p>
      </div>
    );
  }

  if (!liveResult || noVerdict) {
    const headline = submitError
      ? isBn
        ? 'বার্তাটি যাচাই করা যায়নি'
        : 'The message could not be checked'
      : liveResult
        ? (isBn ? liveResult.explanation?.headline_bn : liveResult.explanation?.headline) ??
          (isBn ? 'বিশ্লেষণ করা যায়নি' : 'Unable to analyze')
        : isBn
          ? 'এই স্ক্যানের কোনো ScamNet-BN ফলাফল নেই'
          : 'There is no ScamNet-BN result for this scan';
    const message = submitError
      ? submitError
      : liveResult
        ? (isBn ? liveResult.summary_bn : liveResult.summary) ?? liveResult.summary
        : isBn
          ? 'ফলাফলটি পাওয়া যায়নি। বার্তাটি আবার স্ক্যান করুন।'
          : 'The result could not be found. Scan the message again.';
    return (
      <div className={`max-w-3xl mx-auto px-4 md:px-8 pt-10 pb-24 space-y-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
        <div className={`rounded-3xl border p-8 space-y-4 ${isLight ? 'border-amber-300 bg-amber-50' : 'border-amber-500/40 bg-amber-500/10'}`}>
          <div className="flex items-start gap-4">
            <AlertTriangle className={`w-8 h-8 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
            <div className="space-y-3">
              <h1 className="text-xl md:text-2xl font-black">{headline}</h1>
              <p className="text-sm leading-relaxed opacity-90">{message}</p>
              {liveResult && (
                <p className="text-[11px] font-mono opacity-60">
                  {liveResult.scan_id} · {liveResult.status}
                </p>
              )}
            </div>
          </div>
        </div>
        {rawInput && (
          <div className={`rounded-2xl border p-5 text-sm leading-relaxed ${card}`}>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-2">{isBn ? 'বার্তা' : 'Message'}</p>
            {rawInput}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={rescan}
            className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 ${
              isLight ? 'bg-[#00A870] text-white hover:bg-[#008F5F]' : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            {isBn ? 'আবার স্ক্যান করুন' : 'Scan again'}
          </button>
          <button
            onClick={() => navigate('/app/scam')}
            className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border ${
              isLight ? 'border-gray-300 hover:bg-gray-100' : 'border-[#1B2923] hover:bg-[#0F1714]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {isBn ? 'স্ক্যাম অ্যালার্টে ফিরুন' : 'Back to Scam Alert'}
          </button>
        </div>
      </div>
    );
  }

  // ── From here on there is a ScamNet-BN verdict ──────────────────────────
  const r = liveResult;
  const isHighRisk = r.risk_level === 'HIGH_RISK';
  const isMedRisk = r.risk_level === 'MEDIUM_RISK';
  const labelEn = r.risk_label ?? r.risk ?? '';
  const label = isBn ? RISK_LABEL_BN[labelEn] ?? labelEn : labelEn;
  const probs = (r.probabilities ?? {}) as Partial<Record<'smish' | 'promo' | 'normal', number>>;
  const summary = isBn ? r.summary_bn || r.summary : r.summary;
  const recommendation = isBn
    ? r.explanation?.recommendation_bn || r.explanation?.recommendation
    : r.explanation?.recommendation;
  const indicators = r.indicator_details ?? [];
  const links = r.url_analyses ?? [];
  const run = r.model_runs?.find((m) => m.model_name === 'scamnet-bn');
  const createdAt = new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : `${r.created_at}Z`);

  const tone = isHighRisk
    ? {
        text: isLight ? 'text-red-700' : 'text-red-400',
        box: 'bg-red-600 shadow-red-600/30',
        border: isLight ? 'border-red-300' : 'border-red-500/40',
        grad: isLight ? 'from-red-50 via-white to-white' : 'from-red-950/40 via-[#0F1714] to-[#0F1714]',
        soft: isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-500/10 border-red-500/30 text-red-100',
      }
    : isMedRisk
      ? {
          text: isLight ? 'text-amber-800' : 'text-amber-400',
          box: 'bg-amber-600 shadow-amber-600/30',
          border: isLight ? 'border-amber-300' : 'border-amber-500/40',
          grad: isLight ? 'from-amber-50 via-white to-white' : 'from-amber-950/40 via-[#0F1714] to-[#0F1714]',
          soft: isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-100',
        }
      : {
          text: accentText,
          box: 'bg-emerald-600 shadow-emerald-600/30',
          border: isLight ? 'border-emerald-300' : 'border-[#00E599]/40',
          grad: isLight ? 'from-emerald-50 via-white to-white' : 'from-[#14261F] via-[#0F1714] to-[#0F1714]',
          soft: isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100',
        };

  const toggleSave = () => {
    const key = `ev-${r.scan_id}`;
    if (isSaved) {
      SystemStorage.removeSavedEvidence(key);
      setIsSaved(false);
      setToast(isBn ? 'সংরক্ষণ থেকে সরানো হয়েছে' : 'Removed from saved');
      return;
    }
    SystemStorage.saveEvidence({
      id: key,
      scanId: r.scan_id,
      title: rawInput.length > 90 ? `${rawInput.slice(0, 87)}…` : rawInput,
      sourceName: `Scam Alert · ${labelEn}`,
      sourceType: 'Scam scan',
      url: `/app/result/scam/${r.scan_id}`,
      relevanceScore: Math.round((probs.smish ?? 0) * 100),
      relationship: 'NEUTRAL',
      snippet: r.summary ?? '',
      savedAt: new Date().toISOString(),
      collection: 'Scam Alert',
    });
    setIsSaved(true);
    setToast(isBn ? 'স্ক্যান সংরক্ষিত হয়েছে' : 'Scan saved');
  };

  const secondaryBtn = `px-5 py-3 rounded-2xl border text-xs font-extrabold transition-all flex items-center gap-2 shadow-md ${
    isLight ? 'bg-white border-[#C2DCD0] hover:bg-gray-100 text-gray-800' : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-white'
  }`;

  return (
    <div className={`fl-print-root pb-24 max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-8 space-y-8 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      {/* Report header (printed only) */}
      <div className="fl-print-only border-b border-gray-300 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-black">FactLens · {isBn ? 'স্ক্যাম যাচাই প্রতিবেদন' : 'Scam Check Report'}</span>
          <span className="text-xs text-gray-600">
            {isBn ? 'তৈরি' : 'Generated'} {new Date().toLocaleString('en-GB')}
          </span>
        </div>
      </div>

      {/* ── HEADER & ACTIONS ── */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b pb-6 ${isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/scam')}
            className={`fl-no-print p-3 rounded-2xl border transition-all shadow-xl shrink-0 ${
              isLight ? 'bg-white border-[#C2DCD0] hover:bg-emerald-50 text-[#007A50]' : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-emerald-300'
            }`}
            title={isBn ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase font-mono flex items-center gap-2 border ${
                  isLight ? 'bg-red-100 text-red-900 border-red-300' : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-red-500" />
                {isBn ? 'স্ক্যাম অ্যালার্ট' : 'SCAM ALERT'}
              </span>
              <span
                className={`text-[11px] font-mono font-extrabold px-3 py-1 rounded-xl border ${
                  isLight ? 'text-[#007A50] bg-white border-[#C2DCD0]' : 'text-emerald-400 bg-[#080C0B] border-[#1B2923]'
                }`}
              >
                {r.scan_id}
              </span>
              <span className={`text-[11px] font-mono ${muted}`}>{createdAt.toLocaleString('en-GB')}</span>
            </div>
            <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
              {isBn ? 'স্ক্যাম যাচাইয়ের ফলাফল' : 'Scam Check Result'}
            </h1>
          </div>
        </div>

        <div className="fl-no-print flex flex-wrap items-center gap-3 shrink-0">
          <button onClick={toggleSave} className={secondaryBtn}>
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-amber-500" /> : <Bookmark className={`w-4 h-4 ${accentText}`} />}
            {isSaved ? (isBn ? 'সংরক্ষিত' : 'Saved') : isBn ? 'সংরক্ষণ' : 'Save'}
          </button>
          <button onClick={() => setPrinting(true)} className={secondaryBtn}>
            <Download className="w-4 h-4 text-blue-500" />
            {isBn ? 'পিডিএফ রিপোর্ট' : 'PDF Report'}
          </button>
          <button
            onClick={() => navigate('/app/scam')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xl ${
              isLight ? 'bg-[#00A870] hover:bg-[#008F5F] text-white shadow-md' : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0] shadow-[#00E599]/25'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            {isBn ? 'নতুন স্ক্যান' : 'New Scan'}
          </button>
        </div>
      </div>

      {/* ── VERDICT ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-3xl border shadow-2xl overflow-hidden bg-gradient-to-br ${tone.border} ${tone.grad}`}
        style={{ breakInside: 'avoid' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-7 p-7 md:p-9 space-y-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0 ${tone.box}`}>
                {isHighRisk ? <ShieldAlert className="w-7 h-7" /> : isMedRisk ? <AlertTriangle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
              </div>
              <div>
                <span className={`text-[11px] font-mono font-black uppercase tracking-widest ${tone.text}`}>
                  {isBn ? 'ঝুঁকির মাত্রা' : 'RISK LEVEL'}
                </span>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isLight ? 'text-[#06231A]' : 'text-white'}`}>{label}</h2>
              </div>
            </div>

            {summary && (
              <p className={`text-sm md:text-base leading-relaxed font-medium ${isLight ? 'text-gray-800' : 'text-emerald-100/90'}`}>{summary}</p>
            )}

            {recommendation && (
              <div className={`rounded-2xl border p-4 ${tone.soft}`}>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">{isBn ? 'কী করবেন' : 'What to do'}</p>
                <p className="mt-1.5 text-sm leading-relaxed font-semibold">{recommendation}</p>
              </div>
            )}
          </div>

          <div
            className={`md:col-span-5 p-7 md:p-9 space-y-4 border-t md:border-t-0 md:border-l ${
              isLight ? 'border-[#C2DCD0] bg-[#F4F9F6]' : 'border-[#1B2923] bg-[#080C0B]/60'
            }`}
          >
            <p className={`text-[11px] font-mono font-black uppercase tracking-widest ${accentText}`}>
              {isBn ? 'ScamNet-BN মূল্যায়ন' : 'ScamNet-BN assessment'}
            </p>
            {(
              [
                ['smish', isBn ? 'স্ক্যাম (স্মিশিং)' : 'Scam (smishing)', 'bg-red-500', 'text-red-500'],
                ['promo', isBn ? 'প্রচারমূলক' : 'Promotional', 'bg-amber-400', 'text-amber-500'],
                ['normal', isBn ? 'সাধারণ' : 'Normal', 'bg-emerald-500', 'text-emerald-500'],
              ] as const
            ).map(([key, name, bar, text]) => {
              const pct = (probs[key] ?? 0) * 100;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className={r.class === key ? (isLight ? 'text-gray-900' : 'text-white') : muted}>{name}</span>
                    <span className={text}>{pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
                    <div className={`${bar} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className={`pt-1 text-[10px] font-mono ${muted}`}>
              {r.model_version}
              {run?.latency_ms != null ? ` · ${Math.round(run.latency_ms)} ms` : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── MESSAGE ── */}
      {messageCard(rawInput)}

      {/* ── SIGNALS & LINKS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-3xl border p-6 md:p-7 shadow-xl ${card}`} style={{ breakInside: 'avoid' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                {isBn ? 'যে লক্ষণ পাওয়া গেছে' : 'Signals found'}
              </h3>
            </div>
            <span className={`text-xs font-mono ${muted}`}>{indicators.length}</span>
          </div>
          {indicators.length === 0 ? (
            <p className={`text-sm ${muted}`}>{isBn ? 'কোনো নির্দিষ্ট লক্ষণ পাওয়া যায়নি।' : 'No specific signals were found.'}</p>
          ) : (
            <ul className="space-y-2.5">
              {indicators.map((ind) => {
                const high = ind.severity === 'HIGH' || ind.severity === 'CRITICAL';
                return (
                  <li
                    key={ind.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-sm font-semibold ${
                      isLight ? 'bg-[#F4F9F6] border-[#C2DCD0]' : 'bg-[#080C0B] border-[#1B2923]'
                    }`}
                  >
                    <span>{isBn ? ind.description_bn ?? ind.description : ind.description}</span>
                    <span
                      className={`shrink-0 text-[10px] font-mono font-black px-2 py-0.5 rounded uppercase ${
                        high
                          ? isLight
                            ? 'bg-red-100 text-red-800'
                            : 'bg-red-500/20 text-red-400'
                          : isLight
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {(SEVERITY_LABEL[ind.severity] ?? [ind.severity, ind.severity])[isBn ? 0 : 1]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`rounded-3xl border p-6 md:p-7 shadow-xl ${card}`} style={{ breakInside: 'avoid' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Link2 className="w-4 h-4 text-blue-500" />
              <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLight ? 'text-blue-900' : 'text-blue-400'}`}>
                {isBn ? 'লিংক' : 'Links'}
              </h3>
            </div>
            <span className={`text-xs font-mono ${muted}`}>{links.length}</span>
          </div>
          {links.length === 0 ? (
            <p className={`text-sm ${muted}`}>{isBn ? 'এই বার্তায় কোনো লিংক নেই।' : 'This message contains no link.'}</p>
          ) : (
            <ul className="space-y-4">
              {links.map((u) => (
                <li key={u.id ?? u.url} className="space-y-2">
                  <div
                    className={`p-3 rounded-xl border font-mono text-xs break-all font-bold ${
                      isLight ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-[#080C0B] border-blue-500/30 text-blue-300'
                    }`}
                  >
                    {u.url}
                  </div>
                  {(u.flags ?? []).length === 0 ? (
                    <p className={`text-xs ${muted}`}>{isBn ? 'কাঠামোগত কোনো সতর্কতা নেই।' : 'No structural warnings.'}</p>
                  ) : (
                    <ul className={`list-disc pl-5 space-y-1 text-xs ${isLight ? 'text-gray-700' : 'text-emerald-100/80'}`}>
                      {(u.flags ?? []).map((f) => (
                        <li key={f.code}>{isBn ? f.message_bn ?? f.message : f.message}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={`mt-4 flex items-start gap-1.5 text-[11px] ${muted}`}>
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
            {isBn ? 'লিংক পরীক্ষা শুধু তথ্যের জন্য; ঝুঁকির মাত্রা মডেল নির্ধারণ করে।' : 'Link checks are for information; the risk level comes from the model.'}
          </p>
        </div>
      </div>

      {(r.limitations?.length ?? 0) > 0 && (
        <ul className={`space-y-1 text-xs ${muted}`}>
          {(r.limitations ?? []).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}

      {toast && (
        <div
          className={`fl-no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border text-sm font-bold shadow-2xl ${
            isLight ? 'bg-white border-[#C2DCD0] text-gray-900' : 'bg-[#0F1714] border-[#00E599]/40 text-white'
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default ScamResult;
