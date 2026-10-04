import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Building2, Newspaper, Shield, ArrowRight } from 'lucide-react';
import { EvidenceRelationship } from './EvidenceRelationship';
import type { EvidenceItem } from '../../../data/scanDetailsMockData';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  index: number;
  isBn?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  index,
  isBn
}) => {
  const getSourceIcon = (sourceType: string) => {
    if (sourceType.toLowerCase().includes('government') || sourceType.toLowerCase().includes('institutional')) {
      return Building2;
    }
    if (sourceType.toLowerCase().includes('news')) {
      return Newspaper;
    }
    if (sourceType.toLowerCase().includes('official')) {
      return Shield;
    }
    return Globe;
  };

  const IconComponent = getSourceIcon(evidence.sourceType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 * index }}
      whileHover={{ y: -3 }}
      className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between gap-4"
    >
      <div className="space-y-3">
        {/* Source Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {evidence.sourceType}
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
              {evidence.title}
            </h4>
          </div>
        </div>

        {/* Source Summary Description */}
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
          {evidence.summary}
        </p>
      </div>

      {/* Footer Row: Badge & Link */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <EvidenceRelationship relationship={evidence.relationship} isBn={isBn} />

        <button
          onClick={() => {
            if (evidence.domain) {
              window.open(`https://${evidence.domain}`, '_blank');
            }
          }}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
        >
          <span>{isBn ? 'উৎস দেখুন' : 'View Source'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
