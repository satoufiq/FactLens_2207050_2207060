import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { FilterState } from './FilterPanel';

interface ActiveFilterChipsProps {
  filters: FilterState;
  activeCollection?: string | null;
  onRemoveType: () => void;
  onRemoveRelationship: () => void;
  onRemoveDate: () => void;
  onRemoveCollection: () => void;
  onClearAll: () => void;
  isBn?: boolean;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  activeCollection,
  onRemoveType,
  onRemoveRelationship,
  onRemoveDate,
  onRemoveCollection,
  onClearAll,
  isBn
}) => {
  const chips = [];

  if (activeCollection) {
    chips.push({
      id: 'collection',
      label: `Folder: ${activeCollection}`,
      onRemove: onRemoveCollection
    });
  }

  if (filters.type !== 'ALL') {
    chips.push({
      id: 'type',
      label: filters.type.replace('_', ' '),
      onRemove: onRemoveType
    });
  }

  if (filters.relationship !== 'ALL') {
    chips.push({
      id: 'relationship',
      label: filters.relationship,
      onRemove: onRemoveRelationship
    });
  }

  if (filters.dateRange !== 'ALL') {
    chips.push({
      id: 'dateRange',
      label: filters.dateRange.replace('_', ' '),
      onRemove: onRemoveDate
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-medium">
      <span className="text-slate-400 font-semibold">{isBn ? 'সক্রিয় ফিল্টারসমূহ:' : 'Filters:'}</span>
      <AnimatePresence>
        {chips.map((chip) => (
          <motion.span
            key={chip.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold"
          >
            <span>{chip.label}</span>
            <button
              onClick={chip.onRemove}
              className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
              aria-label="Remove Filter"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      <button
        onClick={onClearAll}
        className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline pl-1"
      >
        {isBn ? 'সব ফিল্টার রিমুভ করুন' : 'Clear all'}
      </button>
    </div>
  );
};
