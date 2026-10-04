import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Check } from 'lucide-react';

export type SortOption = 'recent' | 'oldest' | 'type' | 'scanDate' | 'source';

interface SortMenuProps {
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  isBn?: boolean;
}

export const SortMenu: React.FC<SortMenuProps> = ({
  sortBy,
  onSortChange,
  isBn
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: { id: SortOption; label: string }[] = [
    { id: 'recent', label: isBn ? 'সর্বশেষ সংরক্ষিত (Recently saved)' : 'Recently saved' },
    { id: 'oldest', label: isBn ? 'পুরাতন সংরক্ষিত (Oldest saved)' : 'Oldest saved' },
    { id: 'type', label: isBn ? 'প্রমাণের ধরন (Evidence type)' : 'Evidence type' },
    { id: 'scanDate', label: isBn ? 'স্ক্যানের সময় (Scan date)' : 'Scan date' },
    { id: 'source', label: isBn ? 'উৎস অনুযায়ী (Source)' : 'Source' }
  ];

  const currentLabel = options.find((o) => o.id === sortBy)?.label || 'Sort';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors shadow-sm"
      >
        <ArrowDownUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">{isBn ? 'সাজান:' : 'Sort:'}</span>
        <span className="text-slate-900 dark:text-white font-bold max-w-[120px] truncate">{currentLabel}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-40 py-2 text-xs md:text-sm font-medium"
            >
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {isBn ? 'সাজানোর অপশন' : 'SORT BY'}
              </div>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSortChange(opt.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.id && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
