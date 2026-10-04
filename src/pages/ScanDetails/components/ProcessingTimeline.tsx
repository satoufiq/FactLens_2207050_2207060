import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { ProcessingStep } from './ProcessingStep';
import type { TimelineStepItem } from '../../../data/scanDetailsMockData';

interface ProcessingTimelineProps {
  steps: TimelineStepItem[];
  isBn?: boolean;
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({
  steps,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          <Activity className="w-4 h-4" />
          <span>{isBn ? 'বিশ্লেষণ টাইমলাইন' : 'PROCESSING TIMELINE'}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {isBn ? 'স্ক্যানটি কীভাবে প্রসেস করা হয়েছে' : 'How this scan was processed'}
        </h3>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {isBn ? 'ফ্যাক্টলেন্স ইঞ্জিন দ্বারা বাস্তবায়িত প্রসেসিং ধাপগুলোর রেকর্ডেড টাইমলাইন।' : 'A simplified record of the main analysis stages.'}
        </p>
      </div>

      {/* Timeline List with Animated Connecting Vertical Line */}
      <div className="relative pl-1 pt-2">
        {/* Animated Connecting Vertical Line */}
        <motion.div
          initial={{ height: '0%' }}
          animate={{ height: '90%' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="absolute left-4 top-5 w-0.5 bg-gradient-to-b from-blue-500 via-emerald-500 to-slate-200 dark:to-slate-800 z-0"
        />

        <div className="space-y-2 relative z-10">
          {steps.map((step, idx) => (
            <ProcessingStep
              key={step.id || idx}
              step={step}
              index={idx}
              isLast={idx === steps.length - 1}
              isBn={isBn}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
