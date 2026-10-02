import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  ScanSearch,
  Settings2,
  FileSearch,
  Eye,
  Share2,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Copy,
  MinusCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { imageResultMockData, type ImageResultData, type AssessmentType } from '../data/imageResultMockData';

export const DeepfakeResult: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Page state
  const [data] = useState<ImageResultData>(imageResultMockData);
  const [activeAssessment, setActiveAssessment] = useState<AssessmentType>('POSSIBLE_MANIPULATION');
  const [animatedSignalCount, setAnimatedSignalCount] = useState<number>(0);

  // Modals & UI toggles
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showFullImageViewer, setShowFullImageViewer] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [imageZoom, setImageZoom] = useState<number>(1);

  // Animated signal counter (0 -> 1 -> 2 -> 3 over 700ms)
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < data.signalCount) {
        current += 1;
        setAnimatedSignalCount(current);
      } else {
        clearInterval(interval);
      }
    }, 230);
    return () => clearInterval(interval);
  }, [data.signalCount]);

  const handleSaveResult = () => {
    setIsSaved(true);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleCopyLink = () => {
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  // Helper theme configurations per assessment outcome
  const getThemeConfig = (type: AssessmentType) => {
    switch (type) {
      case 'LIKELY_AUTHENTIC':
        return {
          label: isBn ? 'সঠিক বা আসল ছবি' : 'LIKELY AUTHENTIC',
          color: '#16A34A',
          badgeBg: isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
          heroBg: isLight ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-emerald-950/20 border-emerald-500/30',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
          summary: isBn ? 'উপলব্ধ বিশ্লেষণে কোনো ধরনের বিকৃতি বা AI নির্দেশক সংকেত পাওয়া যায়নি।' : 'No significant signals suggesting manipulation or AI generation were identified.'
        };
      case 'POSSIBLE_MANIPULATION':
        return {
          label: isBn ? 'সম্ভাব্য ছবি পরিবর্তন / বিকৃতি' : 'POSSIBLE MANIPULATION',
          color: '#F59E0B',
          badgeBg: isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-950/50 text-amber-300 border-amber-500/40',
          heroBg: isLight ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-amber-950/20 border-amber-500/30',
          icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
          summary: isBn ? 'FactLens ছবিটিতে ডিজিটাল পরিবর্তনের বা সম্পাদনার সংকেত শনাক্ত করেছে।' : 'FactLens identified image signals that may indicate digital manipulation.'
        };
      case 'LIKELY_AI_GENERATED':
        return {
          label: isBn ? 'AI দিয়ে তৈরি ছবি' : 'LIKELY AI-GENERATED',
          color: '#7C3AED',
          badgeBg: isLight ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-purple-950/50 text-purple-300 border-purple-500/40',
          heroBg: isLight ? 'bg-[#F5F3FF] border-[#DDD6FE]' : 'bg-purple-950/20 border-purple-500/30',
          icon: <Sparkles className="w-8 h-8 text-purple-600" />,
          summary: isBn ? 'সংশ্লিষ্ট কৃত্রিম বুদ্ধিমত্তা ও জেনারেটিভ মডেলের বৈশিষ্ট্য চিহ্নিত হয়েছে।' : 'Image characteristics show strong indicators associated with AI generative models.'
        };
      case 'UNABLE_TO_ANALYZE':
      default:
        return {
          label: isBn ? 'বিশ্লেষণ করতে অক্ষম' : 'UNABLE TO ANALYZE',
          color: '#64748B',
          badgeBg: isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-300 border-slate-700',
          heroBg: isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-slate-900/30 border-slate-800',
          icon: <MinusCircle className="w-8 h-8 text-slate-500" />,
          summary: isBn ? 'উপলব্ধ ফোরেনসিক সার্ভিসের মাধ্যমে নির্ভরযোগ্য ফলাফল পাওয়া যায়নি।' : 'The available analysis services could not produce a reliable assessment.'
        };
    }
  };

  const activeTheme = getThemeConfig(activeAssessment);

  return (
    <div className={`space-y-10 md:space-y-14 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${
      isLight ? 'text-gray-900' : 'text-white'
    }`}>

      {/* ── 4. PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
            isLight
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          }`}>
            IMAGE ANALYSIS RESULT
          </span>
          
          {/* Assessment State Selector Pills for Prototype Switching */}
          <div className="flex items-center gap-1.5 bg-gray-200/60 dark:bg-gray-800/60 p-1 rounded-full text-[10px] font-mono font-bold">
            {(['POSSIBLE_MANIPULATION', 'LIKELY_AI_GENERATED', 'LIKELY_AUTHENTIC', 'UNABLE_TO_ANALYZE'] as AssessmentType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveAssessment(t)}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  activeAssessment === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {activeAssessment === 'POSSIBLE_MANIPULATION' && (isBn ? 'ফটোশপ টেক্সট বিকৃতি ও পরিবর্তন সনাক্ত করা হয়েছে' : 'Possible manipulation detected')}
          {activeAssessment === 'LIKELY_AI_GENERATED' && (isBn ? 'AI দিয়ে ছবি তৈরির প্রমাণ সনাক্ত হয়েছে' : 'Likely AI-Generated image detected')}
          {activeAssessment === 'LIKELY_AUTHENTIC' && (isBn ? 'ছবিটি আসল ও পরিবর্তনহীন বলে পরিলক্ষিত' : 'Image appears authentic')}
          {activeAssessment === 'UNABLE_TO_ANALYZE' && (isBn ? 'ছবিটির বিষয়ে নির্দিষ্ট সিদ্ধান্ত সম্ভব নয়' : 'Unable to analyze image')}
        </h1>

        <p className={`text-sm md:text-base font-medium leading-relaxed max-w-3xl ${
          isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
        }`}>
          {activeTheme.summary}
        </p>

        <div className={`flex flex-wrap items-center gap-3 pt-1 text-xs font-mono font-bold ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          <span>Scan ID: <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{data.scanId}</strong></span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
          <span>•</span>
          <span>{data.file.format} ({data.file.dimensions})</span>
        </div>
      </motion.div>

      {/* ── 5. RESULT HERO CARD (DOMINANT ELEMENT) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`rounded-3xl border p-6 md:p-10 shadow-2xl relative overflow-hidden transition-all ${activeTheme.heroBg}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* HERO IMAGE PREVIEW (40% DESKTOP = 5 COLS) WITH HOVER VIEW OVERLAY */}
          <div className="lg:col-span-5 relative group">
            <div className={`relative rounded-2xl border p-4 min-h-[300px] flex items-center justify-center overflow-hidden shadow-2xl ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F172A] border-slate-700/60'
            }`}>
              
              {/* Image hover overlay */}
              <div
                onClick={() => setShowFullImageViewer(true)}
                className={`absolute inset-0 z-20 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer text-white ${
                  isLight ? 'bg-slate-900/60' : 'bg-[#0F172A]/70'
                }`}
              >
                <div className="p-3 rounded-full bg-blue-600 text-white shadow-lg">
                  <Eye className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold tracking-wider uppercase">View Full Image</span>
              </div>

              {/* Fictional Event Poster Canvas */}
              <div className={`w-full h-64 rounded-xl border p-5 flex flex-col justify-between relative shadow-2xl ${
                isLight
                  ? 'bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 border-indigo-400 text-white'
                  : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40 text-white'
              }`}>
                <div className="space-y-2 relative z-10">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                    BANGLADESH YOUTH CONCLAVE
                  </span>
                  <h2 className="text-lg font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                    National Youth Innovation Summit
                  </h2>
                  <p className="text-[11px] text-blue-300/80 font-mono">Dhaka — 2026 • Official Announcement</p>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] font-mono flex justify-between items-center text-slate-400">
                  <span>FORENSIC CANVAS</span>
                  <span className="text-amber-400 font-bold">SIGNAL INSPECTED</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-gray-500 pt-2 px-1">
              <span>{data.file.name}</span>
              <button
                onClick={() => setShowFullImageViewer(true)}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Expand
              </button>
            </div>
          </div>

          {/* ASSESSMENT SUMMARY CONTENT (60% DESKTOP = 7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              {/* Animated Entrance Icon */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border shadow-md flex items-center justify-center shrink-0"
              >
                {activeTheme.icon}
              </motion.div>

              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border uppercase tracking-wider ${activeTheme.badgeBg}`}>
                  {activeTheme.label}
                </span>
                <p className="text-xs font-mono font-bold text-gray-500 pt-1">
                  OFFICIAL FACTLENS ASSESSMENT
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className={`text-2xl md:text-3xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {activeTheme.summary}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono text-blue-600">
                  {animatedSignalCount}
                </span>
                <span className={`text-sm font-bold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  technical signals identified from image inspection
                </span>
              </div>
            </div>

            {/* Disclaimer Box */}
            <div className={`p-4 rounded-2xl border text-xs font-medium leading-relaxed ${
              isLight
                ? 'bg-white/80 border-amber-200 text-amber-950'
                : 'bg-black/30 border-amber-500/30 text-amber-200'
            }`}>
              <strong>Note:</strong> Possible manipulation does not necessarily mean the image was intentionally altered or created with malicious intent.
            </div>

            {/* Image Specs Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
              <span className={`px-3 py-1 rounded-lg border ${
                isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-slate-900 border-slate-700 text-gray-200'
              }`}>
                FORMAT: {data.file.format}
              </span>
              <span className={`px-3 py-1 rounded-lg border ${
                isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-slate-900 border-slate-700 text-gray-200'
              }`}>
                RES: {data.file.dimensions}
              </span>
              <span className={`px-3 py-1 rounded-lg border ${
                isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-slate-900 border-slate-700 text-gray-200'
              }`}>
                SIZE: {data.file.size}
              </span>
            </div>

          </div>

        </div>
      </motion.div>

      {/* ── 13. SIGNAL OVERVIEW (3-COLUMN CARD LAYOUT) ── */}
      <div className="space-y-6">
        <h2 className={`text-2xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {isBn ? 'FactLens কি কি সংকেত সনাক্ত করেছে?' : 'What did FactLens detect?'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Visual Signals */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -4 }}
            className={`p-6 rounded-3xl border space-y-3 shadow-xl ${
              isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-600 border border-blue-500/30">
                <ScanSearch className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                2 detected
              </span>
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Visual Signals
            </h3>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-600' : 'text-emerald-200/70'}`}>
              Inconsistencies detected in visual edge sharpness and background texture noise.
            </p>
          </motion.div>

          {/* Card 2: Technical Signals */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -4 }}
            className={`p-6 rounded-3xl border space-y-3 shadow-xl ${
              isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-600 border border-indigo-500/30">
                <Settings2 className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                1 detected
              </span>
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Technical Signals
            </h3>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-600' : 'text-emerald-200/70'}`}>
              Error Level Analysis (ELA) identified double JPEG re-compression gradients.
            </p>
          </motion.div>

          {/* Card 3: Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ y: -4 }}
            className={`p-6 rounded-3xl border space-y-3 shadow-xl ${
              isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-600 border border-purple-500/30">
                <FileSearch className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30">
                2 inspected
              </span>
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Metadata Inspection
            </h3>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-600' : 'text-emerald-200/70'}`}>
              Adobe Photoshop CC software traces found; GPS location stripped.
            </p>
          </motion.div>

        </div>
      </div>

      {/* ── 15. VISUAL ANALYSIS SECTION & SIGNAL STRENGTH BARS ── */}
      <div className={`p-8 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <div className="space-y-1">
          <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Visual Analysis
          </h3>
          <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-emerald-200/70'}`}>
            Signals identified from the visual characteristics of the submitted image.
          </p>
        </div>

        <div className="space-y-4">
          {data.visualSignals.map((sig) => (
            <div
              key={sig.id}
              className={`p-5 rounded-2xl border space-y-3 transition-all ${
                sig.status === 'DETECTED'
                  ? isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
                  : isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    sig.status === 'DETECTED' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                  <h4 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {sig.title}
                  </h4>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold w-fit ${
                  sig.status === 'DETECTED'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30'
                }`}>
                  {sig.status === 'DETECTED' ? 'Signal detected ⚠' : 'Normal ✓'}
                </span>
              </div>

              <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
                {sig.description}
              </p>

              {/* Signal Strength Segmented Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-gray-400">Signal strength</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{sig.strength} ({sig.scorePct}%)</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-amber-600 rounded-full transition-all duration-500"
                    style={{ width: `${sig.scorePct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 18. TECHNICAL INSPECTION & METADATA ── */}
      <div className={`p-8 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Technical Inspection & EXIF Metadata
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b ${isLight ? 'border-gray-200 text-gray-500' : 'border-gray-800 text-gray-400'}`}>
                <th className="pb-3 font-bold uppercase">TECHNICAL METRIC</th>
                <th className="pb-3 font-bold uppercase">AUDIT RESULT</th>
                <th className="pb-3 font-bold uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              <tr>
                <td className="py-3 font-bold">Camera Header EXIF</td>
                <td className="py-3 text-emerald-600 font-bold">{data.metadata.camera}</td>
                <td className="py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></td>
              </tr>
              <tr>
                <td className="py-3 font-bold">Timestamp Metadata</td>
                <td className="py-3 text-emerald-600 font-bold">{data.metadata.timestamp}</td>
                <td className="py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></td>
              </tr>
              <tr>
                <td className="py-3 font-bold">GPS Coordinates</td>
                <td className="py-3 text-amber-600 font-bold">{data.metadata.location}</td>
                <td className="py-3"><MinusCircle className="w-4 h-4 text-gray-400" /></td>
              </tr>
              <tr>
                <td className="py-3 font-bold">Software Tag Signature</td>
                <td className="py-3 text-blue-600 font-bold">{data.metadata.software}</td>
                <td className="py-3"><AlertTriangle className="w-4 h-4 text-amber-500" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-3 ${
          isLight ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-blue-950/30 border-blue-500/30 text-blue-200'
        }`}>
          <Info className="w-5 h-5 text-blue-500 shrink-0" />
          <span>Metadata can provide useful technical context, but metadata alone does not establish whether an image is authentic or manipulated.</span>
        </div>
      </div>

      {/* ── 22. WHY DID FACTLENS GIVE THIS ASSESSMENT? ── */}
      <div className={`p-8 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-amber-50/40 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Why did FactLens give this assessment?
          </h3>
        </div>

        <p className={`text-xs md:text-sm font-medium leading-relaxed ${
          isLight ? 'text-gray-800' : 'text-emerald-200/90'
        }`}>
          {data.explanation}
        </p>

        {/* ── 23. SIGNAL CONNECTION DIAGRAM FLOW ── */}
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-amber-200' : 'bg-[#080C0B] border-[#1B2923]'
        }`}>
          <span className="text-xs font-mono font-bold text-blue-600 uppercase block">
            SIGNAL AGGREGATION DIAGRAM
          </span>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono pt-2">
            <div className={`p-3 rounded-xl border w-full text-center font-bold ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            }`}>
              Visual Signals (Edge & Texture)
            </div>

            <span className="text-gray-400 font-bold">→</span>

            <div className={`p-3 rounded-xl border w-full text-center font-bold ${
              isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            }`}>
              Technical Signals (ELA & EXIF)
            </div>

            <span className="text-gray-400 font-bold">→</span>

            <div className="p-4 rounded-xl bg-amber-500 text-white font-extrabold w-full text-center shadow-md">
              POSSIBLE MANIPULATION
            </div>
          </div>
        </div>
      </div>

      {/* ── 25. WHAT THIS RESULT DOES NOT MEAN ── */}
      <div className={`p-6 rounded-3xl border space-y-3 ${
        isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
      }`}>
        <h4 className={`text-xs font-mono font-black uppercase text-gray-500`}>
          This result does not necessarily mean:
        </h4>
        <ul className={`text-xs font-medium space-y-1.5 list-disc list-inside ${
          isLight ? 'text-gray-700' : 'text-gray-300'
        }`}>
          <li>The image is definitely fake or fabricated from scratch.</li>
          <li>The image was intentionally manipulated with malicious intent.</li>
          <li>The person who shared it created the image.</li>
          <li>Every detected signal is independently conclusive on its own.</li>
        </ul>
      </div>

      {/* ── 26. TRANSPARENCY CARD ── */}
      <div className={`p-8 rounded-3xl border space-y-4 shadow-xl ${
        isLight ? 'bg-white border-blue-200 text-gray-900' : 'bg-[#0F172A] border-slate-700/60 text-white'
      }`}>
        <div className="flex items-center gap-3 text-blue-500">
          <Info className="w-5 h-5" />
          <h4 className="text-sm font-mono font-black uppercase tracking-wider">
            Understanding Image Check
          </h4>
        </div>
        <p className={`text-xs md:text-sm leading-relaxed font-medium ${
          isLight ? 'text-gray-600' : 'text-slate-300'
        }`}>
          FactLens combines available image-analysis and technical signals to produce an assessment. No single signal should be treated as absolute proof.
        </p>
      </div>

      {/* ── 27. ANALYSIS DETAILS ACCORDION ── */}
      <div className={`p-6 rounded-3xl border space-y-4 shadow-lg ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <button
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="w-full flex items-center justify-between text-xs font-mono font-black uppercase text-left tracking-wider text-blue-600"
        >
          <span>ANALYSIS AUDIT CHECKLIST</span>
          {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isDetailsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs font-mono"
            >
              {[
                'Image validation',
                'Metadata extraction',
                'Visual analysis',
                'Technical inspection',
                'Signal aggregation',
                'Explanation generation'
              ].map((step, idx) => (
                <div key={idx} className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                  <span className="text-gray-500">{step}:</span>
                  <span className="font-bold text-emerald-600">Completed ✓</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 29. BOTTOM ACTION BUTTONS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <Link
          to="/app/image"
          className={`w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xl ${
            isLight
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {isBn ? 'অন্য একটি ছবি পরীক্ষা করুন' : '← Check Another Image'}
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSaveResult}
            className={`flex-1 sm:flex-initial px-5 py-3.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                : 'bg-slate-900 border-slate-700 text-gray-200 hover:bg-slate-800'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? 'Saved to Vault' : 'Save Result'}
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className={`flex-1 sm:flex-initial px-5 py-3.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              isLight
                ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                : 'bg-slate-900 border-slate-700 text-gray-200 hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Share Report
          </button>
        </div>
      </div>

      {/* ── SAVE TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white border border-emerald-500/40 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-mono font-bold"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>✓ Image analysis saved successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHARE MODAL ── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 md:p-8 rounded-3xl max-w-md w-full space-y-6 relative shadow-2xl border ${
                isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0F172A] border-slate-700 text-white'
              }`}
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                  SHARE IMAGE REPORT
                </span>
                <h3 className="text-xl font-black">Scan ID: {data.scanId}</h3>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px]">REPORT LINK</span>
                <span className="text-blue-300 font-bold truncate block">
                  https://factlens.app/app/result/deepfake/{data.scanId}
                </span>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedShareLink ? 'Link Copied to Clipboard!' : 'Copy Result Link'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FULL IMAGE LIGHTBOX VIEWER ── */}
      <AnimatePresence>
        {showFullImageViewer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            >
              <button
                onClick={() => setShowFullImageViewer(false)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-blue-400 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="w-full max-w-2xl h-[450px] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 flex flex-col justify-between text-white border border-blue-500/40 shadow-2xl relative">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest w-fit">
                  FULL FORENSIC INSPECTION LIGHTBOX
                </span>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black">National Youth Innovation Summit</h2>
                  <p className="text-sm text-blue-300 font-mono">Dhaka — 2026 • High-Res Pixel Matrix</p>
                </div>
                <div className="pt-4 border-t border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                  <span>EXIF: AVAILABLE</span>
                  <span>ELA NOISE GRADIENT: HIGH</span>
                </div>
              </div>

              {/* Lightbox Controls */}
              <div className="mt-4 flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 text-xs font-mono text-white">
                <button onClick={() => setImageZoom((z) => Math.max(0.75, z - 0.25))} className="hover:text-blue-400">[ − ]</button>
                <span>Zoom: {Math.round(imageZoom * 100)}%</span>
                <button onClick={() => setImageZoom((z) => Math.min(2, z + 0.25))} className="hover:text-blue-400">[ + ]</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DeepfakeResult;
