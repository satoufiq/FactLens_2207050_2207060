import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sliders, CheckCircle2 } from 'lucide-react';

interface AnalysisDetailsProps {
  steps?: { title: string; status: string; detail?: string }[];
  isBn?: boolean;
}

export const AnalysisDetails: React.FC<AnalysisDetailsProps> = ({
  steps = [
    { title: 'Language Detection', status: 'Bengali (BN - 99.8%)', detail: 'Verified unicode standard' },
    { title: 'Claim Extraction', status: 'Completed', detail: 'Parsed main factual assertion' },
    { title: 'Search Query Generation', status: 'Completed', detail: 'Generated 14 boolean search queries' },
    { title: 'External Evidence Search', status: 'Completed', detail: 'Scanned institutional databases' },
    { title: 'Semantic Relevance Analysis', status: 'Completed', detail: 'Cosine relevance distance calculated' },
    { title: 'Claim-Evidence Comparison', status: 'Completed', detail: 'Natural language entailment evaluated' }
  ],
  isBn
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
    >
      {/* Accordion Header Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isBn ? 'বিশ্লেষণের টেকনিক্যাল ধাপসমূহ (Analysis Details)' : 'Analysis Details & Pipeline Controls'}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'প্রসেসিং পাইপলাইনের প্রতিটি সাব-মডিউল দেখতে ক্লিক করুন' : 'Click to toggle internal model pipeline parameters'}
            </span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Accordion Expanded Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {step.status}
                    </span>
                  </div>
                  {step.detail && (
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {step.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
