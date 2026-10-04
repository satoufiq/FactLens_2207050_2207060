import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface TransparencyNoticeProps {
  isBn?: boolean;
}

export const TransparencyNotice: React.FC<TransparencyNoticeProps> = ({ isBn }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.65 }}
      className="bg-[#172554] text-white rounded-2xl p-6 md:p-8 border border-blue-900 shadow-xl relative overflow-hidden space-y-4"
    >
      {/* Subtle Blue Radial Glow Behind Card */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span>{isBn ? 'স্বচ্ছতা ও সীমাবদ্ধতা নির্দেশিকা' : 'UNDERSTANDING THIS RESULT'}</span>
      </div>

      <div className="space-y-2 max-w-3xl relative z-10">
        <p className="text-sm md:text-base text-blue-100 font-medium leading-relaxed">
          {isBn
            ? 'ফ্যাক্টলেন্স উপলব্ধ তথ্যের ভিত্তিতে স্বয়ংক্রিয় মূল্যায়ন প্রদান করে। নতুন তথ্য প্রকাশিত হলে এই ফলাফলের বিশ্লেষণ আপডেটেড হতে পারে।'
            : 'FactLens provides an automated assessment based on currently available verifiable evidence. Results may dynamically update when new authoritative disclosures become available.'}
        </p>

        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-lg bg-blue-900/80 border border-blue-700/60 text-xs font-bold text-blue-200">
            {isBn
              ? 'অসমর্থিত দাবি মানেই মিথ্যা বা ভুয়া তথ্য নয়।'
              : 'An unverified claim is not necessarily false.'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
