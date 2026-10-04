import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';
import type { ResultStatus, ScanType } from '../../../data/scanDetailsMockData';

interface AnalysisSummaryProps {
  scanType: ScanType;
  inputType: string;
  language: string;
  status: string;
  result: ResultStatus;
  isBn?: boolean;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  scanType,
  inputType,
  language,
  status,
  result,
  isBn
}) => {
  const getAssessmentBadge = () => {
    switch (result) {
      case 'SUPPORTED':
        return { label: isBn ? 'সত্যতা প্রমাণিত' : 'Supported', bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200' };
      case 'CONTRADICTED':
        return { label: isBn ? 'ভুয়া প্রমাণিত' : 'Contradicted', bg: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200' };
      case 'HIGH_RISK':
        return { label: isBn ? 'উচ্চ ঝুঁকিপূর্ণ' : 'High Risk', bg: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200' };
      case 'POSSIBLE_MANIPULATION':
        return { label: isBn ? 'বিকৃতি ইঙ্গিত' : 'Possible Manipulation', bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200' };
      case 'UNVERIFIED':
      default:
        return { label: isBn ? 'অসমর্থিত' : 'Unverified', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200' };
    }
  };

  const assessment = getAssessmentBadge();

  const rows = [
    {
      icon: Search,
      label: isBn ? 'বিশ্লেষণের ধরন' : 'Analysis Type',
      value: scanType === 'RUMOR' ? (isBn ? 'গুজব / দাবি যাচাই' : 'Rumor / Claim Verification') : scanType === 'SCAM' ? (isBn ? 'স্ক্যাম / ঝুঁকি চিহ্নিতকরণ' : 'Scam Alert Assessment') : (isBn ? 'ছবি বিকৃতি ফোরেনসিক্স' : 'Image Forensics')
    },
    {
      icon: Layers,
      label: isBn ? 'ইনপুট মোড' : 'Input Format',
      value: inputType
    },
    {
      icon: Globe,
      label: isBn ? 'চিহ্নিত ভাষা' : 'Language',
      value: language
    },
    {
      icon: CheckCircle2,
      label: isBn ? 'প্রসেসিং স্ট্যাটাস' : 'Processing',
      value: status
    },
    {
      icon: ShieldCheck,
      label: isBn ? 'চূড়ান্ত মূল্যায়ন' : 'Assessment',
      badge: assessment
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'বিশ্লেষণ সামারি' : 'ANALYSIS SUMMARY'}
        </h3>
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, idx) => {
          const IconComponent = row.icon;
          return (
            <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 font-medium">
                <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{row.label}</span>
              </div>
              <div>
                {row.badge ? (
                  <span className={`px-2.5 py-1 rounded-md border text-xs font-bold ${row.badge.bg}`}>
                    {row.badge.label}
                  </span>
                ) : (
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {row.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
