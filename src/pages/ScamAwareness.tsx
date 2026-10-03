import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Gift,
  CreditCard,
  Timer,
  Link as LinkIcon,
  UserX,
  WalletCards,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  PauseCircle,
  SearchCheck,
  BadgeCheck,
  Lock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { warningSignsData, redFlagsData, faqData } from '../data/scamAwarenessData';

export const ScamAwareness: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Interactive Red Flag Lab State
  const [discoveredRedFlags, setDiscoveredRedFlags] = useState<string[]>([]);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);

  // FAQ Accordion State
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Ref for smooth scrolling
  const warningSignsRef = useRef<HTMLDivElement | null>(null);

  const handleSpotFlag = (flagId: string) => {
    setActiveFlagId(flagId);
    if (!discoveredRedFlags.includes(flagId)) {
      setDiscoveredRedFlags((prev) => [...prev, flagId]);
    }
  };

  const scrollToWarningSigns = () => {
    warningSignsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWarningIcon = (name: string) => {
    switch (name) {
      case 'Gift': return <Gift className="w-6 h-6 text-amber-500" />;
      case 'CreditCard': return <CreditCard className="w-6 h-6 text-red-500" />;
      case 'Timer': return <Timer className="w-6 h-6 text-amber-500" />;
      case 'ShieldAlert': return <ShieldAlert className="w-6 h-6 text-red-500" />;
      case 'Link': return <LinkIcon className="w-6 h-6 text-purple-500" />;
      case 'UserRoundWarning': return <UserX className="w-6 h-6 text-amber-500" />;
      case 'WalletCards': return <WalletCards className="w-6 h-6 text-red-500" />;
      case 'TrendingUp': return <TrendingUp className="w-6 h-6 text-amber-500" />;
      default: return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <div className={`space-y-12 md:space-y-20 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${
      isLight ? 'text-gray-900' : 'text-white'
    }`}>

      {/* ── 3. HERO SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        
        {/* Left Column: Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7 space-y-6"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              isLight
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}>
              FACTLENS • SAFETY CENTER
            </span>
          </div>

          <h1 className={`text-4xl md:text-6xl font-black tracking-tight leading-tight ${
            isLight ? 'text-[#06231A]' : 'text-white'
          }`}>
            Learn to spot a scam <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              before you fall for one.
            </span>
          </h1>

          <div className="space-y-2 max-w-2xl">
            <p className={`text-base md:text-lg font-medium leading-relaxed ${
              isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
            }`}>
              Scammers rely on urgency, fear, unexpected rewards, and requests for sensitive codes. Learn the warning signs and verify suspicious content before taking action.
            </p>
            <p className={`text-xs md:text-sm font-medium ${
              isLight ? 'text-gray-600' : 'text-emerald-400/70'
            }`}>
              প্রতারণামূলক মেসেজ, ভুয়া অফার এবং ওটিপি জালিয়াতি চেনার নির্দেশিকা ও ডিজিটাল নিরাপত্তা টিপস।
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Link
              to="/app/scam"
              className={`w-full sm:w-auto px-7 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-3 shadow-xl ${
                isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <span>{isBn ? 'সন্দেহজনক মেসেজ পরীক্ষা করুন →' : 'Check a suspicious message →'}</span>
            </Link>

            <button
              onClick={scrollToWarningSigns}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                  : 'bg-slate-900 border-slate-700 text-gray-200 hover:bg-slate-800'
              }`}
            >
              <span>{isBn ? 'সতর্কতার লক্ষণগুলো দেখুন' : 'Explore warning signs'}</span>
            </button>
          </div>
        </motion.div>

        {/* Right Column: Stylized Floating Scam SMS Graphic Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-5 relative"
        >
          <motion.div
            animate={{ translateY: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={`p-6 rounded-3xl border shadow-2xl space-y-4 relative overflow-hidden ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800 text-xs font-mono">
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
                <span>SIMULATED SCAM SMS</span>
              </div>
              <span className="text-gray-400">Today, 10:42 AM</span>
            </div>

            {/* Message Body */}
            <div className={`p-4 rounded-2xl border space-y-2 text-xs font-mono leading-relaxed ${
              isLight ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}>
              <span className="font-bold text-amber-600 block">🎉 Congratulations!</span>
              <p>You have won ৳50,000 in our exclusive reward program.</p>
              <p className="font-bold text-red-600">Pay ৳500 processing fee NOW to receive prize.</p>
              <p className="underline text-blue-600">pr1ze-claim.xyz/win</p>
              <span className="text-[10px] text-red-500 font-bold block pt-1">
                ⚠ Claim within 10 minutes
              </span>
            </div>

            {/* Red Flags Indicator Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono font-bold text-red-600">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>4 RED FLAGS DETECTED</span>
              </div>
              <span>HIGH RISK</span>
            </div>
          </motion.div>
        </motion.div>

      </div>

      {/* ── 5. COMMON WARNING SIGNS (8-CARD GRID) ── */}
      <div ref={warningSignsRef} className="space-y-6 pt-6">
        <div className="space-y-1">
          <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${
            isLight ? 'text-[#06231A]' : 'text-white'
          }`}>
            {isBn ? 'সতর্কতামূলক সংকেতসমূহ (Warning Signs)' : 'Know the warning signs'}
          </h2>
          <p className={`text-xs md:text-sm font-medium ${
            isLight ? 'text-gray-600' : 'text-emerald-200/80'
          }`}>
            Scams often contain several suspicious patterns at once. Watch out for these indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {warningSignsData.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className={`p-6 rounded-3xl border space-y-4 shadow-xl transition-all ${
                isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30">
                  {getWarningIcon(item.icon)}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase ${item.badgeColor}`}>
                  {item.severity}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {item.title}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold font-sans">
                  {item.titleBn}
                </p>
              </div>

              <p className={`text-xs font-medium leading-relaxed ${
                isLight ? 'text-gray-700' : 'text-emerald-200/80'
              }`}>
                {item.description}
              </p>

              {item.exampleChips && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.exampleChips.map((chip) => (
                    <span key={chip} className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── 7. INTERACTIVE "SPOT THE RED FLAGS" SIMULATED MESSAGE LAB ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-8 shadow-2xl relative overflow-hidden ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-gray-200 dark:border-gray-800">
          <div>
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider block">
              INTERACTIVE SCAM CHALLENGE
            </span>
            <h3 className={`text-2xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Can you spot the red flags?
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Click on the suspicious elements in the simulated message below to inspect why they indicate a scam.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-mono text-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">RED FLAGS FOUND</span>
              <span className="text-lg font-black text-amber-500">
                0{discoveredRedFlags.length} / 04
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Challenge Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Interactive Simulated SMS */}
          <div className="lg:col-span-6 space-y-4">
            <div className={`p-6 rounded-3xl border space-y-4 shadow-xl relative ${
              isLight ? 'bg-[#F8FAFC] border-gray-300' : 'bg-[#080C0B] border-[#1B2923]'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b pb-3 border-gray-200 dark:border-gray-800">
                <span className="font-bold text-blue-500">+880 1700-XXXXXX (Unknown Sender)</span>
                <span>10:42 AM</span>
              </div>

              {/* Hotspot 1: Unexpected Prize */}
              <div
                onClick={() => handleSpotFlag('rf-1')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  discoveredRedFlags.includes('rf-1')
                    ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
                    : 'hover:bg-amber-500/10 border-transparent'
                }`}
              >
                <span className="text-xs font-mono font-bold text-amber-600 block">
                  🎉 Congratulations! You have won ৳50,000 in our exclusive reward program!
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {discoveredRedFlags.includes('rf-1') ? '✓ Discovered: Unexpected Reward' : 'Click to inspect 🔍'}
                </span>
              </div>

              {/* Hotspot 2: Upfront Payment */}
              <div
                onClick={() => handleSpotFlag('rf-2')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  discoveredRedFlags.includes('rf-2')
                    ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/30'
                    : 'hover:bg-red-500/10 border-transparent'
                }`}
              >
                <span className="text-xs font-mono font-bold text-red-600 block">
                  Pay ৳500 processing fee NOW to receive your prize.
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {discoveredRedFlags.includes('rf-2') ? '✓ Discovered: Upfront Payment Request' : 'Click to inspect 🔍'}
                </span>
              </div>

              {/* Hotspot 3: Suspicious URL */}
              <div
                onClick={() => handleSpotFlag('rf-3')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  discoveredRedFlags.includes('rf-3')
                    ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/30'
                    : 'hover:bg-purple-500/10 border-transparent'
                }`}
              >
                <span className="text-xs font-mono font-bold text-purple-600 block underline">
                  pr1ze-claim.xyz/win
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {discoveredRedFlags.includes('rf-3') ? '✓ Discovered: Lookalike Domain' : 'Click to inspect 🔍'}
                </span>
              </div>

              {/* Hotspot 4: Urgency */}
              <div
                onClick={() => handleSpotFlag('rf-4')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  discoveredRedFlags.includes('rf-4')
                    ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
                    : 'hover:bg-amber-500/10 border-transparent'
                }`}
              >
                <span className="text-xs font-mono font-bold text-red-500 block">
                  ⚠ Claim within 10 minutes or reward will be cancelled!
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {discoveredRedFlags.includes('rf-4') ? '✓ Discovered: Urgency Pressure' : 'Click to inspect 🔍'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Inspection Explanation Popovers */}
          <div className="lg:col-span-6 space-y-4">
            {activeFlagId ? (
              <motion.div
                key={activeFlagId}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-3xl border space-y-3 shadow-xl ${
                  isLight ? 'bg-amber-50/60 border-amber-300 text-amber-950' : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 uppercase block">
                  {redFlagsData.find((rf) => rf.id === activeFlagId)?.category}
                </span>
                <h4 className="text-lg font-black">
                  {redFlagsData.find((rf) => rf.id === activeFlagId)?.label}
                </h4>
                <p className="text-xs font-medium leading-relaxed">
                  {redFlagsData.find((rf) => rf.id === activeFlagId)?.explanation}
                </p>
              </motion.div>
            ) : (
              <div className={`p-8 rounded-3xl border text-center space-y-3 ${
                isLight ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-[#080C0B] border-[#1B2923] text-gray-400'
              }`}>
                <SearchCheck className="w-10 h-10 text-blue-500 mx-auto" />
                <h4 className="text-base font-bold">Click any highlighted text on the SMS to inspect</h4>
                <p className="text-xs font-mono">
                  Identify all 4 red flags to complete the scam recognition challenge.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── 10. HOW SCAMMERS CREATE PRESSURE ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-8 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl md:text-2xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          How scammers create pressure
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          <div className={`p-6 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className="text-xs font-mono font-bold text-amber-600">01 CREATE URGENCY</span>
            <h4 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              "Act Now" Countdowns
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              They force strict time limits ("Offer expires today") so you make hasty decisions.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className="text-xs font-mono font-bold text-red-600">02 TRIGGER EMOTION</span>
            <h4 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Fear or Unexpected Greed
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Manipulating emotions of fear ("Your account will be blocked") or excitement ("You won cash").
            </p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-2 ${
            isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
          }`}>
            <span className="text-xs font-mono font-bold text-blue-600">03 BYPASS VERIFICATION</span>
            <h4 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Prevent Careful Thinking
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              The goal is to make you act before you stop, consult someone, or verify official channels.
            </p>
          </div>

        </div>
      </div>

      {/* ── 11. SAFE RESPONSE GUIDE (3-STEP VERTICAL TIMELINE) ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-8 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl md:text-2xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          What should you do when receiving a suspicious message?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className={`p-6 rounded-2xl border space-y-3 shadow-md ${
            isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <PauseCircle className="w-8 h-8 text-amber-600" />
            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">STEP 01</span>
            <h4 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              STOP
            </h4>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
              Don't click links, send money, reply, or share OTP codes immediately. Take a pause.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 shadow-md ${
            isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-500/30'
          }`}>
            <SearchCheck className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">STEP 02</span>
            <h4 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              INSPECT
            </h4>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
              Examine the sender ID, lookalike web links, spelling errors, and requested sensitive data.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 shadow-md ${
            isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <BadgeCheck className="w-8 h-8 text-emerald-600" />
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">STEP 03</span>
            <h4 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              VERIFY
            </h4>
            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
              Use FactLens Scam Alert or call official customer support numbers directly.
            </p>
          </div>

        </div>
      </div>

      {/* ── 12. "NEVER SHARE THESE" SECTION ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-red-50/70 border-red-200 text-gray-900' : 'bg-[#0F172A] border-slate-700 text-white'
      }`}>
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <Lock className="w-6 h-6" />
          <h3 className="text-xl font-black uppercase tracking-wider">
            🔐 NEVER SHARE THESE WITH ANYONE
          </h3>
        </div>

        <p className={`text-xs md:text-sm font-medium max-w-3xl leading-relaxed ${
          isLight ? 'text-gray-700' : 'text-slate-300'
        }`}>
          Legitimate services, banks, and customer support representatives will NEVER casually ask you to share sensitive authentication codes.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          {['OTP (One-Time Password)', 'Secret PIN', 'Account Password', 'CVV Code', 'Recovery Codes', 'Mobile Banking Credentials'].map((item) => (
            <motion.span
              key={item}
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2.5 rounded-full text-xs font-mono font-black border shadow-sm ${
                isLight ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-500/20 text-red-300 border-red-500/40'
              }`}
            >
              {item}
            </motion.span>
          ))}
        </div>
      </div>

      {/* ── 13. SUSPICIOUS URL MINI-LAB ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <div className="space-y-1">
          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Look closely at the web link
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Scammers often register lookalike domain names with subtle character replacements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          
          {/* Legitimate Example */}
          <div className={`p-6 rounded-2xl border space-y-3 ${
            isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <span className="text-xs font-bold text-emerald-600 block">✓ LEGITIMATE OFFICIAL LINK</span>
            <div className={`p-3 rounded-xl border font-bold truncate ${
              isLight ? 'bg-white border-emerald-300 text-emerald-800' : 'bg-slate-900 border-emerald-500/40 text-emerald-400'
            }`}>
              https://bank-example.com/login
            </div>
            <ul className="text-gray-500 text-[11px] space-y-1 list-disc list-inside">
              <li>Valid HTTPS security protocol</li>
              <li>Official brand domain name</li>
              <li>Standard top-level domain (.com, .gov.bd)</li>
            </ul>
          </div>

          {/* Suspicious Example */}
          <div className={`p-6 rounded-2xl border space-y-3 ${
            isLight ? 'bg-red-50/50 border-red-200' : 'bg-red-950/20 border-red-500/30'
          }`}>
            <span className="text-xs font-bold text-red-600 block">⚠ SUSPICIOUS PHISHING LINK</span>
            <div className={`p-3 rounded-xl border font-bold truncate ${
              isLight ? 'bg-white border-red-300 text-red-700' : 'bg-slate-900 border-red-500/40 text-red-400'
            }`}>
              http://bank-examp1e.xyz/login
            </div>
            <ul className="text-gray-500 text-[11px] space-y-1 list-disc list-inside">
              <li>Insecure HTTP connection</li>
              <li>Lookalike character ('1' replacing 'l')</li>
              <li>Unusual cheap TLD (.xyz extension)</li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── 14. FAQ ACCORDION ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl md:text-2xl font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Frequently Asked Safety Questions
        </h3>

        <div className="space-y-4">
          {faqData.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className={`p-5 rounded-2xl border space-y-3 transition-all ${
                  isLight ? 'bg-[#F8FAFC] border-gray-200' : 'bg-[#080C0B] border-[#1B2923]'
                }`}
              >
                <button
                  onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left text-sm md:text-base font-bold"
                >
                  <span className={isLight ? 'text-gray-900' : 'text-white'}>
                    {faq.question}
                  </span>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-2 text-xs md:text-sm leading-relaxed border-t border-gray-200 dark:border-gray-800"
                    >
                      <p className={isLight ? 'text-gray-700' : 'text-emerald-200/80'}>
                        {faq.answer}
                      </p>
                      <p className="text-xs text-gray-500 font-mono pt-1">
                        {faq.answerBn}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 15. FINAL CTA & TRUST NOTICE ── */}
      <div className={`p-8 md:p-12 rounded-3xl border text-center space-y-6 shadow-2xl relative overflow-hidden ${
        isLight ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-br from-[#0F172A] to-[#0B1320] border-slate-700 text-white'
      }`}>
        <div className="max-w-2xl mx-auto space-y-3">
          <h3 className={`text-2xl md:text-4xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Something doesn't feel right? Check it before you act.
          </h3>
          <p className={`text-xs md:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-slate-300'}`}>
            Submit a suspicious message, screenshot, or web URL to FactLens and let our Scam Alert engine inspect the available technical signals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/app/scam"
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xl ${
              isLight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <span>Analyze with Scam Alert →</span>
          </Link>

          <Link
            to="/app"
            className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              isLight ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100' : 'bg-slate-900 border-slate-700 text-gray-200 hover:bg-slate-800'
            }`}
          >
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <p className="text-[11px] font-mono text-gray-400 pt-2">
          ⓘ FactLens provides an assessment based on available signals and does not guarantee that every message can be conclusively classified.
        </p>
      </div>

    </div>
  );
};

export default ScamAwareness;
