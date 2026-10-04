import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Layers } from 'lucide-react';
import { CollectionCard } from './CollectionCard';
import { NewCollectionModal } from './NewCollectionModal';
import type { CollectionItem } from '../../../data/savedEvidenceMockData';

interface CollectionsSectionProps {
  collections: CollectionItem[];
  activeCollection: string | null;
  onSelectCollection: (name: string | null) => void;
  onCreateCollection: (name: string) => void;
  isBn?: boolean;
}

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  collections,
  activeCollection,
  onSelectCollection,
  onCreateCollection,
  isBn
}) => {
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{isBn ? 'আপনার প্রমাণ কালেকশন ফোল্ডারসমূহ' : 'Your Collections'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn ? 'বিষয়বস্তু অনুযায়ী আপনার সংরক্ষিত তথ্য সংগঠিত করুন।' : 'Organize saved information by topic or investigation group.'}
          </p>
        </div>

        {activeCollection && (
          <button
            onClick={() => onSelectCollection(null)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isBn ? 'সব ফোল্ডার দেখুন' : 'Show All Folders'}
          </button>
        )}
      </div>

      {/* Responsive Cards Layout (Horizontal Scroll on Mobile, Grid Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-1">
        {collections.map((col) => (
          <CollectionCard
            key={col.id}
            collection={col}
            isSelected={activeCollection === col.name}
            onSelect={() =>
              onSelectCollection(activeCollection === col.name ? null : col.name)
            }
            isBn={isBn}
          />
        ))}

        {/* New Collection Button Card */}
        <motion.button
          onClick={() => setShowNewModal(true)}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-[18px] border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all duration-200 flex flex-col justify-between min-w-[200px] group"
        >
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors w-fit">
            <Plus className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 pt-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {isBn ? '＋ নতুন কালেকশন' : '＋ New Collection'}
            </h4>
            <span className="text-xs text-slate-400 block font-medium">
              {isBn ? 'নতুন বিষয়ভিত্তিক ফোল্ডার' : 'Create topic folder'}
            </span>
          </div>
        </motion.button>
      </div>

      <NewCollectionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreateCollection={onCreateCollection}
        isBn={isBn}
      />
    </motion.div>
  );
};
