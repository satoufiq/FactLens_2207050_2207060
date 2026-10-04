import React from 'react';
import { Search, X } from 'lucide-react';

interface EvidenceSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isBn?: boolean;
}

export const EvidenceSearch: React.FC<EvidenceSearchProps> = ({
  searchTerm,
  onSearchChange,
  isBn
}) => {
  return (
    <div className="relative flex-1">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        <Search className="w-5 h-5" />
      </div>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={
          isBn
            ? 'সংরক্ষিত প্রমাণ, দাবি, উৎস বা স্ক্যান আইডি দিয়ে খুঁজুন...'
            : 'Search saved evidence, claims, sources, or scan IDs...'
        }
        className="w-full h-12 pl-12 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all shadow-sm font-medium"
      />

      {searchTerm && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Clear Search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
