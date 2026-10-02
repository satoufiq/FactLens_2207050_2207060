import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch,
  Database,
  ScanSearch,
  Info,
  RefreshCw,
  FileImage,
  Check
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { imageProcessingData, type ProcessingStepItem } from '../data/imageProcessingMockData';

export const ImageProcessing: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // Active step index simulation (0 to 5)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(2); // Start at step 3 (Metadata inspection)
  const [steps, setSteps] = useState<ProcessingStepItem[]>(imageProcessingData.steps);
  const [isCompleted, setIsCompleted] = useState(false);

  // Animated scanner step progression
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          const nextIndex = prev + 1;
          setSteps((prevSteps) =>
            prevSteps.map((step, idx) => {
              if (idx < nextIndex) return { ...step, status: 'completed' };
              if (idx === nextIndex) return { ...step, status: 'processing' };
              return { ...step, status: 'pending' };
            })
          );
          return nextIndex;
        } else {
          clearInterval(timer);
          // Complete final step
          setSteps((prevSteps) =>
            prevSteps.map((step) => ({ ...step, status: 'completed' }))
          );
          setIsCompleted(true);
          return prev;
        }
      });
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  // Completion navigation redirect
  useEffect(() => {
    if (isCompleted) {
      const redirectTimer = setTimeout(() => {
        navigate('/app/result/deepfake/img-902');
      }, 1000);
      return () => clearTimeout(redirectTimer);
    }
  }, [isCompleted, navigate]);

  return (
    <div className={`space-y-10 md:space-y-14 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${
      isLight ? 'text-gray-900' : 'text-white'
    }`}>
      
      {/* ── 3. PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
            isLight
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          }`}>
            IMAGE ANALYSIS
          </span>
          <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${
            isLight ? 'text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200' : 'text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20'
          }`}>
            <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
            PROCESSING
          </span>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {isBn ? 'ছবিটি ড্রিপফেক ও ফোরেনসিক্স স্ক্যান হচ্ছে' : 'Analyzing your image'}
        </h1>

        <p className={`text-sm md:text-base font-medium leading-relaxed max-w-3xl ${
          isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
        }`}>
          FactLens is examining available visual, technical, and metadata signals.
        </p>
        <p className={`text-xs md:text-sm font-medium ${
          isLight ? 'text-gray-600' : 'text-emerald-400/70'
        }`}>
          FactLens ছবিটির ভিজ্যুয়াল, প্রযুক্তিগত এবং metadata সংকেত পরীক্ষা করছে।
        </p>

        <div className={`flex flex-wrap items-center gap-3 pt-1 text-xs font-mono font-bold ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          <span>Scan ID: <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{imageProcessingData.scanId}</strong></span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400">Processing</span>
          <span>•</span>
          <span>{imageProcessingData.file.format} ({imageProcessingData.file.dimensions})</span>
        </div>
      </motion.div>

      {/* ── 4. HORIZONTAL PROCESS PROGRESS TRACKER ── */}
      <div className={`p-4 md:p-6 rounded-3xl border shadow-lg ${
        isLight
          ? 'bg-white border-[#E2E8F0]'
          : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 items-center">
          
          {/* 1. Image Received */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStepIndex >= 0
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800'
            }`}>
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="truncate">
              <span className={`text-xs font-mono font-bold block truncate ${
                currentStepIndex >= 0 ? (isLight ? 'text-gray-900' : 'text-white') : 'text-gray-400'
              }`}>
                Image Received
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Done</span>
            </div>
          </div>

          {/* 2. Validation */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStepIndex >= 1
                ? 'bg-emerald-600 text-white'
                : currentStepIndex === 1
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800'
            }`}>
              {currentStepIndex >= 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </div>
            <div className="truncate">
              <span className={`text-xs font-mono font-bold block truncate ${
                currentStepIndex >= 1 ? (isLight ? 'text-gray-900' : 'text-white') : 'text-gray-400'
              }`}>
                Validation
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Verified</span>
            </div>
          </div>

          {/* 3. Image Inspection */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStepIndex >= 2
                ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800'
            }`}>
              {currentStepIndex > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            </div>
            <div className="truncate">
              <span className={`text-xs font-mono font-bold block truncate ${
                currentStepIndex >= 2 ? (isLight ? 'text-blue-700' : 'text-blue-400') : 'text-gray-400'
              }`}>
                Image Inspection
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold">
                {currentStepIndex === 2 ? 'Active Now' : 'Completed'}
              </span>
            </div>
          </div>

          {/* 4. Technical Analysis */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStepIndex >= 4
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {currentStepIndex >= 4 ? <Check className="w-4 h-4 stroke-[3]" /> : '4'}
            </div>
            <div className="truncate">
              <span className={`text-xs font-mono font-bold block truncate ${
                currentStepIndex >= 4 ? (isLight ? 'text-gray-900' : 'text-white') : 'text-gray-400'
              }`}>
                Technical Analysis
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {currentStepIndex >= 4 ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>

          {/* 5. Assessment */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              isCompleted
                ? 'bg-emerald-600 text-white scale-110'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : '5'}
            </div>
            <div className="truncate">
              <span className={`text-xs font-mono font-bold block truncate ${
                isCompleted ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : 'text-gray-400'
              }`}>
                Assessment
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {isCompleted ? 'Ready' : 'Pending'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. MAIN PROCESSING WORKSPACE (2-COLUMN 55% / 45% DESKTOP SPLIT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (55% = 7 COLS): IMAGE PREVIEW & SCANNER OVERLAY */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
            isLight
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-blue-600" />
                <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  FORENSIC PREVIEW CANVAS
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                LIVE IMAGE BEAM
              </span>
            </div>

            {/* PREVIEW CONTAINER WITH SCANNING BEAM & GRID OVERLAY */}
            <div className={`relative mt-4 rounded-2xl border p-4 min-h-[360px] md:min-h-[420px] flex items-center justify-center overflow-hidden shadow-2xl ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F172A] border-slate-700/60'
            }`}>
              
              {/* Overlay Grid Effect (0.05 opacity) */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:24px_24px]" />

              {/* Animated Horizontal Scanning Beam */}
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#3b82f6] z-20 pointer-events-none"
              />

              {/* Mock Graphic Poster Preview Canvas */}
              <div className={`w-full max-w-md h-80 rounded-xl border p-6 flex flex-col justify-between relative shadow-2xl ${
                isLight
                  ? 'bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 border-indigo-400 text-white'
                  : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40 text-white'
              }`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
                <div className="space-y-2 relative z-10">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                    BANGLADESH YOUTH CONCLAVE
                  </span>
                  <h2 className="text-xl md:text-2xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                    National Youth Innovation Summit
                  </h2>
                  <p className="text-xs text-blue-300/80 font-mono">Dhaka — 2026 • Official Announcement</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800 relative z-10">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">VENUE: KICC DHAKA</span>
                    <span className="text-blue-400 font-bold animate-pulse">EXAMINING SIGNALS...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Information Bar Below Image */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-blue-500 shrink-0" />
                <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {imageProcessingData.file.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                  {imageProcessingData.file.format} • {imageProcessingData.file.dimensions} • {imageProcessingData.file.size}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                  PROCESSING
                </span>
              </div>
            </div>
          </div>

          {/* METADATA INSPECTION VISUALIZATION CARD */}
          <div className={`p-6 rounded-3xl border space-y-4 shadow-lg ${
            isLight
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
              <h4 className={`text-xs font-mono font-black uppercase tracking-wider ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}>
                EXIF & METADATA INSPECTION MONITOR
              </h4>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                ● Active Extraction
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono pt-1">
              <div className={`p-3 rounded-xl border text-center space-y-1 ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
              }`}>
                <span className="text-gray-500 text-[10px] block">EXIF</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">● Detected</span>
              </div>
              <div className={`p-3 rounded-xl border text-center space-y-1 ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
              }`}>
                <span className="text-gray-500 text-[10px] block">Camera</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">● Detected</span>
              </div>
              <div className={`p-3 rounded-xl border text-center space-y-1 ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
              }`}>
                <span className="text-gray-500 text-[10px] block">Timestamp</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">● Detected</span>
              </div>
              <div className={`p-3 rounded-xl border text-center space-y-1 ${
                isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-950/30 border-blue-500/30'
              }`}>
                <span className="text-gray-500 text-[10px] block">Software</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 animate-pulse">◌ Checking</span>
              </div>
              <div className={`p-3 rounded-xl border text-center space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}>
                <span className="text-gray-400 text-[10px] block">Location</span>
                <span className="font-bold text-slate-500 dark:text-gray-400">○ Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (45% = 5 COLS): PROCESSING TIMELINE & STATUS PANEL */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CURRENT STAGE STATUS BANNER */}
          <div className={`p-5 rounded-2xl border flex items-center gap-4 shadow-md ${
            isLight
              ? 'bg-blue-50/90 border-blue-200 text-blue-950'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
          }`}>
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin shrink-0" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {isBn ? 'প্রসেসিং স্ট্যাটাস' : 'Currently inspecting metadata'}
              </h4>
              <p className="text-xs font-medium">
                {isBn ? 'কিছুক্ষণ অপেক্ষা করুন, সংকেত একত্রিত করা হচ্ছে...' : 'This may take a few moments while models analyze visual signals.'}
              </p>
            </div>
          </div>

          {/* VERTICAL TIMELINE CONTAINER */}
          <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${
            isLight
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-[#0F1714] border-[#1B2923]'
          }`}>
            <h3 className={`text-lg font-black tracking-tight ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              {isBn ? 'বিশ্লেষণের অগ্রগতির ধাপ' : 'Analysis Progress'}
            </h3>

            <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
              {steps.map((step, index) => {
                const isCurrent = index === currentStepIndex;
                const isStepCompleted = step.status === 'completed';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`relative flex items-start gap-4 p-3.5 rounded-2xl transition-all ${
                      isCurrent
                        ? isLight
                          ? 'bg-blue-50/80 border border-blue-200 shadow-sm'
                          : 'bg-blue-950/30 border border-blue-500/40 shadow-sm'
                        : ''
                    }`}
                  >
                    {/* Timeline Node Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 relative z-10 ${
                      isStepCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-400'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600 border border-slate-200 dark:border-slate-800'
                    }`}>
                      {isStepCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${
                          isStepCompleted
                            ? isLight ? 'text-gray-900' : 'text-white'
                            : isCurrent
                            ? 'text-blue-600 dark:text-blue-400'
                            : isLight ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold uppercase rounded bg-blue-600 text-white animate-pulse">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-medium leading-relaxed ${
                        isLight ? 'text-gray-600' : 'text-emerald-200/70'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* TECHNICAL INSPECTION MINI-CARDS */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border space-y-2 text-center shadow-md ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F1714] border-[#1B2923]'
            }`}>
              <FileSearch className="w-5 h-5 text-blue-600 mx-auto" />
              <span className={`text-[11px] font-mono font-bold block truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                EXIF Inspection
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 uppercase inline-block">
                Processing
              </span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 text-center shadow-md ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F1714] border-[#1B2923]'
            }`}>
              <Database className="w-5 h-5 text-purple-600 mx-auto" />
              <span className={`text-[11px] font-mono font-bold block truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Metadata Signals
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 uppercase inline-block">
                Pending
              </span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 text-center shadow-md ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F1714] border-[#1B2923]'
            }`}>
              <ScanSearch className="w-5 h-5 text-emerald-600 mx-auto" />
              <span className={`text-[11px] font-mono font-bold block truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Visual Analysis
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 uppercase inline-block">
                Pending
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ── 16. WHAT IS FACTLENS CHECKING? CARD ── */}
      <div className={`p-8 rounded-3xl border space-y-6 shadow-xl ${
        isLight
          ? 'bg-white border-[#E2E8F0]'
          : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl font-black tracking-tight ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          {isBn ? 'FactLens কি কি পরীক্ষা করছে?' : 'What is FactLens checking?'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className={`p-5 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-600">
              <span>● METADATA</span>
              <span className="text-emerald-600 dark:text-emerald-400">● Checking</span>
            </div>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Available EXIF and technical info
            </h4>
            <p className="text-xs text-gray-500">
              Examining header tags, timestamp consistency, and editing application headers.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-indigo-600">
              <span>● VISUAL SIGNALS</span>
              <span className="text-blue-600 dark:text-blue-400">◌ Active Scan</span>
            </div>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Characteristics & manipulation patterns
            </h4>
            <p className="text-xs text-gray-500">
              Scanning compression artifacts, Error Level Analysis (ELA), and edge discontinuities.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-600">
              <span>● AI-GENERATION SIGNALS</span>
              <span className="text-slate-400">○ Pending</span>
            </div>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Synthetic diffusion classifier models
            </h4>
            <p className="text-xs text-gray-500">
              Detecting synthetic latent patterns associated with Midjourney, DALL-E, and Flux.
            </p>
          </div>

        </div>
      </div>

      {/* ── 20. TRANSPARENCY NOTICE ── */}
      <div className={`p-8 rounded-3xl border space-y-4 shadow-xl ${
        isLight ? 'bg-white border-blue-200 text-gray-900' : 'bg-[#0F172A] border-slate-700/60 text-white'
      }`}>
        <div className="flex items-center gap-3 text-blue-500">
          <Info className="w-5 h-5" />
          <h4 className="text-sm font-mono font-black uppercase tracking-wider">
            Analysis may produce partial results
          </h4>
        </div>
        <p className={`text-xs md:text-sm leading-relaxed font-medium ${
          isLight ? 'text-gray-600' : 'text-slate-300'
        }`}>
          If a technical service or analysis provider is unavailable, FactLens may provide a partial result or indicate that the image could not be analyzed.
        </p>
      </div>

      {/* ── COMPLETION OVERLAY ANIMATION ── */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: [0.7, 1.15, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-emerald-950 border border-emerald-500/50 p-8 rounded-3xl text-center space-y-4 shadow-2xl max-w-md w-full"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/40">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-white">
                {isBn ? 'বিশ্লেষণ সম্পন্ন হয়েছে!' : 'Analysis Complete!'}
              </h3>
              <p className="text-xs font-mono text-emerald-300">
                Preparing final forensic report & assessment...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ImageProcessing;
