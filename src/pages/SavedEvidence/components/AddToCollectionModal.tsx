import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Check, X, Plus } from 'lucide-react';
import type { SavedEvidenceItem, CollectionItem } from '../../../data/savedEvidenceMockData';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: SavedEvidenceItem | null;
  collections: CollectionItem[];
  onAssignCollection: (evidenceId: string, collectionName: string) => void;
  onOpenCreateCollection: () => void;
  isBn?: boolean;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  evidence,
  collections,
  onAssignCollection,
  onOpenCreateCollection,
  isBn
}) => {
  const [selectedCol, setSelectedCol] = useState<string>(evidence?.collection || '');

  React.useEffect(() => {
    if (evidence) {
      setSelectedCol(evidence.collection);
    }
  }, [evidence]);

  if (!evidence) return null;

  const handleSave = () => {
    if (selectedCol) {
      onAssignCollection(evidence.id, selectedCol);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'কালেকশন ফোল্ডারে যোগ করুন' : 'Add to Collection'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? `'${evidence.title}' প্রমাণটির জন্য ফোল্ডার সিলেক্ট করুন:`
                : `Select a collection folder for '${evidence.title}':`}
            </p>

            <div className="space-y-2">
              {collections.map((col) => (
                <label
                  key={col.id}
                  onClick={() => setSelectedCol(col.name)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCol === col.name
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="text-xs md:text-sm">{isBn && col.nameBn ? col.nameBn : col.name}</span>
                  {selectedCol === col.name && <Check className="w-4 h-4 text-blue-600" />}
                </label>
              ))}
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenCreateCollection();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '＋ নতুন কালেকশন তৈরি করুন' : '＋ Create new collection'}</span>
            </button>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                {isBn ? 'সংরক্ষণ করুন' : 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
