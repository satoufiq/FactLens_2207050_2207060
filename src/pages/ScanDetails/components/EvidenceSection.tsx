import React from 'react';
import { motion } from 'framer-motion';
import { SearchCheck } from 'lucide-react';
import { EvidenceCard } from './EvidenceCard';
import { EvidenceComparison } from './EvidenceComparison';
import type { EvidenceItem, ResultStatus } from '../../../data/scanDetailsMockData';

interface EvidenceSectionProps {
  evidenceList: EvidenceItem[];
  result: ResultStatus;
  isBn?: boolean;
}

export const EvidenceSection: React.FC<EvidenceSectionProps> = ({
  evidenceList,
  result,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.45 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <SearchCheck className="w-4 h-4" />
            <span>{isBn ? 'প্রমাণ তথ্য ভাণ্ডার' : 'EVIDENCE REVIEWED'}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isBn ? 'পর্যালোচিত তথ্য ও উৎসসমূহ' : 'Evidence reviewed & verified'}
          </h3>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {isBn ? 'মূল্যায়ন চলাকালীন প্রাপ্ত এবং অনুসন্ধান করা বিভিন্ন ডিজিটাল উৎস।' : 'Sources retrieved and considered during the automated assessment.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>{evidenceList.length} {isBn ? 'টি উৎস পর্যালোচিত' : 'sources reviewed'}</span>
        </div>
      </div>

      {/* Comparison Flowchart Diagram */}
      <EvidenceComparison evidenceList={evidenceList} result={result} isBn={isBn} />

      {/* Source Cards Grid */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'উৎস তালিকা বিস্তারিত' : 'DETAILED SOURCE CARDS'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceList.map((item, idx) => (
            <EvidenceCard key={item.id} evidence={item} index={idx} isBn={isBn} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
