import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertCircle } from 'lucide-react';
import type { ResultStatus } from '../../../data/scanDetailsMockData';

interface ExplanationCardProps {
  explanation: string;
  explanationBn?: string;
  result: ResultStatus;
  isBn?: boolean;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  explanation,
  explanationBn,
  result,
  isBn
}) => {
  const displayExplanation = isBn && explanationBn ? explanationBn : explanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.5 }}
      className="bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 border-l-4 border-l-blue-600 dark:border-l-blue-500 p-6 md:p-8 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
        <HelpCircle className="w-4 h-4" />
        <span>{isBn ? 'ফলাফলের কারণ' : 'WHY THIS RESULT?'}</span>
      </div>

      <p className="text-base md:text-lg text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
        {displayExplanation}
      </p>

      {/* Prominent Highlighted Note */}
      <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-blue-200 dark:border-blue-800/80 shadow-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm text-slate-800 dark:text-slate-200 space-y-0.5">
          <strong className="font-extrabold text-blue-700 dark:text-blue-300 block text-sm">
            {isBn ? 'গুরুত্বপূর্ণ সতর্কতা নোট:' : 'IMPORTANT FACTLENS NOTE:'}
          </strong>
          <span>
            {result === 'UNVERIFIED'
              ? (isBn ? 'অসমর্থিত মানেই দাবিটি ভুয়া বা ভুল নয়। এর অর্থ হলো ফ্যাক্টলেন্স ইঞ্জিন এই মুহূর্তে কোনো চূড়ান্ত প্রমাণ বা অফিসিয়াল বিজ্ঞপ্তি পায়নি।' : 'Unverified does not necessarily mean false. It simply indicates that no authoritative confirming or contradicting source was indexed at scan time.')
              : (isBn ? 'ফ্যাক্টলেন্স স্বাধীন ডিজিটাল সূত্র বিশ্লেষণের ভিত্তিতে মূল্যায়ন প্রদান করে।' : 'FactLens provides an automated risk analysis derived from current verifiable sources.')
            }
          </span>
        </div>
      </div>
    </motion.div>
  );
};
