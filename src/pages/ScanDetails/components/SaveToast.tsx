import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SaveToastProps {
  message: string | null;
}

export const SaveToast: React.FC<SaveToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-slate-200 text-xs md:text-sm font-semibold"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
