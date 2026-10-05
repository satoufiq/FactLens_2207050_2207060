import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  isBn?: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  isBn
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'অ্যাকাউন্ট ডিলিট করতে চান?' : 'Delete your account?'}
                </h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isBn
                    ? 'এই ক্রিয়াটি স্থায়ী। আপনার ফ্যাক্টলেন্স অ্যাকাউন্ট এবং সংরক্ষিত সমস্ত ডাটা সম্পূর্ণরূপে মুছে যাবে এবং আর কখনো উদ্ধার করা যাবে না।'
                    : 'This action cannot be undone. Your account information and saved items may be permanently removed.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={onConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md shadow-red-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBn ? 'অ্যাকাউন্ট ডিলিট করুন' : 'Delete Account'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
