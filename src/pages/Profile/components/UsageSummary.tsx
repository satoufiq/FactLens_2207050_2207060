import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, CheckCircle2, AlertTriangle, HelpCircle, Bookmark } from 'lucide-react';
import type { UserProfileData } from '../../../data/profileMockData';

interface UsageSummaryProps {
  usage: UserProfileData['usage'];
  savedCount: number;
  isBn?: boolean;
}

export const UsageSummary: React.FC<UsageSummaryProps> = ({
  usage,
  savedCount,
  isBn
}) => {
  const completedPct = Math.round((usage.completed / usage.total) * 100);
  const partialPct = Math.round((usage.partial / usage.total) * 100);
  const unablePct = Math.round((usage.unableToAnalyze / usage.total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.35 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'আপনার ব্যবহার সামারি' : 'YOUR USAGE'}
          </h3>
        </div>
        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
          {usage.total} {isBn ? 'মোট স্ক্যান' : 'Total Scans'}
        </span>
      </div>

      {/* Usage Progress Bars (Section 19) */}
      <div className="space-y-4 text-xs">
        {/* Completed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {isBn ? 'সম্পন্ন (Completed)' : 'Completed'}
            </span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {usage.completed} ({completedPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completedPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>

        {/* Partial */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {isBn ? 'আংশিক (Partial)' : 'Partial'}
            </span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {usage.partial} ({partialPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${partialPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="h-full bg-amber-500 rounded-full"
            />
          </div>
        </div>

        {/* Unable to Analyze */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'বিশ্লেষণ অসমর্থ (Unable to Analyze)' : 'Unable to Analyze'}
            </span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {usage.unableToAnalyze} ({unablePct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${unablePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-slate-400 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Saved Evidence Count Pill */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {isBn ? 'সংরক্ষিত প্রমাণ উপাদান' : 'Saved Evidence Items'}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60">
          {savedCount} {isBn ? 'টি আইটেম' : 'items'}
        </span>
      </div>
    </motion.div>
  );
};
