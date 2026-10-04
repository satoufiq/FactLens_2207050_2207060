import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, Languages } from 'lucide-react';

interface SubmittedContentProps {
  claim: string;
  claimBn?: string;
  inputType: string;
  language: string;
  ocrConfirmed?: boolean;
  isBn?: boolean;
}

export const SubmittedContent: React.FC<SubmittedContentProps> = ({
  claim,
  claimBn,
  inputType,
  language,
  ocrConfirmed = true,
  isBn
}) => {
  const displayClaim = isBn && claimBn ? claimBn : claim;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'জমাদানকৃত বিষয়বস্তু' : 'SUBMITTED CONTENT'}
          </h3>
        </div>
        {ocrConfirmed && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            {isBn ? 'OCR নিশ্চিতকরণ' : 'OCR Confirmed'}
          </span>
        )}
      </div>

      {/* Main Claim Quote with Left Blue Accent Line */}
      <div className="border-l-4 border-blue-600 dark:border-blue-500 pl-4 py-2 bg-slate-50/70 dark:bg-slate-850/50 rounded-r-xl">
        <blockquote className="text-base md:text-lg text-slate-800 dark:text-slate-100 font-medium leading-[1.7] italic">
          "{displayClaim}"
        </blockquote>
      </div>

      {/* Sub-tags */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-1">
        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {inputType}
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
          {language}
        </span>
      </div>
    </motion.div>
  );
};
