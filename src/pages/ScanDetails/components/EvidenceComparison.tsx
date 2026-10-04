import React from 'react';
import { FileText, Database, ArrowDown, HelpCircle, Layers } from 'lucide-react';
import type { EvidenceItem, ResultStatus } from '../../../data/scanDetailsMockData';

interface EvidenceComparisonProps {
  evidenceList: EvidenceItem[];
  result: ResultStatus;
  isBn?: boolean;
}

export const EvidenceComparison: React.FC<EvidenceComparisonProps> = ({
  evidenceList,
  result,
  isBn
}) => {
  return (
    <div className="bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>{isBn ? 'দাবি বনাম প্রমাণ তুলনা ডায়াগ্রাম' : 'EVIDENCE COMPARISON VISUALIZATION'}</span>
      </div>

      {/* Desktop Horizontal Flowchart */}
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Top: Claim Node */}
        <div className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-2 font-bold text-xs md:text-sm text-slate-900 dark:text-white">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isBn ? 'জমাদানকৃত দাবি (CLAIM)' : 'SUBMITTED CLAIM'}</span>
        </div>

        <ArrowDown className="w-4 h-4 text-slate-400 animate-bounce" />

        {/* Middle Node: Available Evidence Aggregate */}
        <div className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs md:text-sm shadow-md flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>{isBn ? 'উপলব্ধ সংগৃহীত প্রমাণসমূহ (4 Sources)' : 'AVAILABLE EVIDENCE SEARCH (4 Sources)'}</span>
        </div>

        <div className="w-full max-w-2xl hidden md:block">
          <div className="h-4 border-l-2 border-r-2 border-t-2 border-slate-300 dark:border-slate-700 rounded-t-lg mx-12" />
        </div>

        {/* Sources Level */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full max-w-4xl">
          {evidenceList.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-1.5 shadow-sm text-xs"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Source {idx + 1}
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                {item.title}
              </p>
              <div className="pt-1">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {item.relationship}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl hidden md:block">
          <div className="h-4 border-l-2 border-r-2 border-b-2 border-slate-300 dark:border-slate-700 rounded-b-lg mx-12" />
        </div>

        <ArrowDown className="w-4 h-4 text-slate-400" />

        {/* Bottom Node: Assessment Result */}
        <div className="px-6 py-3 rounded-2xl bg-slate-900 text-white dark:bg-blue-950 dark:border dark:border-blue-800 font-extrabold text-sm md:text-base shadow-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <span>{result === 'UNVERIFIED' ? (isBn ? 'ফলাফল: অসমর্থিত (UNVERIFIED)' : 'FINAL ASSESSMENT: UNVERIFIED') : result}</span>
        </div>
      </div>
    </div>
  );
};
