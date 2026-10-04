import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ResultIcon } from './ResultIcon';
import { ResultStatistics } from './ResultStatistics';
import type { ResultStatus, ScanType } from '../../../data/scanDetailsMockData';

interface ResultSummaryHeroProps {
  result: ResultStatus;
  scanType: ScanType;
  explanation: string;
  explanationBn?: string;
  statistics?: {
    sourcesReviewed: number;
    supporting: number;
    contradicting: number;
    insufficient: number;
  };
  isBn?: boolean;
}

export const ResultSummaryHero: React.FC<ResultSummaryHeroProps> = ({
  result,
  scanType,
  explanation,
  explanationBn,
  statistics,
  isBn
}) => {
  const getHeaderProps = () => {
    switch (result) {
      case 'SUPPORTED':
      case 'LIKELY_AUTHENTIC':
        return {
          title: isBn ? 'সত্যতা প্রমাণিত' : 'VERIFIED / SUPPORTED',
          badgeText: isBn ? 'সম্পন্ন ✓' : 'COMPLETED ✓',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
          titleColor: 'text-emerald-700 dark:text-emerald-400',
          warningText: isBn ? '✓ সরকারি তথ্য ও বিশ্বস্ত সূত্র অনুযায়ী তথ্যটি নির্ভুল।' : '✓ Verified against official institutional declarations.'
        };
      case 'CONTRADICTED':
        return {
          title: isBn ? 'ভুয়া / খণ্ডিত দাবি' : 'CONTRADICTED / DEBUNKED',
          badgeText: isBn ? 'সম্পন্ন ✓' : 'COMPLETED ✓',
          badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800',
          titleColor: 'text-red-700 dark:text-red-400',
          warningText: isBn ? '⚠ প্রাপ্ত তথ্যের ভিত্তিতে দাবিটি সম্পূর্ণ অসত্য।' : '⚠ Available verified evidence directly contradicts this claim.'
        };
      case 'HIGH_RISK':
        return {
          title: isBn ? 'উচ্চ ঝুঁকিপূর্ণ স্ক্যাম' : 'HIGH RISK DETECTED',
          badgeText: isBn ? 'সতর্কতা ✓' : 'ALERT COMPLETED ✓',
          badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800',
          titleColor: 'text-red-700 dark:text-red-400',
          warningText: isBn ? '🚨 সতর্কতা: কোনো ব্যক্তিগত তথ্য বা টাকা প্রদান করবেন না।' : '🚨 WARNING: Do NOT share credentials, OTPs, or process any payment.'
        };
      case 'POSSIBLE_MANIPULATION':
        return {
          title: isBn ? 'সম্ভাব্য ছবি বিকৃতি' : 'POSSIBLE MANIPULATION',
          badgeText: isBn ? 'সম্পন্ন ✓' : 'COMPLETED ✓',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
          titleColor: 'text-amber-700 dark:text-amber-400',
          warningText: isBn ? '⚠ ছবিতে সফটওয়্যার এডিটিং এবং নয়েজ অসামঞ্জস্য পাওয়া গেছে।' : '⚠ Signals indicate potential photo editing software alterations.'
        };
      case 'UNVERIFIED':
      default:
        return {
          title: isBn ? 'অসমর্থিত (ইউনভারিফাইড)' : 'UNVERIFIED',
          badgeText: isBn ? 'সম্পন্ন ✓' : 'COMPLETED ✓',
          badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          titleColor: 'text-blue-600 dark:text-blue-400',
          warningText: isBn ? '⚠ অসমর্থিত মানেই ভুল তথ্য নয়, কেবল পর্যাপ্ত প্রমাণের অভাব।' : '⚠ Unverified does not necessarily mean false.'
        };
    }
  };

  const { title, badgeText, badgeBg, titleColor, warningText } = getHeaderProps();
  const displayExplanation = isBn && explanationBn ? explanationBn : explanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 relative overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className="text-xs md:text-sm font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
          {scanType === 'RUMOR' ? (isBn ? 'দাবি বিশ্লেষণ ফলাফল' : 'CLAIM VERIFICATION') : scanType === 'SCAM' ? (isBn ? 'স্ক্যাম সিকিউরিটি মূল্যায়ন' : 'SCAM RISK ASSESSMENT') : (isBn ? 'ডিজিটাল ফোরেনসিক মূল্যায়ন' : 'DIGITAL FORENSIC ASSESSMENT')}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeBg}`}>
          {badgeText}
        </span>
      </div>

      {/* Main Content & Icon Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="space-y-3 max-w-3xl flex-1">
          <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${titleColor}`}>
            {title}
          </h2>

          <p className="text-base md:text-lg text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
            {displayExplanation}
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs md:text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{warningText}</span>
          </div>
        </div>

        {/* 72px Animated Icon */}
        <ResultIcon result={result} />
      </div>

      {/* Statistics Row (for Rumor type or general) */}
      {scanType === 'RUMOR' && statistics && (
        <ResultStatistics
          sourcesReviewed={statistics.sourcesReviewed}
          supporting={statistics.supporting}
          contradicting={statistics.contradicting}
          insufficient={statistics.insufficient}
          isBn={isBn}
        />
      )}
    </motion.div>
  );
};
