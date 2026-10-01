import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Lock,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Globe,
  DollarSign,
  Zap,
  Sparkles,
  Terminal,
  Activity,
  PhoneCall,
  Shield,
  Key,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { mockScamResult } from '../data/mockData';
import type { ScamResult as ScamResultType } from '../data/mockData';

export const ScamResult: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // State from navigation or mock fallback
  const navState = location.state as { content?: string; scanId?: string } | undefined;
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Construct active data
  const resultData: ScamResultType = {
    ...mockScamResult,
    id: navState?.scanId || id || mockScamResult.id,
    inputText: navState?.content || mockScamResult.inputText,
  };

  const isHighRisk = resultData.riskLevel === 'high';
  const isMedRisk = resultData.riskLevel === 'medium';

  const handleCopyReport = () => {
    const reportText = `[FactLens Security Report - ${resultData.id}]\nThreat Level: ${resultData.riskLabel}\nProbability: ${resultData.probability}%\nContent: "${resultData.inputText}"\nExplanation: ${resultData.explanation}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`pb-40 max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8 space-y-16 md:space-y-24 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      {/* ── 1. TOP NAVBAR & ACTION CONTROLS ── */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b pb-10 ${
        isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'
      }`}>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/app/scam')}
            className={`p-4 rounded-2xl border transition-all shadow-xl shrink-0 ${
              isLight
                ? 'bg-white border-[#C2DCD0] hover:bg-emerald-50 text-[#007A50]'
                : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-emerald-300'
            }`}
            title={isBn ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className={`px-4.5 py-1.5 rounded-full text-xs font-black uppercase font-mono flex items-center gap-2.5 shadow-md border ${
                isLight
                  ? 'bg-red-100 text-red-900 border-red-300'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                <Activity className="w-4 h-4 animate-pulse text-red-500" />
                {isBn ? 'চূড়ান্ত নিরাপত্তা মূল্যায়ন' : 'FINAL SCAM VERDICT'}
              </span>
              <span className={`text-xs font-mono font-extrabold px-4 py-1.5 rounded-xl border ${
                isLight
                  ? 'text-[#007A50] bg-white border-[#C2DCD0]'
                  : 'text-emerald-400 bg-[#080C0B] border-[#1B2923]'
              }`}>
                SCAN ID: {resultData.id}
              </span>
            </div>
            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-snug ${
              isLight ? 'text-[#06231A]' : 'text-white'
            }`}>
              {isBn ? 'স্ক্যাম ও ফিশিং ঝুঁকি বিশ্লেষণ রিপোর্ট' : 'Scam Threat Intelligence Report'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <button
            onClick={handleCopyReport}
            className={`px-6 py-3.5 rounded-2xl border text-xs font-extrabold transition-all flex items-center gap-2.5 shadow-md ${
              isLight
                ? 'bg-white border-[#C2DCD0] hover:bg-gray-100 text-gray-800'
                : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-white'
            }`}
          >
            {copied ? <Check className={`w-4 h-4 ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`} /> : <Copy className={`w-4 h-4 ${isLight ? 'text-[#00A870]' : 'text-[#00E599]'}`} />}
            {copied ? (isBn ? 'কপি হয়েছে' : 'Copied!') : (isBn ? 'রিপোর্ট কপি' : 'Copy Report')}
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className={`px-6 py-3.5 rounded-2xl border text-xs font-extrabold transition-all flex items-center gap-2.5 shadow-md ${
              isLight
                ? 'bg-white border-[#C2DCD0] hover:bg-gray-100 text-gray-800'
                : 'bg-[#0F1714] border-[#1B2923] hover:bg-[#141F1B] text-white'
            }`}
          >
            <Share2 className="w-4 h-4 text-blue-500" />
            {isBn ? 'শেয়ার' : 'Share'}
          </button>

          <button
            onClick={() => navigate('/app/scam')}
            className={`px-7 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 shadow-xl ${
              isLight
                ? 'bg-[#00A870] hover:bg-[#008F5F] text-white shadow-md'
                : 'bg-[#00E599] text-[#040A07] hover:bg-[#00F5A0] shadow-[#00E599]/25'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            {isBn ? 'নতুন পরীক্ষা করুন' : 'Scan New Payload'}
          </button>
        </div>
      </div>

      {/* ── 2. HERO THREAT VERDICT BANNER & METRICS ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`p-10 md:p-14 lg:p-16 rounded-3xl border relative overflow-hidden shadow-2xl ${
          isHighRisk
            ? isLight
              ? 'border-red-300 bg-gradient-to-br from-red-50 via-white to-red-50 text-[#06231A]'
              : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-[#0F1714] to-[#141F1B]'
            : isMedRisk
            ? isLight
              ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50 text-[#06231A]'
              : 'border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-[#0F1714] to-[#141F1B]'
            : isLight
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 text-[#06231A]'
            : 'border-[#00E599]/40 bg-gradient-to-br from-[#14261F] via-[#0F1714] to-[#141F1B]'
        }`}
      >
        {/* Animated Cyber Sweeping Ambient Light */}
        <motion.div
          className={`absolute -right-20 -top-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-[#00E599]'
          }`}
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10">
          
          {/* Verdict Info (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-5 flex-wrap">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl shrink-0 ${
                isHighRisk ? 'bg-red-600 shadow-red-600/40 ring-4 ring-red-500/20' : isMedRisk ? 'bg-amber-600 shadow-amber-600/40 ring-4 ring-amber-500/20' : 'bg-emerald-600 shadow-emerald-600/40 ring-4 ring-emerald-500/20'
              }`}>
                {isHighRisk ? <ShieldAlert className="w-11 h-11" /> : isMedRisk ? <AlertTriangle className="w-11 h-11" /> : <ShieldCheck className="w-11 h-11" />}
              </div>

              <div className="space-y-2">
                <span className={`text-xs font-mono font-black uppercase tracking-widest ${
                  isHighRisk ? (isLight ? 'text-red-700' : 'text-red-400') : isMedRisk ? (isLight ? 'text-amber-800' : 'text-amber-400') : (isLight ? 'text-[#007A50]' : 'text-[#00E599]')
                }`}>
                  {isBn ? 'সিকিউরিটি অ্যালার্ট থ্রেট স্টেটাস' : 'VERIFIED THREAT STATUS'}
                </span>
                <h2 className={`text-3xl md:text-5xl font-black tracking-tight ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
                  {isBn ? resultData.riskLabelBn : resultData.riskLabel} — {resultData.probability}% {isBn ? 'ক্ষতিকর ঝুঁকি' : 'Threat Level'}
                </h2>
              </div>
            </div>

            <p className={`text-base md:text-lg leading-relaxed font-medium py-2 ${
              isLight ? 'text-gray-800' : 'text-emerald-200/90'
            }`}>
              {isBn ? resultData.explanationBn : resultData.explanation}
            </p>

            {/* Threat Chips */}
            <div className="flex flex-wrap gap-4 pt-3">
              <span className={`px-5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2.5 shadow-md ${
                isLight
                  ? 'bg-red-100 text-red-900 border-red-300'
                  : 'bg-red-950/60 text-red-300 border-red-500/40'
              }`}>
                <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                {isBn ? 'ফিশিং লিঙ্ক ফ্ল্যাগড' : 'Phishing URL Flagged'}
              </span>
              <span className={`px-5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2.5 shadow-md ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
              }`}>
                <Zap className="w-4.5 h-4.5 text-amber-500" />
                {isBn ? 'জরুরি চাপ সৃষ্টির ভাষা' : 'Urgency Pressure Tactic'}
              </span>
              <span className={`px-5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2.5 shadow-md ${
                isLight
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-purple-950/60 text-purple-300 border-purple-500/40'
              }`}>
                <DollarSign className="w-4.5 h-4.5 text-purple-600" />
                {isBn ? 'অগ্রিম পেমেন্ট দাবি' : 'Upfront Fee Demand'}
              </span>
            </div>
          </div>

          {/* Probability Gauge Dial & Sub-metrics (5 cols) */}
          <div className={`lg:col-span-5 p-8 md:p-10 rounded-3xl border shadow-2xl space-y-8 ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <div className={`flex items-center justify-between border-b pb-5 ${
              isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'
            }`}>
              <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                isLight ? 'text-[#007A50]' : 'text-emerald-400'
              }`}>Threat Breakdown Gauge</span>
              <span className={`text-[10px] font-mono font-black px-3.5 py-1.5 rounded-full border ${
                isLight
                  ? 'text-red-900 bg-red-100 border-red-300'
                  : 'text-red-400 bg-red-950/50 border-red-500/30'
              }`}>
                CRITICAL THREAT
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Radial Probability Circle */}
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={isLight ? 'stroke-gray-200' : 'stroke-[#1C2B25]'}
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={isHighRisk ? 'stroke-red-500' : isMedRisk ? 'stroke-amber-500' : (isLight ? 'stroke-[#00A870]' : 'stroke-[#00E599]')}
                    strokeWidth="8"
                    strokeDasharray="251.32"
                    initial={{ strokeDashoffset: 251.32 }}
                    animate={{ strokeDashoffset: 251.32 - (251.32 * resultData.probability) / 100 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center text-center">
                  <span className={`text-3xl font-black font-mono leading-none ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}>
                    {resultData.probability}%
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider font-mono mt-1.5 ${
                    isLight ? 'text-[#007A50]' : 'text-emerald-400/80'
                  }`}>
                    SCAM SCORE
                  </span>
                </div>
              </div>

              {/* Multi-Dimensional Threat Sliders */}
              <div className="w-full flex-1 space-y-4 text-xs font-mono">
                <div>
                  <div className={`flex justify-between text-[11px] mb-2 font-bold ${
                    isLight ? 'text-gray-800' : 'text-emerald-200'
                  }`}>
                    <span>Phishing URL Match</span>
                    <span className="text-red-500">98%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '98%' }} />
                  </div>
                </div>

                <div>
                  <div className={`flex justify-between text-[11px] mb-2 font-bold ${
                    isLight ? 'text-gray-800' : 'text-emerald-200'
                  }`}>
                    <span>Smishing Intent</span>
                    <span className="text-amber-500">92%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>

                <div>
                  <div className={`flex justify-between text-[11px] mb-2 font-bold ${
                    isLight ? 'text-gray-800' : 'text-emerald-200'
                  }`}>
                    <span>Urgency Hook</span>
                    <span className="text-amber-500">85%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>

                <div>
                  <div className={`flex justify-between text-[11px] mb-2 font-bold ${
                    isLight ? 'text-gray-800' : 'text-emerald-200'
                  }`}>
                    <span>Domain Risk</span>
                    <span className="text-red-500">95%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#1C2B25]'}`}>
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3. INSPECTED PAYLOAD WITH INTERACTIVE HIGHLIGHTS ── */}
      <div className={`p-10 md:p-14 rounded-3xl border space-y-8 shadow-2xl ${
        isLight
          ? 'bg-white border-[#C2DCD0]'
          : 'bg-gradient-to-br from-[#0F1714] to-[#141F1B] border-emerald-500/25'
      }`}>
        <div className={`flex items-center justify-between border-b pb-6 ${
          isLight ? 'border-[#C2DCD0]' : 'border-[#1B2923]'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              isLight
                ? 'bg-emerald-100 text-[#007A50] border-emerald-300'
                : 'bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30'
            }`}>
              <Terminal className="w-7 h-7" />
            </div>
            <div>
              <h3 className={`text-lg font-black uppercase tracking-wider font-mono ${
                isLight ? 'text-[#007A50]' : 'text-emerald-400'
              }`}>
                {isBn ? 'ইনপুট বার্তা টেক্সট পরীক্ষা' : 'Inspected Communication Payload'}
              </h3>
              <p className={`text-xs md:text-sm font-medium mt-1 ${
                isLight ? 'text-gray-600' : 'text-emerald-200/70'
              }`}>
                {isBn ? 'ঝুঁকিপূর্ণ শব্দ ও ফিশিং লিংক হাইলাইট করা হয়েছে (মাউস রেখে বিস্তারিত দেখুন)' : 'Hover over highlighted phrases to view detailed threat reasoning'}
              </p>
            </div>
          </div>

          <span className={`px-4.5 py-2 rounded-full text-xs font-mono font-bold border shadow-sm ${
            isLight
              ? 'bg-emerald-50 text-[#007A50] border-emerald-200'
              : 'bg-[#1C2B25] text-emerald-200 border-[#1B2923]'
          }`}>
            SMS / Text Payload
          </span>
        </div>

        {/* Payload Interactive Box */}
        <div className={`p-8 md:p-12 rounded-3xl border font-mono text-base md:text-xl leading-loose relative shadow-inner my-6 ${
          isLight
            ? 'bg-[#F4F9F6] border-[#C2DCD0] text-gray-900'
            : 'bg-[#080C0B] border-[#1B2923] text-emerald-200'
        }`}>
          <p className="whitespace-pre-wrap">
            {isBn ? (
              <>
                অভিনন্দন! আপনি{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('prize')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-amber-500/20 text-amber-800 font-bold px-3 py-1.5 rounded-xl border border-amber-500/40 cursor-pointer relative shadow-sm hover:bg-amber-500/30 transition-all inline-block my-1"
                >
                  ৳৫০,০০০ জিতেছেন
                </span>
                । আপনার পুরস্কার দাবি করতে{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('fee')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-red-500/20 text-red-700 font-bold px-3 py-1.5 rounded-xl border border-red-500/40 cursor-pointer relative shadow-sm hover:bg-red-500/30 transition-all inline-block my-1"
                >
                  ৳৫০০ প্রক্রিয়াকরণ ফি প্রদান করুন
                </span>
                । ভিজিট করুন:{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('link')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-red-500/30 text-red-800 font-bold px-3 py-1.5 rounded-xl border border-red-500/50 underline cursor-pointer relative shadow-sm hover:bg-red-500/40 transition-all inline-block my-1"
                >
                  www.pr1ze-claim.xyz/win
                </span>
              </>
            ) : (
              <>
                Congratulations! You have{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('prize')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-amber-500/20 text-amber-800 font-bold px-3 py-1.5 rounded-xl border border-amber-500/40 cursor-pointer relative shadow-sm hover:bg-amber-500/30 transition-all inline-block my-1"
                >
                  won $50,000
                </span>
                . Pay{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('fee')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-red-500/20 text-red-700 font-bold px-3 py-1.5 rounded-xl border border-red-500/40 cursor-pointer relative shadow-sm hover:bg-red-500/30 transition-all inline-block my-1"
                >
                  500 taka processing fee
                </span>{' '}
                immediately to claim your reward. Visit:{' '}
                <span
                  onMouseEnter={() => setActiveTooltip('link')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="bg-red-500/30 text-red-800 font-bold px-3 py-1.5 rounded-xl border border-red-500/50 underline cursor-pointer relative shadow-sm hover:bg-red-500/40 transition-all inline-block my-1"
                >
                  www.pr1ze-claim.xyz/win
                </span>
              </>
            )}
          </p>

          {/* Interactive Tooltip Callouts */}
          <AnimatePresence>
            {activeTooltip === 'prize' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`mt-6 p-6 rounded-2xl border text-sm md:text-base font-sans shadow-xl ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                }`}
              >
                <strong className="text-amber-600">⚠ Unexpected Lottery Hook:</strong> No record of entry; classic fake lottery prize bait pattern.
              </motion.div>
            )}
            {activeTooltip === 'fee' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`mt-6 p-6 rounded-2xl border text-sm md:text-base font-sans shadow-xl ${
                  isLight
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-red-950/50 border-red-500/40 text-red-200'
                }`}
              >
                <strong className="text-red-600">🚨 Upfront Advance Fee Request:</strong> Legitimate financial prizes never demand processing fees in advance.
              </motion.div>
            )}
            {activeTooltip === 'link' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`mt-6 p-6 rounded-2xl border text-sm md:text-base font-sans shadow-xl ${
                  isLight
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-red-950/50 border-red-500/40 text-red-200'
                }`}
              >
                <strong className="text-red-600">🔗 Typosquatting .xyz Domain:</strong> Character substitution (`pr1ze`) & newly registered unverified TLD.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 4. DETECTED RISK INDICATORS CARDS GRID ── */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className={`text-2xl font-black flex items-center gap-3 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              <Sparkles className="w-7 h-7 text-amber-500" />
              {isBn ? 'চিহ্নিত ঝুঁকি নির্দেশকসমূহ' : 'Discovered Threat Indicators'}
            </h3>
            <p className={`text-sm font-medium mt-1.5 ${
              isLight ? 'text-gray-600' : 'text-emerald-200/70'
            }`}>
              {isBn ? 'বার্তাটিতে সনাক্ত হওয়া প্রতারণার লক্ষণসমূহের বিশ্লেষণ' : 'Detailed breakdown of threat patterns extracted by AI models'}
            </p>
          </div>
          <span className={`text-xs font-mono font-bold px-4.5 py-2 rounded-full border shrink-0 self-start sm:self-auto ${
            isLight
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {resultData.indicators.length} Threat Signals Flagged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {resultData.indicators.map((indicator, idx) => (
            <motion.div
              key={indicator.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`p-8 md:p-10 rounded-3xl border transition-all space-y-6 shadow-xl ${
                isLight
                  ? 'bg-white border-[#C2DCD0] hover:border-amber-400 text-gray-900'
                  : 'bg-gradient-to-br from-[#0F1714] to-[#141F1B] border-[#1B2923] hover:border-amber-500/40 text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-4 font-extrabold text-lg ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  <span className={`text-3xl w-16 h-16 rounded-2xl flex items-center justify-center border shadow-md shrink-0 ${
                    isLight ? 'bg-gray-100 border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
                  }`}>
                    {idx === 0 ? '🎰' : idx === 1 ? '💳' : idx === 2 ? '⚡' : '🔗'}
                  </span>
                  <h4>{isBn ? indicator.typeBn : indicator.type}</h4>
                </div>

                <span className={`text-xs font-mono font-black px-4 py-1.5 rounded-full uppercase ${
                  indicator.severity === 'high'
                    ? isLight
                      ? 'bg-red-100 text-red-900 border border-red-300'
                      : 'bg-red-950/60 text-red-400 border border-red-500/40'
                    : isLight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                }`}>
                  {indicator.severity} SEVERITY
                </span>
              </div>

              <p className={`text-sm md:text-base leading-relaxed font-medium pt-1 ${
                isLight ? 'text-gray-800' : 'text-emerald-200/90'
              }`}>
                {isBn ? indicator.descriptionBn : indicator.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── 5. FORENSIC DOMAIN INSPECTION DASHBOARD ── */}
      <div className={`p-10 md:p-14 lg:p-16 rounded-3xl border space-y-10 shadow-2xl ${
        isLight
          ? 'bg-white border-blue-200 text-gray-900'
          : 'bg-gradient-to-br from-[#0F1714] via-[#141F1B] to-[#0A121E] border-blue-500/30 text-white'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-b pb-8 ${
          isLight ? 'border-gray-200' : 'border-[#1B2923]'
        }`}>
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h3 className={`text-xl md:text-2xl font-black tracking-tight ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {isBn ? 'ডোমেন ও লিংক ফরেনসিক ইন্টেলিজেন্স' : 'Forensic Domain Threat Intelligence'}
              </h3>
              <p className={`text-xs md:text-sm font-medium mt-1 ${
                isLight ? 'text-gray-600' : 'text-emerald-200/70'
              }`}>
                {isBn ? 'ইউআরএল ডোমেইন রেজিস্ট্রেশন, বয়স ও গ্লোবাল ব্ল্যাকলিস্ট তথ্য' : 'Domain age, SSL certificate, and threat registry database records'}
              </p>
            </div>
          </div>

          <span className={`px-4.5 py-2 rounded-full text-xs font-mono font-bold border shrink-0 self-start sm:self-auto ${
            isLight
              ? 'bg-red-100 text-red-900 border-red-300'
              : 'bg-red-950/50 text-red-400 border-red-500/40'
          }`}>
            High Malicious Risk
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className={`p-7 rounded-3xl border space-y-3 shadow-md ${
            isLight ? 'bg-[#F8FAFC] border-blue-100' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className={`text-xs font-mono font-bold uppercase ${
              isLight ? 'text-[#007A50]' : 'text-emerald-400/70'
            }`}>Target Domain</span>
            <div className="text-base font-bold text-blue-600 font-mono truncate flex items-center gap-2">
              <ExternalLink className="w-4.5 h-4.5" />
              <span>pr1ze-claim.xyz</span>
            </div>
            <span className="text-xs text-red-600 font-bold block">Typosquatting (.xyz TLD)</span>
          </div>

          <div className={`p-7 rounded-3xl border space-y-3 shadow-md ${
            isLight ? 'bg-[#F8FAFC] border-blue-100' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className={`text-xs font-mono font-bold uppercase ${
              isLight ? 'text-[#007A50]' : 'text-emerald-400/70'
            }`}>WHOIS Creation Age</span>
            <div className={`text-base font-bold font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>3 Days Old</div>
            <span className="text-xs text-amber-600 font-bold block">Newly Created (High Risk)</span>
          </div>

          <div className={`p-7 rounded-3xl border space-y-3 shadow-md ${
            isLight ? 'bg-[#F8FAFC] border-blue-100' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className={`text-xs font-mono font-bold uppercase ${
              isLight ? 'text-[#007A50]' : 'text-emerald-400/70'
            }`}>SSL Validation</span>
            <div className="text-base font-bold text-red-600 font-mono">Unverified / Self-Signed</div>
            <span className={`text-xs block ${isLight ? 'text-gray-600' : 'text-emerald-400/60'}`}>No official CA authority</span>
          </div>

          <div className={`p-7 rounded-3xl border space-y-3 shadow-md ${
            isLight ? 'bg-[#F8FAFC] border-blue-100' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className={`text-xs font-mono font-bold uppercase ${
              isLight ? 'text-[#007A50]' : 'text-emerald-400/70'
            }`}>Global Phishing Feeds</span>
            <div className="text-base font-bold text-red-600 font-mono">Blacklisted in 4 Feeds</div>
            <span className="text-xs text-red-600 font-bold block">Known Smishing Domain</span>
          </div>
        </div>
      </div>

      {/* ── 6. SAFETY ADVISORY & ACTION CENTER ── */}
      <div className={`p-10 md:p-14 lg:p-16 rounded-3xl border space-y-10 shadow-2xl ${
        isLight
          ? 'bg-[#E8F6F0] border-[#00A870]/40 text-gray-900'
          : 'bg-[#14221A] border-amber-500/40 text-white'
      }`}>
        <div className={`flex items-center gap-5 border-b pb-8 ${
          isLight ? 'border-[#00A870]/20' : 'border-amber-500/20'
        }`}>
          <div className={`p-4 rounded-2xl border ${
            isLight
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className={`text-xl md:text-2xl font-black ${isLight ? 'text-[#06231A]' : 'text-white'}`}>
              {isBn ? 'সুপারিশকৃত নিরাপত্তা পদক্ষেপসমূহ' : 'Recommended Safety Action Plan'}
            </h3>
            <p className={`text-xs md:text-sm font-medium mt-1 ${
              isLight ? 'text-gray-700' : 'text-emerald-200/80'
            }`}>
              {isBn ? 'প্রতারণা থেকে সুরক্ষায় আপনার করণীয়' : 'Crucial steps to protect your account credentials and money'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          <div className={`flex items-start gap-6 p-8 md:p-9 rounded-3xl border shadow-lg ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 font-black flex items-center justify-center shrink-0 border border-red-300">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2.5">
              <h4 className={`text-base md:text-lg font-extrabold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {isBn ? '১. লিংকে ক্লিক করবেন না' : '1. Do NOT Click the Link'}
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn ? 'কোনো অবস্থাতেই এই ওয়েবসাইটে কোনো ব্যক্তিগত তথ্য বা পিন ইনপুট দেবেন না।' : 'Never open the URL or input mobile banking PINs or OTPs.'}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-6 p-8 md:p-9 rounded-3xl border shadow-lg ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 font-black flex items-center justify-center shrink-0 border border-amber-300">
              <PhoneCall className="w-7 h-7" />
            </div>
            <div className="space-y-2.5">
              <h4 className={`text-base md:text-lg font-extrabold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {isBn ? '২. অফিসিয়াল হেল্পলাইনে কথা বলুন' : '2. Verify with Official Helpline'}
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn ? 'বিকাশ (১৬২৪৭) বা নগদ (১৬১৬৭) এ ফোন দিয়ে সরাসরি সত্যতা নিশ্চিত করুন।' : 'Call official bKash (16247) or Nagad (16167) hotlines.'}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-6 p-8 md:p-9 rounded-3xl border shadow-lg ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-300">
              <Shield className="w-7 h-7" />
            </div>
            <div className="space-y-2.5">
              <h4 className={`text-base md:text-lg font-extrabold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {isBn ? '৩. সাইবার অপরাধ বিভাগে রিপোর্ট করুন' : '3. Report to BTRC / Police Cyber Unit'}
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn ? 'বিটিআরসি (১০০) বা পুলিশের সাইবার ক্রাইম টিমে মেসেজটি রিপোর্ট করুন।' : 'Report fraud numbers and phishing domains to BTRC helpline 100.'}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-6 p-8 md:p-9 rounded-3xl border shadow-lg ${
            isLight ? 'bg-white border-[#C2DCD0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className={`w-14 h-14 rounded-2xl font-black flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-emerald-100 text-[#007A50] border-emerald-300' : 'bg-[#14261F] text-[#00E599] border-[#00E599]/40'
            }`}>
              <Key className="w-7 h-7" />
            </div>
            <div className="space-y-2.5">
              <h4 className={`text-base md:text-lg font-extrabold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {isBn ? '৪. পিন ও ওটিপি গোপন রাখুন' : '4. Never Share PIN / OTP'}
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn ? 'কোনো ব্যাংক কর্মকর্তা কখনো ফোন বা এসএমএসে পিন/ওটিপি চান না।' : 'Financial organizations never request OTPs via text or call.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SHARE MODAL ── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full p-7 md:p-8 rounded-3xl border space-y-6 shadow-2xl relative ${
                isLight ? 'bg-white border-[#C2DCD0] text-gray-900' : 'bg-[#0F1714] border-[#1B2923] text-white'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${
                isLight ? 'border-gray-200' : 'border-[#1B2923]'
              }`}>
                <h3 className={`text-base md:text-lg font-black flex items-center gap-2.5 ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  <Share2 className="w-5 h-5 text-blue-500" />
                  {isBn ? 'নিরাপত্তা রিপোর্ট শেয়ার করুন' : 'Share Threat Intelligence Report'}
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-[#141F1B] text-emerald-300'
                  }`}
                >
                  ✕
                </button>
              </div>

              <p className={`text-xs md:text-sm leading-relaxed font-medium ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {isBn ? 'প্রিয়জনকে সতর্ক করতে বা সোশ্যাল মিডিয়ায় পোস্ট করতে লিংকটি কপি করুন:' : 'Copy the verified threat report link to alert friends and family:'}
              </p>

              <div className={`p-4 rounded-2xl border flex items-center justify-between font-mono text-xs shadow-inner ${
                isLight ? 'bg-[#F4F9F6] border-[#C2DCD0] text-gray-900' : 'bg-[#080C0B] border-[#1B2923] text-emerald-200'
              }`}>
                <span className="truncate font-bold">https://factlens.org/scam-report/{resultData.id}</span>
                <button
                  onClick={handleCopyReport}
                  className={`px-4 py-2 rounded-xl font-black text-xs shrink-0 shadow-md ${
                    isLight ? 'bg-[#00A870] text-white hover:bg-[#008F5F]' : 'bg-[#00E599] text-[#040A07] shadow-[#00E599]/20'
                  }`}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isLight ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-[#141F1B] text-white hover:bg-[#1B2B25]'
                  }`}
                >
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScamResult;

