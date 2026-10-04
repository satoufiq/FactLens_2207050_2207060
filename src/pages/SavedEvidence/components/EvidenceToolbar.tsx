import React from 'react';
import { SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { EvidenceSearch } from './EvidenceSearch';
import { SortMenu, type SortOption } from './SortMenu';

interface EvidenceToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleFilterPanel: () => void;
  isFilterActive: boolean;
  sortBy: SortOption;
  onSortChange: (opt: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  isBn?: boolean;
}

export const EvidenceToolbar: React.FC<EvidenceToolbarProps> = ({
  searchTerm,
  onSearchChange,
  onToggleFilterPanel,
  isFilterActive,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  isBn
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Bar */}
      <EvidenceSearch
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        isBn={isBn}
      />

      {/* Action Controls: Filter, Sort, View Mode */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleFilterPanel}
          className={`h-12 px-4 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
            isFilterActive
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isBn ? 'ফিল্টার' : 'Filter'}</span>
          {isFilterActive && <span className="w-2 h-2 rounded-full bg-blue-600" />}
        </button>

        <SortMenu
          sortBy={sortBy}
          onSortChange={onSortChange}
          isBn={isBn}
        />

        {/* View Switcher: Grid / List */}
        <div className="h-12 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
