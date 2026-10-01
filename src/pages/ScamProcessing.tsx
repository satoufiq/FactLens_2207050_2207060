import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Maximize2,
  X,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Link2,
  FileText,
  AlertCircle,
  Search,
  Cpu,
  Layers,
  Check,
  ShieldCheck,
  Terminal,
  Activity
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { scamProcessingMockData, scamScreenshotProcessingMock } from '../data/scamProcessingMockData';
import type { ScamProcessingData, ProcessingStep } from '../data/scamProcessingMockData';

export const ScamProcessing: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const location = useLocation();

  // Refs for auto-scrolling
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const verdictRef = useRef<HTMLDivElement | null>(null);

  // Determine payload from route state or fallback to default text mock
  const inputState = location.state as { content?: string; type?: 'text' | 'OCR'; imagePreview?: string } | undefined;
  const isOCR = inputState?.type === 'OCR';

  const baseData: ScamProcessingData = isOCR ? scamScreenshotProcessingMock : scamProcessingMockData;
  const userContent = inputState?.content || baseData.content;
  const userUrl = baseData.detectedUrl;

  // Helper to initialize steps: step 0 is processing, rest are pending
  const getInitialSteps = (dataSteps: ProcessingStep[]): ProcessingStep[] => {
    return dataSteps.map((step, idx) => {
      if (idx === 0) return { ...step, status: 'processing' };
      return { ...step, status: 'pending' };
    });
  };

  // State management
  const [steps, setSteps] = useState<ProcessingStep[]>(() => getInitialSteps(baseData.steps));
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [visibleIndicators, setVisibleIndicators] = useState<number>(1);
  const [isFullMessageOpen, setIsFullMessageOpen] = useState(false);
  const [simulationState, setSimulationState] = useState<'normal' | 'partial' | 'failed'>('normal');

  // Step progression duration in ms (1.6s per step)
  const STEP_DURATION = 1600;

  // Scanner animation progress bar state (0 - 100)
  const [scanProgress, setScanProgress] = useState(0);

  // Helper to perform layout-aware smooth scroll synchronized with step height expansion
  const scrollToElement = (element: HTMLElement | null) => {
    if (!element) return;
    // Wait for Framer Motion animation / DOM expansion to start
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const absoluteTop = window.pageYOffset + rect.top;
      // Center element in viewport with header clearance offset (~80px)
      const targetY = Math.max(0, absoluteTop - (window.innerHeight / 2) + (rect.height / 2));
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }, 120);
  };

  // Re-initialize when scan data changes
  useEffect(() => {
    setSteps(getInitialSteps(baseData.steps));
    setActiveStepIndex(0);
    setVisibleIndicators(1);
    setScanProgress(0);
  }, [baseData.scanId]);

  // Synchronized scan progress bar animation per step (0% -> 100% over STEP_DURATION)
  useEffect(() => {
    if (simulationState === 'failed') return;
    setScanProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / STEP_DURATION) * 100));
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [activeStepIndex, simulationState]);

  // Timeline step progression sequence
  useEffect(() => {
    if (simulationState === 'failed') return;

    const timer = setInterval(() => {
      setActiveStepIndex((prevIndex) => {
        if (prevIndex >= steps.length - 1) {
          clearInterval(timer);
          return prevIndex;
        }
        const nextIndex = prevIndex + 1;

        // Update step statuses
        setSteps((prevSteps) =>
          prevSteps.map((step, idx) => {
            if (idx < nextIndex) return { ...step, status: 'completed' };
            if (idx === nextIndex) return { ...step, status: 'processing' };
            return { ...step, status: 'pending' };
          })
        );

        // Reveal risk indicators as steps progress
        setVisibleIndicators((v) => Math.min(v + 1, baseData.riskIndicators.length));

        return nextIndex;
      });
    }, STEP_DURATION);

    return () => clearInterval(timer);
  }, [steps.length, simulationState, baseData.riskIndicators.length]);

  // Synchronized auto-scroll down smoothly as processing progresses
  useEffect(() => {
    if (simulationState === 'failed') return;

    if (activeStepIndex > 0 && activeStepIndex < steps.length - 1) {
      scrollToElement(activeStepRef.current);
    } else if (activeStepIndex === steps.length - 1) {
      scrollToElement(verdictRef.current);
    }
  }, [activeStepIndex, simulationState, steps.length]);

  const handleToggleState = (state: 'normal' | 'partial' | 'failed') => {
    setSimulationState(state);
    if (state === 'failed') {
      setSteps((prev) =>
        prev.map((s, idx) => (idx === 3 ? { ...s, status: 'failed' } : idx > 3 ? { ...s, status: 'pending' } : s))
      );
    } else if (state === 'partial') {
      setSteps((prev) =>
        prev.map((s, idx) => (idx === 4 ? { ...s, status: 'partial' } : s))
      );
    } else {
      setSteps(getInitialSteps(baseData.steps));
      setActiveStepIndex(0);
      setVisibleIndicators(1);
      setScanProgress(0);
    }
  };

  // Map progress to stepper (4 overall stages)
  const currentStageNumber = Math.min(4, Math.floor((activeStepIndex / (steps.length - 1)) * 3) + 1);

  return (
    <div className={`space-y-10 md:space-y-14 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      {/* ── 1. PAGE HEADER & CYBER RADAR BANNER CARD ── */}
      <div className={`relative rounded-3xl p-7 md:p-10 border overflow-hidden shadow-2xl ${
        isLight
          ? 'border-[#00A870]/30 bg-gradient-to-r from-[#EAF5F0] via-[#F4FAFA] to-[#EAF5F0]'
          : 'border-emerald-500/30 bg-gradient-to-r from-[#0F1714] via-[#141F1B] to-[#0F1714]'
      }`}>
        {/* Animated Cyber Sweep Line */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${
            isLight ? 'via-[#00A870] to-transparent' : 'via-[#00E599] to-transparent'
          } z-10`}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase font-mono shadow-md border ${
                isLight
                  ? 'bg-[#00A870]/15 text-[#007A50] border-[#00A870]/30'
                  : 'bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30'
              }`}>
                <Activity className={`w-4 h-4 animate-pulse ${isLight ? 'text-[#007A50]' : 'text-[#00E599]'}`} />
                {isBn ? 'ফ্যাক্টলেন্স সিকিউরিটি রাডার' : 'FACTLENS THREAT RADAR ACTIVE'}
              </span>
              <span className={`text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-xl border ${
                isLight
                  ? 'text-[#007A50] bg-white border-[#C2DCD0]'
                  : 'text-emerald-400 bg-[#080C0B] border-[#1B2923]'
              }`}>
                SCAN ID: {baseData.scanId}
              </span>
            </div>
            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-snug ${
              isLight ? 'text-[#06231A]' : 'text-white'
            }`}>
              {isBn ? 'সন্দেহজনক বার্তা ও লিংক নিরাপত্তা পরীক্ষা' : 'Analyzing Suspicious Communication'}
            </h1>
            <p className={`text-xs md:text-sm font-medium leading-relaxed ${
              isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
            }`}>
              {isBn
                ? 'FactLens আপনার দেওয়া তথ্যের মধ্যে ফিশিং, ওটিপি হ্যারভেস্টিং ও প্রলোভনের লক্ষণ পরীক্ষা করছে।'
                : 'FactLens is scanning the submitted payload for smishing hooks, malicious links, and fraud patterns.'}
            </p>
          </div>

          {/* Simulation State Selector */}
          <div className={`flex flex-col gap-2.5 shrink-0 border p-4 rounded-2xl shadow-xl ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1 font-mono ${
              isLight ? 'text-[#007A50]' : 'text-emerald-400/80'
            }`}>
              {isBn ? 'পাইপলাইন সিমুলেশন মোড:' : 'Pipeline Simulation Mode:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleState('normal')}
                className={`px-4 py-2.5 rounded-xl transition-all text-xs font-bold ${
                  simulationState === 'normal'
                    ? isLight
                      ? 'bg-[#00A870] text-white shadow-lg font-black ring-2 ring-[#00A870]/40'
                      : 'bg-[#00E599] text-[#040A07] shadow-lg shadow-[#00E599]/25 font-black ring-2 ring-[#00E599]/40'
                    : isLight
                    ? 'text-gray-700 hover:bg-emerald-50'
                    : 'text-emerald-300 hover:bg-[#141F1B]'
                }`}
              >
                {isBn ? 'স্বাভাবিক' : 'Normal'}
              </button>
              <button
                onClick={() => handleToggleState('partial')}
                className={`px-4 py-2.5 rounded-xl transition-all text-xs font-bold ${
                  simulationState === 'partial'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 font-black ring-2 ring-amber-500/40'
                    : isLight
                    ? 'text-gray-700 hover:bg-amber-50'
                    : 'text-emerald-300 hover:bg-[#141F1B]'
                }`}
              >
                {isBn ? 'আংশিক' : 'Partial'}
              </button>
              <button
                onClick={() => handleToggleState('failed')}
                className={`px-4 py-2.5 rounded-xl transition-all text-xs font-bold ${
                  simulationState === 'failed'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 font-black ring-2 ring-red-500/40'
                    : isLight
                    ? 'text-gray-700 hover:bg-red-50'
                    : 'text-emerald-300 hover:bg-[#141F1B]'
                }`}
              >
                {isBn ? 'ব্যর্থতা' : 'Failed'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. HIGH-TECH 4-STAGE PROGRESS STEPPER CARD ── */}
      <div className={`p-8 md:p-10 rounded-3xl border relative overflow-hidden shadow-2xl my-8 md:my-10 ${
        isLight
          ? 'bg-white border-[#C2DCD0]'
          : 'bg-[#0F1714] border-emerald-500/20'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* Stage 1 */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${
            currentStageNumber >= 1
              ? isLight
                ? 'bg-[#E8F6F0] border border-[#00A870]/40 shadow-sm'
                : 'bg-[#14261F] border border-[#00E599]/40 shadow-md'
              : isLight
              ? 'bg-gray-100 border border-gray-200 opacity-60'
              : 'bg-[#080C0B] border border-[#1B2923] opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
              currentStageNumber > 1
                ? isLight
                  ? 'bg-[#00A870] text-white shadow-md'
                  : 'bg-[#00E599] text-[#040A07] shadow-lg shadow-[#00E599]/30'
                : currentStageNumber === 1
                ? isLight
                  ? 'bg-[#00A870]/20 text-[#007A50] border border-[#00A870]/40 animate-pulse'
                  : 'bg-[#00E599]/20 text-[#00E599] border border-[#00E599]/40 animate-pulse'
                : isLight
                ? 'bg-gray-200 text-gray-500'
                : 'bg-[#1B2923] text-gray-400'
            }`}>
              {currentStageNumber > 1 ? <Check className="w-6 h-6" /> : '01'}
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-mono font-black ${isLight ? 'text-[#007A50]' : 'text-[#00E599]'}`}>STAGE 01</div>
              <div className={`text-xs md:text-sm font-extrabold ${isLight ? 'text-[#06231A]' : 'text-white'}`}>{isBn ? 'ইনপুট গ্রহণ' : 'Input Received'}</div>
            </div>
          </div>

          {/* Stage 2 */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${
            currentStageNumber > 2
              ? isLight
                ? 'bg-[#E8F6F0] border border-[#00A870]/40 shadow-sm'
                : 'bg-[#14261F] border border-[#00E599]/40 shadow-md'
              : currentStageNumber === 2
              ? isLight
                ? 'bg-blue-50 border border-blue-400 shadow-md ring-1 ring-blue-300'
                : 'bg-[#0F1E2E] border border-blue-500/40 shadow-xl ring-1 ring-blue-500/30'
              : isLight
              ? 'bg-gray-100 border border-gray-200 opacity-60'
              : 'bg-[#080C0B] border border-[#1B2923] opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
              currentStageNumber > 2
                ? isLight
                  ? 'bg-[#00A870] text-white shadow-md'
                  : 'bg-[#00E599] text-[#040A07] shadow-lg shadow-[#00E599]/30'
                : currentStageNumber === 2
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 animate-pulse'
                : isLight
                ? 'bg-gray-200 text-gray-500'
                : 'bg-[#1B2923] text-gray-400'
            }`}>
              {currentStageNumber > 2 ? <Check className="w-6 h-6" /> : currentStageNumber === 2 ? <Search className="w-6 h-6 animate-spin-slow" /> : '02'}
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-mono font-black ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {currentStageNumber === 2 ? 'STAGE 02 (ACTIVE)' : 'STAGE 02'}
              </div>
              <div className={`text-xs md:text-sm font-extrabold ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
                {isOCR ? (isBn ? 'ওসিআর নিশ্চিত' : 'OCR Confirmed') : (isBn ? 'বার্তা পরীক্ষা' : 'Content Ingestion')}
              </div>
            </div>
          </div>

          {/* Stage 3 */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${
            currentStageNumber > 3
              ? isLight
                ? 'bg-[#E8F6F0] border border-[#00A870]/40 shadow-sm'
                : 'bg-[#14261F] border border-[#00E599]/40 shadow-md'
              : currentStageNumber === 3
              ? isLight
                ? 'bg-blue-50 border border-blue-400 shadow-md ring-1 ring-blue-300'
                : 'bg-[#0F1E2E] border border-blue-500/40 shadow-xl ring-1 ring-blue-500/30'
              : isLight
              ? 'bg-gray-100 border border-gray-200 opacity-60'
              : 'bg-[#080C0B] border border-[#1B2923] opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
              currentStageNumber > 3
                ? isLight
                  ? 'bg-[#00A870] text-white shadow-md'
                  : 'bg-[#00E599] text-[#040A07] shadow-lg shadow-[#00E599]/30'
                : currentStageNumber === 3
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 animate-pulse'
                : isLight
                ? 'bg-gray-200 text-gray-500'
                : 'bg-[#1B2923] text-gray-400'
            }`}>
              {currentStageNumber > 3 ? <Check className="w-6 h-6" /> : currentStageNumber === 3 ? <Cpu className="w-6 h-6 animate-spin-slow" /> : '03'}
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-mono font-black ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {currentStageNumber === 3 ? 'STAGE 03 (ACTIVE)' : 'STAGE 03'}
              </div>
              <div className={`text-xs md:text-sm font-extrabold ${isLight ? 'text-[#06231A]' : 'text-white'}`}>{isBn ? 'ঝুঁকি বিশ্লেষণ' : 'Threat Analysis'}</div>
            </div>
          </div>

          {/* Stage 4 */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${
            currentStageNumber === 4
              ? isLight
                ? 'bg-[#E8F6F0] border border-[#00A870]/50 shadow-md ring-1 ring-[#00A870]/30'
                : 'bg-[#14261F] border border-[#00E599]/50 shadow-xl ring-1 ring-[#00E599]/30'
              : isLight
              ? 'bg-gray-100 border border-gray-200 opacity-60'
              : 'bg-[#080C0B] border border-[#1B2923] opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
              currentStageNumber === 4
                ? isLight
                  ? 'bg-[#00A870] text-white shadow-lg animate-bounce'
                  : 'bg-[#00E599] text-[#040A07] shadow-lg shadow-[#00E599]/30 animate-bounce'
                : isLight
                ? 'bg-gray-200 text-gray-500'
                : 'bg-[#1B2923] text-gray-400'
            }`}>
              {currentStageNumber === 4 ? <ShieldCheck className="w-6 h-6" /> : '04'}
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-mono font-black ${isLight ? 'text-[#007A50]' : 'text-emerald-400/70'}`}>STAGE 04</div>
              <div className={`text-xs md:text-sm font-extrabold ${isLight ? 'text-[#06231A]' : 'text-white'}`}>{isBn ? 'চূড়ান্ত সিদ্ধান্ত' : 'Final Assessment'}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Partial State Alert Badge */}
      {simulationState === 'partial' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-3xl border flex items-start gap-5 shadow-xl my-6 ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm leading-relaxed space-y-1.5">
            <span className="font-black block text-sm md:text-base text-amber-600">
              {isBn ? '⚠ আংশিক বিশ্লেষণ (Partial Analysis State)' : '⚠ Partial Analysis Active'}
            </span>
            <p>
              {isBn
                ? 'FactLens বার্তা বিশ্লেষণ সম্পন্ন করেছে, তবে ইউআরএল বিশ্লেষণ সার্ভিস সাময়িকভাবে অনুপস্থিত ছিল। চূড়ান্ত মূল্যায়নে সীমিত তথ্য থাকতে পারে।'
                : 'FactLens completed the message analysis, but the URL analysis service was unavailable. The final assessment may contain incomplete domain telemetry.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Complete Failure Alert State */}
      {simulationState === 'failed' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-10 md:p-14 rounded-3xl border text-center space-y-6 max-w-xl mx-auto shadow-2xl my-8 ${
            isLight
              ? 'bg-red-50 border-red-300 text-red-950'
              : 'bg-red-950/30 border-red-500/40 text-white'
          }`}
        >
          <div className="w-20 h-20 rounded-3xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto ring-8 ring-red-500/10">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <h3 className={`text-2xl font-black ${isLight ? 'text-red-950' : 'text-white'}`}>
              {isBn ? 'বিশ্লেষণ সম্পন্ন করা সম্ভব হয়নি' : 'Unable to complete security analysis'}
            </h3>
            <p className={`text-xs md:text-sm leading-relaxed max-w-md mx-auto font-medium ${
              isLight ? 'text-red-800' : 'text-red-200/80'
            }`}>
              {isBn
                ? 'FactLens এই সাবমিশনের জন্য প্রয়োজনীয় বিশ্লেষণ পদক্ষেপগুলো সম্পন্ন করতে পারেনি। অনুগ্রহ করে সার্ভিস পুনঃসূচনা করুন।'
                : 'FactLens could not complete the required pipeline steps for this submission due to network timeout or malformed payload.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <button
              onClick={() => handleToggleState('normal')}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm flex items-center gap-2.5 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <RefreshCw className="w-4.5 h-4.5" />
              {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry Pipeline'}
            </button>
            <button
              onClick={() => navigate('/app/scam')}
              className={`px-6 py-3 rounded-xl border font-bold text-xs md:text-sm transition-all ${
                isLight
                  ? 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                  : 'bg-[#141F1B] text-emerald-200 border-[#1B2923] hover:bg-[#1B2B25]'
              }`}
            >
              {isBn ? 'স্ক্যাম অ্যালার্টে ফিরে যান' : 'Return to Scam Alert'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* ── 3. MAIN WORKSPACE GRID (65% / 35%) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start pt-4">
          
          {/* LEFT COLUMN (65% = 8 cols) */}
          <div className="lg:col-span-8 space-y-8 md:space-y-10">
            
            {/* SUBMITTED PAYLOAD CARD */}
            <div className={`p-8 md:p-10 rounded-3xl border space-y-6 relative overflow-hidden shadow-2xl ${
              isLight
                ? 'bg-white border-[#C2DCD0]'
                : 'bg-gradient-to-br from-[#0F1714] to-[#141F1B] border-emerald-500/25'
            }`}>
              <div className={`flex items-center justify-between border-b pb-5 ${
                isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl border ${
                    isLight
                      ? 'bg-emerald-100 text-[#007A50] border-emerald-300'
                      : 'bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-xs md:text-sm font-black uppercase tracking-wider font-mono ${
                      isLight ? 'text-[#007A50]' : 'text-emerald-400'
                    }`}>
                      {isBn ? 'পরীক্ষা করা কন্টেন্ট ইনপুট' : 'Inspected Communication Payload'}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-600' : 'text-emerald-200/70'}`}>
                      {isBn ? 'ব্যবহারকারীর জমাকৃত সন্দেহজনক টেক্সট' : 'Raw content submitted for threat evaluation'}
                    </p>
                  </div>
                </div>

                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border font-mono shadow-sm ${
                  isLight
                    ? 'bg-emerald-50 text-[#007A50] border-emerald-200'
                    : 'bg-[#1C2B25] text-emerald-200 border-[#1B2923]'
                }`}>
                  {isOCR
                    ? isBn ? 'স্ক্রিনশট • ওসিআর নিশ্চিত' : 'Screenshot • OCR Confirmed'
                    : isBn ? 'ইংরেজি • টেক্সট ইনপুট' : 'English • Text Input'}
                </span>
              </div>

              {/* Payload box */}
              <div className={`p-6 md:p-7 rounded-2xl border text-sm md:text-base font-mono leading-relaxed relative shadow-inner ${
                isLight
                  ? 'bg-[#F4F9F6] border-[#C2DCD0] text-[#06231A]'
                  : 'bg-[#080C0B] border-[#1B2923] text-emerald-200'
              }`}>
                “{userContent.length > 150 ? `${userContent.substring(0, 150)}...` : userContent}”
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className={`flex items-center gap-2 text-xs font-mono font-bold ${
                  isLight ? 'text-[#007A50]' : 'text-emerald-400/80'
                }`}>
                  <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`} />
                  <span>Sanitized • UTF-8 Tokenized</span>
                </div>
                <button
                  onClick={() => setIsFullMessageOpen(true)}
                  className={`px-5 py-2.5 rounded-xl border font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-sm ${
                    isLight
                      ? 'bg-emerald-100 hover:bg-emerald-200 text-[#007A50] border-emerald-300'
                      : 'bg-[#00E599]/15 hover:bg-[#00E599]/25 text-[#00E599] border-[#00E599]/30'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" />
                  {isBn ? 'সম্পূর্ণ বার্তা দেখুন' : 'View Full Payload'}
                </button>
              </div>
            </div>

            {/* MAIN PROCESSING PIPELINE TIMELINE CARD */}
            <div className={`p-8 md:p-10 rounded-3xl border space-y-8 shadow-2xl ${
              isLight
                ? 'bg-white border-[#C2DCD0]'
                : 'bg-gradient-to-br from-[#0F1714] via-[#141F1B] to-[#0F1714] border-emerald-500/25'
            }`}>
              <div className={`flex items-center justify-between border-b pb-5 ${
                isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
                    <Sparkles className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className={`text-lg md:text-xl font-black tracking-tight ${
                      isLight ? 'text-[#06231A]' : 'text-white'
                    }`}>
                      {isBn ? 'এআই সিকিউরিটি পাইপলাইন টাইমলাইন' : 'Transparent AI Security Pipeline'}
                    </h3>
                    <p className={`text-xs md:text-sm font-medium mt-0.5 ${
                      isLight ? 'text-gray-600' : 'text-emerald-200/70'
                    }`}>
                      {isBn ? 'পর্যায়ক্রমে প্রতিটি নিরাপত্তা স্তর সম্পন্ন করা হচ্ছে' : 'Real-time multi-layered verification and threat vector extraction'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/app/result/scam', { state: { content: userContent, scanId: baseData.scanId } })}
                  className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                    isLight
                      ? 'bg-[#00A870] hover:bg-[#008F5F] text-white shadow-md'
                      : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0] shadow-lg shadow-[#00E599]/25'
                  }`}
                >
                  {isBn ? 'সরাসরি ফলাফল দেখুন' : 'Skip to Verdict'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* TIMELINE STAGES LIST */}
              <div className="space-y-5 relative">
                {steps.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isProcessing = step.status === 'processing';
                  const isFailed = step.status === 'failed';
                  const isPartial = step.status === 'partial';

                  return (
                    <motion.div
                      key={step.id}
                      ref={idx === activeStepIndex ? activeStepRef : undefined}
                      initial={{ opacity: 0.6, y: 8 }}
                      animate={{ opacity: idx <= activeStepIndex ? 1 : 0.45, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`p-6 rounded-2xl border transition-all duration-300 ${
                        isProcessing
                          ? isLight
                            ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-300'
                            : 'bg-[#0F1E2E] border-blue-500/50 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30'
                          : isCompleted
                          ? isLight
                            ? 'bg-[#F4FAFA] border-[#C2DCD0]'
                            : 'bg-[#141F1B] border-[#1B2923] hover:border-[#00E599]/40'
                          : isPartial
                          ? isLight
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-amber-950/30 border-amber-500/40'
                          : isFailed
                          ? isLight
                            ? 'bg-red-50 border-red-300'
                            : 'bg-red-950/30 border-red-500/40'
                          : isLight
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-[#080C0B] border-[#1B2923] opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        {/* Status Icon Indicator */}
                        <div className="mt-0.5 shrink-0">
                          {isCompleted && (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-md ${
                              isLight
                                ? 'bg-[#00A870] text-white'
                                : 'bg-[#00E599] text-[#040A07] shadow-[#00E599]/30'
                            }`}>
                              <Check className="w-5 h-5 stroke-[3]" />
                            </div>
                          )}
                          {isProcessing && (
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold animate-pulse shadow-md shadow-blue-500/30">
                              <Cpu className="w-5 h-5 animate-spin-slow" />
                            </div>
                          )}
                          {isPartial && (
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                              ⚠
                            </div>
                          )}
                          {isFailed && (
                            <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                              ✕
                            </div>
                          )}
                          {!isCompleted && !isProcessing && !isPartial && !isFailed && (
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-mono font-bold ${
                              isLight
                                ? 'bg-gray-100 border-gray-300 text-gray-500'
                                : 'bg-[#1C2B25] border-[#1B2923] text-gray-400'
                            }`}>
                              0{idx + 1}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className={`text-base font-black ${
                              isProcessing
                                ? isLight ? 'text-blue-900' : 'text-blue-400'
                                : isLight ? 'text-[#06231A]' : 'text-white'
                            }`}>
                              {isBn ? step.titleBn : step.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider font-mono ${
                              isCompleted
                                ? isLight
                                  ? 'bg-emerald-100 text-[#007A50] border border-emerald-300'
                                  : 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30'
                                : isProcessing
                                ? isLight
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300 animate-pulse'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                                : isPartial
                                ? isLight
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : isFailed
                                ? isLight
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isLight
                                ? 'bg-gray-100 text-gray-600 border border-gray-300'
                                : 'bg-[#1C2B25] text-gray-400'
                            }`}>
                              {isCompleted ? 'COMPLETED' : isProcessing ? 'IN PROGRESS' : isPartial ? 'PARTIAL' : isFailed ? 'FAILED' : 'QUEUED'}
                            </span>
                          </div>

                          <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                            isLight ? 'text-gray-700' : 'text-emerald-200/80'
                          }`}>
                            {isBn ? step.descriptionBn : step.description}
                          </p>

                          {step.metadata && (
                            <div className={`mt-2.5 text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg border inline-block ${
                              isLight
                                ? 'bg-[#F4F9F6] border-[#C2DCD0] text-[#007A50]'
                                : 'bg-[#080C0B] border-[#1B2923] text-emerald-300'
                            }`}>
                              {step.metadata}
                            </div>
                          )}

                          {/* Active Stage Live Scan Bar */}
                          {isProcessing && (
                            <div className="mt-5 space-y-3.5 pt-4 border-t border-blue-400/30">
                              <div className={`w-full h-3 rounded-full overflow-hidden border shadow-inner ${
                                isLight ? 'bg-gray-200 border-blue-300' : 'bg-[#080C0B] border-blue-500/40'
                              }`}>
                                <motion.div
                                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-[#00E599] h-full rounded-full"
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${scanProgress}%` }}
                                  transition={{ duration: 0.4 }}
                                />
                              </div>

                              <div className={`flex items-center justify-between text-xs font-mono font-bold ${
                                isLight ? 'text-blue-900' : 'text-blue-400'
                              }`}>
                                <span className="flex items-center gap-2">
                                  <Terminal className="w-4 h-4" />
                                  SCANNING THREAT PATTERNS & HEURISTICS...
                                </span>
                                <span>{scanProgress}%</span>
                              </div>

                              {/* Live Detected Pattern Chips Ticker */}
                              <div className="flex flex-wrap gap-2.5 pt-1">
                                <span className="text-xs font-mono font-black px-3 py-1 rounded-lg bg-blue-500/20 text-blue-700 border border-blue-400 shadow-sm">
                                  [Pattern: Smishing Match 98%]
                                </span>
                                <span className="text-xs font-mono font-black px-3 py-1 rounded-lg bg-amber-500/20 text-amber-800 border border-amber-400 shadow-sm">
                                  [Urgency: Upfront Fee Demand]
                                </span>
                                <span className="text-xs font-mono font-black px-3 py-1 rounded-lg bg-red-500/20 text-red-700 border border-red-400 shadow-sm">
                                  [Domain TLD: Typosquatting .xyz]
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Completion Alert */}
              {activeStepIndex === steps.length - 1 && simulationState === 'normal' && (
                <motion.div
                  ref={verdictRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 shadow-2xl mt-6 ${
                    isLight
                      ? 'bg-[#E8F6F0] border-[#00A870] text-[#06231A]'
                      : 'bg-[#14261F] border-[#00E599]/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-lg ${
                      isLight
                        ? 'bg-[#00A870] text-white'
                        : 'bg-[#00E599] text-[#040A07] shadow-[#00E599]/30'
                    }`}>
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <span className={`font-black text-base block ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
                        {isBn ? '✓ সম্পূর্ণ নিরাপত্তা পরীক্ষা সফল!' : '✓ Security Analysis Completed!'}
                      </span>
                      <span className={`text-xs md:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
                        {isBn ? 'ঝুঁকি সারণি এবং বিস্তারিত ব্যাখ্যা তৈরি করা হয়েছে।' : 'Comprehensive threat intelligence report ready.'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/app/result/scam', { state: { content: userContent, scanId: baseData.scanId } })}
                    className={`px-6 py-3 rounded-xl font-black text-xs md:text-sm transition-all shrink-0 shadow-lg flex items-center justify-center gap-2 ${
                      isLight
                        ? 'bg-[#00A870] text-white hover:bg-[#008F5F]'
                        : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0] shadow-[#00E599]/25'
                    }`}
                  >
                    {isBn ? 'ফলাফল দেখুন' : 'See Full Verdict'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (35% = 4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* WIDGET 1: LIVE RISK SIGNALS */}
            <div className={`p-7 md:p-8 rounded-3xl border space-y-5 shadow-2xl ${
              isLight
                ? 'bg-white border-amber-300'
                : 'bg-[#0F1714] border-amber-500/30'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 ${
                isLight ? 'border-gray-200' : 'border-[#1B2923]'
              }`}>
                <h3 className={`text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2 font-mono ${
                  isLight ? 'text-amber-800' : 'text-amber-400'
                }`}>
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
                  {isBn ? 'শনাক্তকৃত ঝুঁকি সংকেত' : 'Extracted Threat Signals'}
                </h3>
                <span className={`text-xs font-mono font-black px-3 py-1 rounded-full border ${
                  isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {visibleIndicators} / {baseData.riskIndicators.length}
                </span>
              </div>

              <div className="space-y-3">
                {baseData.riskIndicators.slice(0, visibleIndicators).map((indicator, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.08 }}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-xs md:text-sm font-bold shadow-md ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                      <span className="truncate">{isBn ? indicator.labelBn : indicator.label}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded uppercase shrink-0 ${
                      isLight
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {indicator.severity}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* WIDGET 2: LINK & DOMAIN ANALYSIS */}
            <div className={`p-7 md:p-8 rounded-3xl border space-y-5 shadow-2xl ${
              isLight
                ? 'bg-white border-blue-200'
                : 'bg-[#0F1714] border-blue-500/30'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 ${
                isLight ? 'border-gray-200' : 'border-[#1B2923]'
              }`}>
                <h3 className={`text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2 font-mono ${
                  isLight ? 'text-blue-900' : 'text-blue-400'
                }`}>
                  <Link2 className="w-4.5 h-4.5 text-blue-500" />
                  {isBn ? 'ইউআরএল ডোমেইন বিশ্লেষণ' : 'Link & Domain Analysis'}
                </h3>
              </div>

              {userUrl ? (
                <div className="space-y-3.5">
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs md:text-sm font-mono break-all shadow-inner ${
                    isLight
                      ? 'bg-blue-50 border-blue-300 text-blue-950'
                      : 'bg-[#080C0B] border-blue-500/40 text-blue-400'
                  }`}>
                    <ExternalLink className="w-4.5 h-4.5 shrink-0 text-blue-500" />
                    <span className="font-bold">{userUrl}</span>
                  </div>

                  <div className={`space-y-2.5 text-xs md:text-sm font-medium ${
                    isLight ? 'text-gray-700' : 'text-emerald-200/80'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className={isLight ? 'text-[#00A870] font-bold' : 'text-[#00E599] font-bold'}>✓</span>
                      <span>{isBn ? 'ইউআরএল কাঠামো পরীক্ষা সম্পন্ন' : 'URL syntax & structure checked'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={isLight ? 'text-[#00A870] font-bold' : 'text-[#00E599] font-bold'}>✓</span>
                      <span>{isBn ? 'ডোমেইন রেজিস্ট্রি ও বয়স রেকর্ড' : 'Domain registry & age lookup'}</span>
                    </div>
                    <div className={`flex items-center gap-2.5 font-bold ${
                      isLight ? 'text-blue-800' : 'text-blue-400'
                    }`}>
                      <span className="animate-pulse">●</span>
                      <span>{isBn ? 'ফিশিং রেজিস্ট্রি ক্রস-রেফারেন্স' : 'Cross-referencing threat database'}</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-sm ${
                    isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}>
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span>{isBn ? 'সন্দেহজনক অনাফিশিয়াল ডোমেইন ফ্ল্যাগ' : 'Suspicious non-standard TLD flagged'}</span>
                  </div>
                </div>
              ) : (
                <div className={`p-5 text-center rounded-2xl border space-y-1.5 ${
                  isLight
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-[#080C0B] border-[#1B2923]'
                }`}>
                  <p className={`text-xs md:text-sm font-bold ${isLight ? 'text-gray-900' : 'text-emerald-200'}`}>
                    {isBn ? 'কোনো লিংক সনাক্ত হয়নি' : 'No direct URL detected'}
                  </p>
                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-emerald-400/60'}`}>
                    {isBn ? 'বার্তা নির্ভর ঝুঁকি বিশ্লেষণ চলমান।' : 'Message-based pattern analysis active.'}
                  </p>
                </div>
              )}
            </div>

            {/* WIDGET 3: THREAT ASSESSMENT METER */}
            <div className={`p-7 md:p-8 rounded-3xl border space-y-5 shadow-2xl text-center ${
              isLight
                ? 'bg-white border-red-200'
                : 'bg-[#0F1714] border-red-500/30'
            }`}>
              <h3 className={`text-xs md:text-sm font-black uppercase tracking-wider font-mono ${
                isLight ? 'text-gray-900' : 'text-emerald-400'
              }`}>
                {isBn ? 'ঝুঁকি লেভেল পূর্বাভাস' : 'Threat Assessment Meter'}
              </h3>

              <div className="grid grid-cols-3 gap-3 py-1">
                <div className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 opacity-50 ${
                  isLight ? 'bg-gray-100 border-gray-200' : 'bg-[#141F1B] border-[#1B2923]'
                }`}>
                  <span className={`text-[10px] font-black font-mono ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>LOW</span>
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500/40" />
                </div>
                <div className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 opacity-50 ${
                  isLight ? 'bg-gray-100 border-gray-200' : 'bg-[#141F1B] border-[#1B2923]'
                }`}>
                  <span className={`text-[10px] font-black font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>MEDIUM</span>
                  <div className="w-4 h-4 rounded-full border-2 border-amber-500/40" />
                </div>
                <div className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 shadow-lg ring-2 ${
                  isLight
                    ? 'bg-red-50 border-red-300 ring-red-300'
                    : 'bg-red-950/40 border-red-500/50 ring-red-500/30'
                }`}>
                  <span className="text-[10px] font-black font-mono text-red-600">HIGH RISK</span>
                  <div className="w-4.5 h-4.5 rounded-full bg-red-500 animate-ping" />
                </div>
              </div>
            </div>

            {/* WIDGET 4: SECURITY AGGREGATION ARCHITECTURE FLOW */}
            <div className={`p-7 md:p-8 rounded-3xl border space-y-4 shadow-2xl ${
              isLight
                ? 'bg-white border-[#C2DCD0]'
                : 'bg-[#0F1714] border-emerald-500/30'
            }`}>
              <div className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                isLight ? 'text-[#007A50]' : 'text-emerald-400/80'
              }`}>
                <Layers className="w-4.5 h-4.5 text-blue-500" />
                {isBn ? 'ঝুঁকি সমন্বয় পাইপলাইন' : 'Security Aggregation Architecture'}
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 text-xs font-mono shadow-inner ${
                isLight ? 'bg-[#F4F9F6] border-[#C2DCD0]' : 'bg-[#080C0B] border-[#1B2923]'
              }`}>
                <div className={`text-center p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                  isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-[#141F1B] border-[#1B2923] text-white'
                }`}>
                  <FileText className={`w-4 h-4 ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`} />
                  <span>Payload Stream</span>
                </div>
                <div className="text-center text-blue-500 font-black text-sm">↓</div>
                <div className={`text-center p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                  isLight ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                }`}>
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span>NLP & Phishing Classifier</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                  <div className={`p-2.5 rounded-xl border font-bold ${
                    isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}>
                    Risk Indicators
                  </div>
                  <div className={`p-2.5 rounded-xl border font-bold ${
                    isLight ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-blue-950/30 border-blue-500/30 text-blue-300'
                  }`}>
                    Domain Analysis
                  </div>
                </div>
                <div className={`text-center font-black text-sm ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`}>↓</div>
                <div className={`text-center p-3 rounded-xl border font-black flex items-center justify-center gap-2 shadow-md ${
                  isLight
                    ? 'bg-[#E8F6F0] border-[#00A870] text-[#007A50]'
                    : 'bg-[#14261F] border-[#00E599]/40 text-[#00E599]'
                }`}>
                  <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`} />
                  <span>Verdict Report</span>
                </div>
              </div>
            </div>

            {/* WIDGET 5: TRANSPARENCY NOTICE */}
            <div className={`p-7 md:p-8 rounded-3xl border space-y-4 shadow-2xl ${
              isLight
                ? 'bg-[#E8F6F0] border-[#00A870]/30 text-gray-900'
                : 'bg-[#14261F] border-[#00E599]/30 text-emerald-200'
            }`}>
              <div className={`flex items-center gap-3 ${isLight ? 'text-[#007A50]' : 'text-[#00E599]'}`}>
                <Info className="w-5.5 h-5.5 shrink-0" />
                <h4 className="text-xs md:text-sm font-black uppercase tracking-wider">
                  {isBn ? 'কেন এই পরীক্ষাটি কয়েকটি ধাপে সম্পন্ন হয়?' : 'Multi-Phase Verification Purpose'}
                </h4>
              </div>
              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn
                  ? 'স্ক্যাম বার্তা এবং ফিশিং লিংকে প্রতারণার বিভিন্ন ধরন লুকিয়ে থাকে। FactLens সম্পূর্ণ তথ্য বিশ্লেষণ করে নিখুঁত নিরাপত্তা রিপোর্ট প্রদান করে।'
                  : 'Fraudulent messages often blend psychological urgency with spoofed links. FactLens cross-references domains and urgency hooks before generating the assessment.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL PAYLOAD MODAL ── */}
      <AnimatePresence>
        {isFullMessageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-2xl w-full p-6 md:p-8 rounded-3xl border space-y-6 shadow-2xl relative ${
                isLight ? 'bg-white border-[#C2DCD0] text-gray-900' : 'bg-[#0F1714] border-emerald-500/30 text-white'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${
                isLight ? 'border-gray-200' : 'border-[#1B2923]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    isLight ? 'bg-emerald-100 text-[#007A50]' : 'bg-[#00E599]/15 text-[#00E599]'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className={`text-base font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {isBn ? 'সম্পূর্ণ ইনপুট পেলিওড বিবরণ' : 'Inspected Raw Payload Content'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFullMessageOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-[#141F1B] text-emerald-300'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-5 rounded-2xl border text-sm font-mono leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap shadow-inner ${
                isLight ? 'bg-[#F4F9F6] border-[#C2DCD0] text-gray-900' : 'bg-[#080C0B] border-[#1B2923] text-emerald-200'
              }`}>
                {userContent}
              </div>

              <div className={`flex items-center justify-between text-xs pt-3 border-t ${
                isLight ? 'border-gray-200 text-[#007A50]' : 'border-[#1B2923] text-emerald-400'
              }`}>
                <span className="font-mono font-bold">SCAN ID: {baseData.scanId}</span>
                <button
                  onClick={() => setIsFullMessageOpen(false)}
                  className={`px-6 py-2.5 rounded-xl font-black transition-all shadow-lg ${
                    isLight
                      ? 'bg-[#00A870] text-white hover:bg-[#008F5F]'
                      : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0] shadow-[#00E599]/20'
                  }`}
                >
                  {isBn ? 'বন্ধ করুন' : 'Close Modal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScamProcessing;

