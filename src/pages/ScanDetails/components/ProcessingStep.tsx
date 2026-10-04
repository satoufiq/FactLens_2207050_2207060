import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react';
import type { TimelineStepItem } from '../../../data/scanDetailsMockData';

interface ProcessingStepProps {
  step: TimelineStepItem;
  index: number;
  isLast: boolean;
  isBn?: boolean;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  step,
  index
}) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'processing':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 z-10 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center shrink-0 z-10">
            <Clock className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.15 * index }}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Step Icon */}
      {getStatusIcon()}

      {/* Step Text Info */}
      <div className="space-y-0.5 pt-0.5 max-w-2xl flex-1">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {step.title}
          </h4>
          <span className="font-mono text-xs text-slate-400 font-medium">
            {step.time}
          </span>
        </div>
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
};
