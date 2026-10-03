import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Layers3,
  SearchCheck,
  ShieldAlert,
  Image as ImageIcon,
  MoreVertical,
  ArrowRight,
  X,
  ChevronDown,
  CheckCircle2,
  Trash2,
  Bookmark,
  List,
  GitCommit
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { scanHistoryMockData, type ScanHistoryItem, type ScanType, type ScanResultStatus } from '../data/scanHistoryMockData';

export const History: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // Data & State
  const [historyList, setHistoryList] = useState<ScanHistoryItem[]>(scanHistoryMockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // UI state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showNewScanMenu, setShowNewScanMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animated stat counters
  const [counts, setCounts] = useState({ total: 0, rumor: 0, scam: 0, image: 0 });

  useEffect(() => {
    const totalTarget = 24;
    const rumorTarget = 10;
    const scamTarget = 8;
    const imageTarget = 6;
    const duration = 700;
    const steps = 20;
    const stepTime = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      setCounts({
        total: Math.round(totalTarget * progress),
        rumor: Math.round(rumorTarget * progress),
        scam: Math.round(scamTarget * progress),
        image: Math.round(imageTarget * progress)
      });
      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
    setActiveMenuId(null);
    triggerToast(isBn ? 'রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' : 'Scan record removed from history');
  };

  // Filter & Search logic
  const filteredHistory = historyList.filter((item) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      (item.titleBn && item.titleBn.toLowerCase().includes(query)) ||
      item.id.toLowerCase().includes(query) ||
      item.preview.toLowerCase().includes(query);

    const matchesType = selectedType === 'ALL' || item.type === selectedType;
    const matchesResult = selectedResult === 'ALL' || item.result === selectedResult;

    return matchesSearch && matchesType && matchesResult;
  });

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedResult('ALL');
    setSelectedDate('ALL');
  };

  const getResultBadgeProps = (result: ScanResultStatus) => {
    switch (result) {
      case 'SUPPORTED':
        return { label: '🟢 SUPPORTED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40' };
      case 'UNVERIFIED':
        return { label: '⚪ UNVERIFIED', bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800' };
      case 'CONTRADICTED':
        return { label: '🔴 CONTRADICTED', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40' };
      case 'HIGH_RISK':
        return { label: '🚨 HIGH RISK', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40' };
      case 'LIKELY_AUTHENTIC':
        return { label: '✓ AUTHENTIC', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40' };
      case 'POSSIBLE_MANIPULATION':
        return { label: '⚠ MANIPULATION', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40' };
      case 'LIKELY_AI_GENERATED':
        return { label: '✦ AI GENERATED', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/40' };
      case 'UNABLE_TO_ANALYZE':
      default:
        return { label: '— UNABLE', bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800' };
    }
  };

  const getScanTypeIcon = (type: ScanType) => {
    switch (type) {
      case 'RUMOR':
        return <SearchCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'SCAM':
        return <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getScanTargetRoute = (item: ScanHistoryItem) => {
    return `/app/history/${item.id}`;
  };

  return (
    <div className={`space-y-10 md:space-y-12 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${
      isLight ? 'text-gray-900' : 'text-white'
    }`}>
      
      {/* ── 3. PAGE HEADER & NEW SCAN BUTTON ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              isLight
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}>
              ACTIVITY HUB
            </span>
          </div>

          <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${
            isLight ? 'text-[#06231A]' : 'text-white'
          }`}>
            {isBn ? 'স্ক্যান অ্যাক্টিভিটি ইতিহাস' : 'Scan History'}
          </h1>

          <p className={`text-sm md:text-base font-medium ${
            isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
          }`}>
            Review your previous content checks and revisit their assessments.
          </p>
          <p className={`text-xs md:text-sm font-medium ${
            isLight ? 'text-gray-600' : 'text-emerald-400/70'
          }`}>
            আপনার আগের যাচাইগুলো দেখুন এবং তাদের ফলাফল আবার পর্যালোচনা করুন।
          </p>
        </div>

        {/* New Scan Action Button & Dropdown Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowNewScanMenu(!showNewScanMenu)}
            className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 shadow-xl ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{isBn ? 'নতুন স্ক্যান করুন' : '+ New Scan'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showNewScanMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showNewScanMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-40 ${
                  isLight ? 'bg-white border-gray-200' : 'bg-[#0F1714] border-[#1B2923]'
                }`}
              >
                <Link
                  to="/app/rumor"
                  onClick={() => setShowNewScanMenu(false)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-colors ${
                    isLight ? 'hover:bg-blue-50 text-gray-800' : 'hover:bg-slate-800 text-gray-200'
                  }`}
                >
                  <SearchCheck className="w-4 h-4 text-blue-500" />
                  <span>🔎 Rumor / Claim Scanner</span>
                </Link>
                <Link
                  to="/app/scam"
                  onClick={() => setShowNewScanMenu(false)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-colors ${
                    isLight ? 'hover:bg-red-50 text-gray-800' : 'hover:bg-slate-800 text-gray-200'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>⚠ Scam Alert Inspector</span>
                </Link>
                <Link
                  to="/app/image"
                  onClick={() => setShowNewScanMenu(false)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-colors ${
                    isLight ? 'hover:bg-purple-50 text-gray-800' : 'hover:bg-slate-800 text-gray-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span>🖼 Image Check Forensics</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── 4. SUMMARY STATISTICS CARDS (4 COMPACT CARDS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Scans */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className={`p-5 rounded-3xl border space-y-2 shadow-xl ${
            isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">Total Scans</span>
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600">
              <Layers3 className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl md:text-4xl font-black font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {counts.total}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            +6 scans this week
          </p>
        </motion.div>

        {/* Claims */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`p-5 rounded-3xl border space-y-2 shadow-xl ${
            isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">Claims</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <SearchCheck className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl md:text-4xl font-black font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {counts.rumor}
          </div>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
            Rumor Scanner Module
          </p>
        </motion.div>

        {/* Scam Checks */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`p-5 rounded-3xl border space-y-2 shadow-xl ${
            isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">Scam Checks</span>
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl md:text-4xl font-black font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {counts.scam}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold">
            Scam Alert Module
          </p>
        </motion.div>

        {/* Image Checks */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className={`p-5 rounded-3xl border space-y-2 shadow-xl ${
            isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">Image Checks</span>
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl md:text-4xl font-black font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {counts.image}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
            Image Forensics Module
          </p>
        </motion.div>

      </div>

      {/* ── 7. SEARCH & FILTER CONTROL BAR ── */}
      <div className="space-y-4">
        <div className={`p-4 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${
          isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
        }`}>
          
          {/* Search Input (50-60% width) */}
          <div className="relative w-full md:w-7/12">
            <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by claim, message, filename, or scan ID..."
              className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs font-mono border outline-none transition-all ${
                isLight
                  ? 'bg-[#F8FAFC] border-gray-200 text-gray-900 focus:border-blue-500'
                  : 'bg-[#080C0B] border-[#1B2923] text-white focus:border-blue-500'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter, Sort & View Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* View Mode Toggle (List vs Timeline) */}
            <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-mono font-bold ${
              isLight ? 'bg-gray-100 border-gray-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'timeline'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                showFilterPanel || selectedType !== 'ALL' || selectedResult !== 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isLight
                  ? 'bg-[#F8FAFC] border-gray-200 text-gray-700 hover:bg-gray-100'
                  : 'bg-[#080C0B] border-[#1B2923] text-gray-300 hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* Sort Menu */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest')}
              className={`px-3 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none cursor-pointer ${
                isLight
                  ? 'bg-[#F8FAFC] border-gray-200 text-gray-800'
                  : 'bg-[#080C0B] border-[#1B2923] text-gray-200'
              }`}
            >
              <option value="recent">Sort: Recent</option>
              <option value="oldest">Sort: Oldest</option>
            </select>
          </div>

        </div>

        {/* ── 8. SLIDE-DOWN FILTER PANEL ── */}
        <AnimatePresence>
          {showFilterPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-6 rounded-3xl border space-y-6 shadow-xl overflow-hidden ${
                isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-mono font-black uppercase text-blue-600 tracking-wider">
                  FILTER SCANS BY MODULE & RESULT
                </h4>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
                
                {/* Filter 1: Module Type */}
                <div className="space-y-2">
                  <span className="text-gray-400 font-bold uppercase block">SCAN TYPE</span>
                  {['ALL', 'RUMOR', 'SCAM', 'IMAGE'].map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="typeFilter"
                        checked={selectedType === t}
                        onChange={() => setSelectedType(t)}
                        className="text-blue-600"
                      />
                      <span>{t === 'ALL' ? 'All Types' : t === 'RUMOR' ? 'Rumor Scanner' : t === 'SCAM' ? 'Scam Alert' : 'Image Check'}</span>
                    </label>
                  ))}
                </div>

                {/* Filter 2: Result Outcome */}
                <div className="space-y-2">
                  <span className="text-gray-400 font-bold uppercase block">RESULT CATEGORY</span>
                  {['ALL', 'SUPPORTED', 'UNVERIFIED', 'HIGH_RISK', 'POSSIBLE_MANIPULATION', 'LIKELY_AUTHENTIC'].map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="resultFilter"
                        checked={selectedResult === r}
                        onChange={() => setSelectedResult(r)}
                        className="text-blue-600"
                      />
                      <span>{r.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>

                {/* Filter 3: Date */}
                <div className="space-y-2">
                  <span className="text-gray-400 font-bold uppercase block">TIMEFRAME</span>
                  {['ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH'].map((d) => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="dateFilter"
                        checked={selectedDate === d}
                        onChange={() => setSelectedDate(d)}
                        className="text-blue-600"
                      />
                      <span>{d.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-gray-500 hover:text-gray-900"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="px-6 py-2 rounded-xl text-xs font-mono font-black bg-blue-600 text-white shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 10. ACTIVE FILTER CHIPS ── */}
        {(selectedType !== 'ALL' || selectedResult !== 'ALL' || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
            {selectedType !== 'ALL' && (
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1.5 font-bold">
                Type: {selectedType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType('ALL')} />
              </span>
            )}
            {selectedResult !== 'ALL' && (
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1.5 font-bold">
                Result: {selectedResult}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedResult('ALL')} />
              </span>
            )}
            {searchTerm && (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 flex items-center gap-1.5 font-bold">
                Search: "{searchTerm}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-blue-600 hover:underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── 12. HISTORY LIST (LIST VIEW VS TIMELINE VIEW) ── */}
      {viewMode === 'list' ? (
        <div className={`rounded-3xl border shadow-xl overflow-hidden ${
          isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
        }`}>
          {/* Table Header (Desktop) */}
          <div className={`hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-mono font-bold uppercase border-b ${
            isLight ? 'bg-[#F8FAFC] border-gray-200 text-gray-500' : 'bg-[#080C0B] border-[#1B2923] text-gray-400'
          }`}>
            <div className="col-span-5">SCAN PAYLOAD</div>
            <div className="col-span-2">TYPE</div>
            <div className="col-span-3">RESULT</div>
            <div className="col-span-2 text-right">TIMESTAMP</div>
          </div>

          {/* Table Rows */}
          {filteredHistory.length === 0 ? (
            /* 30. NO SEARCH RESULTS STATE */
            <div className="py-16 px-6 text-center space-y-4">
              <SearchCheck className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="space-y-1">
                <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  No matching scans found
                </h3>
                <p className="text-xs font-mono text-gray-500">
                  We couldn't find a scan record matching "{searchTerm}".
                </p>
              </div>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shadow-md"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredHistory.map((item, idx) => {
                const badge = getResultBadgeProps(item.result);
                const route = getScanTargetRoute(item);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    onClick={() => navigate(route)}
                    className={`p-4 md:p-6 cursor-pointer transition-all flex flex-col md:grid md:grid-cols-12 gap-4 items-center group hover:translate-x-1 ${
                      isLight ? 'hover:bg-[#F8FAFC]' : 'hover:bg-[#14211B]'
                    }`}
                  >
                    {/* Col 1: Scan Title & Payload */}
                    <div className="col-span-5 flex items-center gap-3 w-full min-w-0">
                      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                        {getScanTypeIcon(item.type)}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {item.title}
                          </h4>
                        </div>
                        {item.titleBn && (
                          <p className="text-xs text-gray-500 truncate font-sans">
                            {item.titleBn}
                          </p>
                        )}
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {item.id} • {item.inputType}
                        </span>
                      </div>
                    </div>

                    {/* Col 2: Module Type Pill */}
                    <div className="col-span-2 w-full md:w-auto">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${
                        item.type === 'RUMOR'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                          : item.type === 'SCAM'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    {/* Col 3: Result Badge */}
                    <div className="col-span-3 w-full md:w-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Col 4: Time & Action Menu */}
                    <div className="col-span-2 flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                      <span className="text-xs font-mono text-gray-500">
                        {item.createdAt}
                      </span>

                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`absolute right-0 top-full mt-1 w-44 rounded-2xl border shadow-2xl p-2 z-30 ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#0F172A] border-slate-700'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(route);
                                }}
                                className="w-full text-left p-2 text-xs font-mono font-bold hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-blue-500" /> Open Scan
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  triggerToast('Result saved to Vault');
                                }}
                                className="w-full text-left p-2 text-xs font-mono font-bold hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-purple-500" /> Save Result
                              </button>
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="w-full text-left p-2 text-xs font-mono font-bold hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Scan
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── 27. TIMELINE MODE VIEW ── */
        <div className={`p-8 rounded-3xl border space-y-8 shadow-xl ${
          isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#0F1714] border-[#1B2923]'
        }`}>
          <h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Chronological Audit Activity Timeline
          </h3>

          <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-500/30">
            {filteredHistory.map((item) => {
              const badge = getResultBadgeProps(item.result);
              const route = getScanTargetRoute(item);

              return (
                <div key={item.id} className="relative flex items-start gap-6 pl-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 relative z-10 shadow-md">
                    ●
                  </div>
                  <div
                    onClick={() => navigate(route)}
                    className={`flex-1 p-5 rounded-2xl border cursor-pointer transition-all hover:translate-x-1 ${
                      isLight ? 'bg-[#F8FAFC] border-gray-200 hover:bg-blue-50/40' : 'bg-[#080C0B] border-[#1B2923] hover:bg-[#14211B]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-blue-600 block">
                          {item.timestamp} • {item.id}
                        </span>
                        <h4 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border w-fit ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 32. PAGINATION CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-mono">
        <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>
          Showing 1–{filteredHistory.length} of 24 scans
        </span>

        <div className="flex items-center gap-2">
          <button className={`px-3 py-1.5 rounded-lg border font-bold ${
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-slate-900 border-slate-800 text-gray-300'
          }`}>
            ← Prev
          </button>
          <button className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow-md">
            1
          </button>
          <button className={`px-3.5 py-1.5 rounded-lg border font-bold ${
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-slate-900 border-slate-800 text-gray-300'
          }`}>
            2
          </button>
          <button className={`px-3.5 py-1.5 rounded-lg border font-bold ${
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-slate-900 border-slate-800 text-gray-300'
          }`}>
            3
          </button>
          <button className={`px-3 py-1.5 rounded-lg border font-bold ${
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-slate-900 border-slate-800 text-gray-300'
          }`}>
            Next →
          </button>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-mono font-bold"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default History;
