import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

export interface FilterState {
  type: string;
  relationship: string;
  dateRange: string;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  isBn?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  isBn
}) => {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-14 z-40 w-full sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-5 text-xs md:text-sm font-medium"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <SlidersHorizontal className="w-4 h-4" />
                <span>{isBn ? 'ফিল্টার অপশন' : 'FILTER EVIDENCE'}</span>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                {isBn ? 'প্রমাণের ধরন (Type)' : 'Evidence Type'}
              </span>
              <div className="space-y-1.5">
                {[
                  { id: 'ALL', label: isBn ? 'সকল ধরন' : 'All Types' },
                  { id: 'CLAIM_EVIDENCE', label: isBn ? 'দাবির প্রমাণ (Claim Evidence)' : 'Claim Evidence' },
                  { id: 'SCAM_SIGNAL', label: isBn ? 'স্ক্যাম সংকেত (Scam Signal)' : 'Scam Signal' },
                  { id: 'IMAGE_SIGNAL', label: isBn ? 'ছবি বিশ্লেষণ (Image Analysis)' : 'Image Analysis' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600">
                    <input
                      type="radio"
                      name="filterType"
                      checked={localFilters.type === item.id}
                      onChange={() => setLocalFilters({ ...localFilters, type: item.id })}
                      className="accent-blue-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Relationship Filter */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                {isBn ? 'সম্পর্ক (Relationship)' : 'Relationship Status'}
              </span>
              <div className="space-y-1.5">
                {[
                  { id: 'ALL', label: isBn ? 'সকল সম্পর্ক' : 'All Relationships' },
                  { id: 'SUPPORTING', label: isBn ? '✓ সমর্থনকারী (Supporting)' : '✓ Supporting' },
                  { id: 'CONTRADICTING', label: isBn ? '× খণ্ডনকারী (Contradicting)' : '× Contradicting' },
                  { id: 'INSUFFICIENT', label: isBn ? '○ অপর্যাপ্ত (Insufficient)' : '○ Insufficient' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600">
                    <input
                      type="radio"
                      name="filterRelationship"
                      checked={localFilters.relationship === item.id}
                      onChange={() => setLocalFilters({ ...localFilters, relationship: item.id })}
                      className="accent-blue-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Saved Filter */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                {isBn ? 'সংরক্ষণের সময় (Date Saved)' : 'Date Saved'}
              </span>
              <div className="space-y-1.5">
                {[
                  { id: 'ALL', label: isBn ? 'যেকোনো সময়' : 'Anytime' },
                  { id: 'TODAY', label: isBn ? 'আজ (Today)' : 'Today' },
                  { id: 'THIS_WEEK', label: isBn ? 'এই সপ্তাহে (This week)' : 'This week' },
                  { id: 'THIS_MONTH', label: isBn ? 'এই মাসে (This month)' : 'This month' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600">
                    <input
                      type="radio"
                      name="filterDate"
                      checked={localFilters.dateRange === item.id}
                      onChange={() => setLocalFilters({ ...localFilters, dateRange: item.id })}
                      className="accent-blue-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBn ? 'রিসেট' : 'Clear'}</span>
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                {isBn ? 'প্রয়োগ করুন' : 'Apply Filter'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
