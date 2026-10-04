import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Gift, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import type { RiskIndicatorItem } from '../../../data/scanDetailsMockData';

interface RiskIndicatorsProps {
  indicators: RiskIndicatorItem[];
  isBn?: boolean;
}

export const RiskIndicators: React.FC<RiskIndicatorsProps> = ({
  indicators,
  isBn
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gift': return Gift;
      case 'CreditCard': return CreditCard;
      case 'Clock': return Clock;
      default: return AlertTriangle;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200/80 dark:border-red-900/50 p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-red-100 dark:border-red-900/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <ShieldAlert className="w-4 h-4" />
            <span>{isBn ? 'ঝুঁকি নির্দেশকসমূহ' : 'RISK INDICATORS DETECTED'}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {indicators.length} {isBn ? 'টি জালিয়াতির আলামত শনাক্ত হয়েছে' : 'Risk indicators detected in this message'}
          </h3>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {isBn ? 'স্বয়ংক্রিয় স্ক্যাম প্যাটার্ন ম্যাচিং দ্বারা প্রমানিত ফিশিং সূচকগুলো।' : 'Specific patterns identified by FactLens threat intelligence engine.'}
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-full bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300">
          HIGH RISK SCORE: 94%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ind, idx) => {
          const IconComp = getIcon(ind.iconName);
          return (
            <motion.div
              key={ind.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * idx }}
              className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                <IconComp className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {ind.title}
                  </h4>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-600 text-white">
                    {ind.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ind.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
