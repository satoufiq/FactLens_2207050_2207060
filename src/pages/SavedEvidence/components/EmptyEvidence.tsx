import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, ScanSearch } from 'lucide-react';

interface EmptyEvidenceProps {
  isBn?: boolean;
}

export const EmptyEvidence: React.FC<EmptyEvidenceProps> = ({ isBn }) => {
  return (
    <div className="py-16 md:py-24 text-center max-w-md mx-auto space-y-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-sm"
      >
        <Bookmark className="w-8 h-8" />
      </motion.div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-2"
      >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {isBn ? 'এখনো কোনো প্রমাণ সংরক্ষণ করা হয়নি' : 'No saved evidence yet'}
        </h3>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {isBn
            ? 'ফ্যাক্টলেন্স স্ক্যান বিশ্লেষণের সময় প্রয়োজনীয় প্রমাণ, টেকনিক্যাল সংকেত বা তথ্য স্টার ক্লিক করে আপনার লাইব্রেরিতে সংরক্ষণ করুন।'
            : 'Save useful evidence, suspicious signals, or image-analysis findings while reviewing your FactLens scans.'}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Link
          to="/app/history"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <ScanSearch className="w-4 h-4" />
          <span>{isBn ? 'স্ক্যান হিস্ট্রি দেখুন' : 'View Scan History'}</span>
        </Link>
      </motion.div>
    </div>
  );
};
