import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Plus, X, ScanSearch, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SavedEvidenceHeaderProps {
  isBn?: boolean;
}

export const SavedEvidenceHeader: React.FC<SavedEvidenceHeaderProps> = ({ isBn }) => {
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800/80 overflow-hidden"
    >
      {/* Background Faint Radial Decoration (Section 6) */}
      <div className="absolute right-0 top-0 w-96 h-96 pointer-events-none opacity-80"
        style={{
          background: 'radial-gradient(circle at 85% 20%, rgba(37,99,235,0.08), transparent 45%)'
        }}
      />

      <div className="space-y-2 max-w-2xl relative z-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 text-[11px] font-bold tracking-wider text-blue-700 dark:text-blue-300 uppercase">
          <Bookmark className="w-3.5 h-3.5" />
          {isBn ? 'প্রমাণ লাইব্রেরি' : 'EVIDENCE LIBRARY'}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isBn ? 'সংরক্ষিত প্রমাণ ও লাইব্রেরি' : 'Saved Evidence'}
        </h1>

        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {isBn
            ? 'পূর্ববর্তী স্ক্যানগুলো থেকে আপনার সংরক্ষিত প্রমাণ, টেকনিক্যাল সংকেত এবং বিশ্লেষণ তথ্য পুনরায় পর্যালোচনা করুন।'
            : 'Revisit the evidence, signals, and analysis details you saved from previous FactLens checks.'}
        </p>

        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
          {isBn ? 'সংরক্ষিত প্রমাণ, বিশ্লেষণ এবং গুরুত্বপূর্ণ তথ্য আবার দেখুন।' : 'সংরক্ষিত প্রমাণ, বিশ্লেষণ এবং গুরুত্বপূর্ণ তথ্য আবার দেখুন।'}
        </p>
      </div>

      {/* Right Primary Button: + Save Evidence */}
      <div className="relative z-10">
        <button
          onClick={() => setShowSaveModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? 'প্রমাণ সংরক্ষণ করুন' : 'Save Evidence'}</span>
        </button>
      </div>

      {/* Info Modal on click + Save Evidence */}
      <AnimatePresence>
        {showSaveModal && (
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
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isBn ? 'নতুন প্রমাণ যোগ করার নিয়ম' : 'Saving Evidence in FactLens'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {isBn
                  ? 'ফ্যাক্টলেন্সে প্রমাণ সাধারণত যেকোনো সম্পন্ন করা স্ক্যান বা বিশ্লেষণ রিপোর্ট থেকে সংরক্ষিত হয়। আপনি স্ক্যান চলাকালীন স্টার (★) বাটনে ক্লিক করে তথ্য সংরক্ষণ করতে পারেন।'
                  : 'In FactLens, verifiable evidence items are typically saved directly while inspecting completed scans in Scan Details.'}
              </p>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ScanSearch className="w-4 h-4 text-blue-600" />
                  <span>{isBn ? 'স্ক্যান হিস্ট্রিতে ব্রাউজ করুন' : 'Browse Scan History'}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {isBn ? 'যেকোনো স্ক্যান সিলেক্ট করুন এবং পছন্দমত সোর্স বা অ্যানালিসিস কার্ডে স্টার ক্লিক করুন।' : 'Open any past rumor, scam, or image scan and click the bookmark star to save evidence.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </button>
                <Link
                  to="/app/history"
                  onClick={() => setShowSaveModal(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  <span>{isBn ? 'স্ক্যান হিস্ট্রি খুলুন' : 'Open Scan History'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
