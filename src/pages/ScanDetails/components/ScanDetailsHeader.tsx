import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Bookmark, BookmarkCheck, MoreVertical, RefreshCw, CheckCircle2, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import type { ScanType } from '../../../data/scanDetailsMockData';

interface ScanDetailsHeaderProps {
  scanId: string;
  title: string;
  titleBn?: string;
  type: ScanType;
  status: string;
  isSaved: boolean;
  onToggleSave: () => void;
  onOpenShare: () => void;
  onCheckAgain: () => void;
  onDeleteScan: () => void;
  onOpenOriginal?: () => void;
  isBn?: boolean;
}

export const ScanDetailsHeader: React.FC<ScanDetailsHeaderProps> = ({
  scanId,
  title,
  titleBn,
  type,
  status,
  isSaved,
  onToggleSave,
  onOpenShare,
  onCheckAgain,
  onDeleteScan,
  onOpenOriginal,
  isBn
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const displayTitle = isBn && titleBn ? titleBn : title;

  const getTypeLabel = () => {
    switch (type) {
      case 'RUMOR': return isBn ? 'গুজব / দাবি পরীক্ষা' : 'Rumor / Claim';
      case 'SCAM': return isBn ? 'জালিয়াতি / স্ক্যাম অ্যালার্ট' : 'Scam / Risk Alert';
      case 'IMAGE': return isBn ? 'ছবি ফোরেনসিক্স' : 'Image Forensics';
      default: return type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/80"
    >
      <div className="space-y-1.5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 text-[11px] font-bold tracking-wider text-blue-700 dark:text-blue-300 uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          {isBn ? 'স্ক্যান রেকর্ড মামলা ফাইল' : 'SCAN RECORD'}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {displayTitle}
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isBn ? 'এই ফ্যাক্টলেন্স স্ক্যানের সম্পূর্ণ বিশ্লেষণ রেকর্ড এবং পর্যালোচনা তালিকা।' : 'Complete analysis record for this FactLens scan.'}
        </p>

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pt-1 font-medium">
          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">
            {scanId}
          </span>
          <span>•</span>
          <span className="text-slate-700 dark:text-slate-300">{getTypeLabel()}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 md:pt-0">
        <button
          onClick={onOpenShare}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm active:scale-95"
        >
          <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isBn ? 'শেয়ার' : 'Share'}</span>
        </button>

        <button
          onClick={onToggleSave}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-xl border transition-all shadow-sm active:scale-95 ${
            isSaved
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
          ) : (
            <Bookmark className="w-4 h-4 text-slate-400" />
          )}
          <span>{isSaved ? (isBn ? 'সংরক্ষিত' : 'Saved') : (isBn ? 'সংরক্ষণ' : 'Save')}</span>
        </button>

        {/* Check Again Primary Action */}
        <button
          onClick={onCheckAgain}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{isBn ? 'পুনরায় চেক করুন' : 'Check Again'}</span>
        </button>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            aria-label="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-1 text-xs md:text-sm font-medium animate-in fade-in zoom-in-95">
                {onOpenOriginal && (
                  <button
                    onClick={() => { setMenuOpen(false); onOpenOriginal(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    {isBn ? 'মূল ইনপুট দেখুন' : 'Open original input'}
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onToggleSave(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4 text-slate-400" />
                  {isSaved ? (isBn ? 'সংরক্ষণ বাতিল' : 'Unsave result') : (isBn ? 'ফলাফল সংরক্ষণ' : 'Save result')}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onOpenShare(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                  {isBn ? 'রিপোর্ট শেয়ার করুন' : 'Share scan report'}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onCheckAgain(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  {isBn ? 'পুনরায় যাচাই' : 'Check again'}
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={() => { setMenuOpen(false); onDeleteScan(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-2 font-semibold"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  {isBn ? 'স্ক্যান ডিলিট করুন' : 'Delete scan record'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
