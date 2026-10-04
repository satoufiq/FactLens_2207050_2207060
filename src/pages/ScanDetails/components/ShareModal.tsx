import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  onCopyLink: () => void;
  isBn?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  scanId,
  onCopyLink,
  isBn
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://factlens.app/scan/${scanId}`;

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'স্ক্যান রিপোর্ট শেয়ার করুন' : 'Share Scan Record'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
              {isBn
                ? 'এই ফ্যাক্টলেন্স যাচাই রিপোর্টটির লিংক অনুলিপি করে অন্যদের সাথে শেয়ার করুন।'
                : 'Share this public FactLens scan verification record link with colleagues or social media.'}
            </p>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Globe className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md shadow-blue-600/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isBn ? 'অনুলিপিকৃত' : 'Copied!') : (isBn ? 'লিঙ্ক কপি করুন' : 'Copy Link')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
