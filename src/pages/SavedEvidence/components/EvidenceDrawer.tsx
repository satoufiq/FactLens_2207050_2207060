import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Share2 } from 'lucide-react';
import { EvidenceTypeBadge, RelationshipBadge } from './RelationshipBadge';
import type { SavedEvidenceItem } from '../../../data/savedEvidenceMockData';

interface EvidenceDrawerProps {
  item: SavedEvidenceItem | null;
  onClose: () => void;
  onShareItem?: (item: SavedEvidenceItem) => void;
  isBn?: boolean;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  item,
  onClose,
  onShareItem,
  isBn
}) => {
  const navigate = useNavigate();

  if (!item) return null;

  const displayTitle = isBn && item.titleBn ? item.titleBn : item.title;
  const displayDescription = isBn && item.descriptionBn ? item.descriptionBn : item.description;
  const displayExplanation = isBn && item.fullExplanationBn ? item.fullExplanationBn : item.fullExplanation;

  const handleOpenScanDetails = () => {
    onClose();
    navigate(`/app/history/${item.scanId}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop Fade */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          {/* Drawer Slide-in from Right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EvidenceTypeBadge type={item.type} isBn={isBn} />
                <span className="text-xs font-mono text-slate-400">ID: {item.id}</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs md:text-sm">
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                  {displayTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <RelationshipBadge relationship={item.relationship} isBn={isBn} />
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Folder: {item.collection}
                  </span>
                </div>
              </div>

              {/* Source Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isBn ? 'তথ্য উৎস ও মেটাডাটা' : 'SOURCE INFORMATION'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {item.source}
                  </span>
                  {item.url && (
                    <button
                      onClick={() => window.open(`https://${item.url}`, '_blank')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>{isBn ? 'উৎস লিংক' : 'Open Source'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {isBn ? 'সংক্ষিপ্ত সামারি' : 'SUMMARY DESCRIPTION'}
                </span>
                <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {displayDescription}
                </p>
              </div>

              {/* Full Explanation */}
              {displayExplanation && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    {isBn ? 'সম্পূর্ণ ফ্যাক্টলেন্স ব্যাখ্যা' : 'DETAILED EXPLANATION'}
                  </span>
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {displayExplanation}
                  </div>
                </div>
              )}

              {/* Related Scan Information */}
              <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">{isBn ? 'সংশ্লিষ্ট স্ক্যান আইডি' : 'ORIGINAL SCAN FILE'}</span>
                  <span className="font-mono text-blue-400 font-bold">{item.scanId}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {isBn ? 'এই তথ্যটি ফ্যাক্টলেন্স পূর্বে সম্পন্ন করা একটি স্ক্যান কেস ফাইল থেকে সেভ করা হয়েছিল।' : 'This saved evidence unit was recorded directly during FactLens scan verification.'}
                </p>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
              {onShareItem && (
                <button
                  onClick={() => onShareItem(item)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Share item"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleOpenScanDetails}
                className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <span>{isBn ? 'মূল স্ক্যান ফাইল খুলুন →' : 'Open Scan Details →'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
