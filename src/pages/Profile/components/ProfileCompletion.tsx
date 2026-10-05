import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles } from 'lucide-react';

interface ProfileCompletionProps {
  completenessPct: number;
  onOpenUpload: () => void;
  isBn?: boolean;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  completenessPct,
  onOpenUpload,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
    >
      <div className="space-y-1.5 flex-1 max-w-lg">
        <div className="flex items-center justify-between font-bold">
          <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {isBn ? 'প্রোফাইল সম্পূর্ণতা' : 'Profile completeness'}
          </span>
          <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
            {completenessPct}%
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${completenessPct}%` }}
          />
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
          {isBn
            ? 'প্রোফাইল ছবি যোগ করে আপনার অ্যাকাউন্ট সম্পূর্ণ করুন।'
            : 'Add a profile photo to complete your account profile.'}
        </p>
      </div>

      <button
        onClick={onOpenUpload}
        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
      >
        <Camera className="w-3.5 h-3.5 text-blue-600" />
        <span>{isBn ? 'ছবি যোগ করুন' : 'Add Photo'}</span>
      </button>
    </motion.div>
  );
};
