import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  scanId: string;
  isBn?: boolean;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  scanId,
  isBn
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'স্ক্যান রেকর্ড মুছে ফেলার নিশ্চিতকরণ' : 'Delete Scan Record?'}
                </h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isBn
                    ? `আপনি কি নিশ্চিত যে আপনি ${scanId} স্ক্যান রেকর্ডটি মুছে ফেলতে চান? এই ক্রিয়াটি রিকভার করা সম্ভব নয়।`
                    : `Are you sure you want to delete scan record ${scanId}? This action cannot be undone.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={onConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md shadow-red-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBn ? 'ডিলিট করুন' : 'Delete Scan'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
