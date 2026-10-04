import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface NoSearchResultsProps {
  onClearSearch: () => void;
  isBn?: boolean;
}

export const NoSearchResults: React.FC<NoSearchResultsProps> = ({ onClearSearch, isBn }) => {
  return (
    <div className="py-16 text-center max-w-md mx-auto space-y-5">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
        <Search className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {isBn ? 'কোনো মিল পাওয়া যায়নি' : 'No matching evidence found'}
        </h3>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {isBn
            ? 'অন্য কোনো কিওয়ার্ড দিয়ে খুঁজুন অথবা ফিল্টারসমূহ ক্লিয়ার করুন।'
            : 'Try a different keyword or clear your current active filters.'}
        </p>
      </div>

      <button
        onClick={onClearSearch}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{isBn ? 'ফিল্টার ক্লিয়ার করুন' : 'Clear Search'}</span>
      </button>
    </div>
  );
};
