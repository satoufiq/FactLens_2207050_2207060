import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Share2 } from 'lucide-react';

interface ResultActionsProps {
  isSaved: boolean;
  onToggleSave: () => void;
  onOpenShare: () => void;
  onCheckAgain: () => void;
  isBn?: boolean;
}

export const ResultActions: React.FC<ResultActionsProps> = ({
  isSaved,
  onToggleSave,
  onOpenShare,
  onCheckAgain,
  isBn
}) => {
  return (
    <>
      {/* Desktop Bottom Action Area */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          to="/app/history"
          className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isBn ? '← স্ক্যান হিস্ট্রিতে ফিরে যান' : 'Back to Scan History'}</span>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={onToggleSave}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs md:text-sm font-semibold transition-all active:scale-95 ${
              isSaved
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? (isBn ? 'সংরক্ষিত' : 'Saved') : (isBn ? 'ফলাফল সংরক্ষণ' : 'Save Result')}</span>
          </button>

          <button
            onClick={onOpenShare}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs md:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95 shadow-sm"
          >
            <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{isBn ? 'শেয়ার' : 'Share'}</span>
          </button>

          <button
            onClick={onCheckAgain}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <span>{isBn ? 'পুনরায় চেক করুন →' : 'Check Again →'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] z-40 flex items-center justify-between gap-2">
        <button
          onClick={onToggleSave}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
          <span>{isSaved ? (isBn ? 'সংরক্ষিত' : 'Saved') : (isBn ? 'সংরক্ষণ' : 'Save')}</span>
        </button>

        <button
          onClick={onOpenShare}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4 text-blue-600" />
          <span>{isBn ? 'শেয়ার' : 'Share'}</span>
        </button>

        <button
          onClick={onCheckAgain}
          className="flex-[1.4] py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
        >
          <span>{isBn ? 'পুনরায় চেক →' : 'Check Again →'}</span>
        </button>
      </div>
    </>
  );
};
