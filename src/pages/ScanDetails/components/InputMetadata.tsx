import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Info } from 'lucide-react';

interface InputMetadataProps {
  inputType: string;
  language: string;
  ocrStatus: string;
  submittedAt: string;
  scanId: string;
  onCopyScanId: () => void;
  isBn?: boolean;
}

export const InputMetadata: React.FC<InputMetadataProps> = ({
  inputType,
  language,
  ocrStatus,
  submittedAt,
  scanId,
  onCopyScanId,
  isBn
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyScanId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metadataItems = [
    { label: isBn ? 'ইনপুট ধরন' : 'INPUT TYPE', value: inputType },
    { label: isBn ? 'ভাষা' : 'LANGUAGE', value: language },
    { label: isBn ? 'OCR স্ট্যাটাস' : 'OCR STATUS', value: ocrStatus },
    { label: isBn ? 'জমাদানের সময়' : 'SUBMITTED', value: submittedAt }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>{isBn ? 'ইনপুট মেটাডাটা' : 'INPUT METADATA'}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metadataItems.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {item.label}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Monospace Scan ID Row with Copy Icon */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {isBn ? 'ইউনিক স্ক্যান আইডি' : 'SCAN ID'}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
        >
          <span>{scanId}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>
    </motion.div>
  );
};
