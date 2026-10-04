import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Copy, Check } from 'lucide-react';
import type { ScanType } from '../../../data/scanDetailsMockData';

interface ScanInformationProps {
  scanId: string;
  scanType: ScanType;
  inputType: string;
  language: string;
  status: string;
  startedAt: string;
  completedAt: string;
  onCopyScanId: () => void;
  isBn?: boolean;
}

export const ScanInformation: React.FC<ScanInformationProps> = ({
  scanId,
  scanType,
  inputType,
  language,
  status,
  startedAt,
  completedAt,
  onCopyScanId,
  isBn
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyScanId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const items = [
    { label: isBn ? 'স্ক্যান আইডি' : 'Scan ID', value: scanId, isMono: true, copyable: true },
    { label: isBn ? 'স্ক্যান টাইপ' : 'Scan Type', value: scanType },
    { label: isBn ? 'ইনপুট মোড' : 'Input Type', value: inputType.toUpperCase() },
    { label: isBn ? 'চিহ্নিত ভাষা' : 'Language', value: language },
    { label: isBn ? 'স্ট্যাটাস' : 'Status', value: status },
    { label: isBn ? 'শুরুর সময়' : 'Started', value: startedAt },
    { label: isBn ? 'সম্পন্নের সময়' : 'Completed', value: completedAt }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'স্ক্যান টেকনিক্যাল তথ্য' : 'SCAN INFORMATION'}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {item.label}
            </span>
            {item.copyable ? (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>{item.value}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            ) : (
              <span className={`font-bold text-slate-900 dark:text-slate-100 ${item.isMono ? 'font-mono' : ''}`}>
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
