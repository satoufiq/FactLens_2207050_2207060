import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, X } from 'lucide-react';

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCollection: (name: string) => void;
  isBn?: boolean;
}

export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreateCollection,
  isBn
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateCollection(name.trim());
    setName('');
    onClose();
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
                  {isBn ? 'নতুন কালেকশন ফোল্ডার তৈরি করুন' : 'Create New Collection'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {isBn ? 'ফোল্ডারের নাম' : 'Collection Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? 'যেমন: সাইবার সিকিউরিটি ফোরেনসিক্স' : 'e.g., Cyber Threat Analysis'}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isBn ? 'তৈরি করুন' : 'Create Collection'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
