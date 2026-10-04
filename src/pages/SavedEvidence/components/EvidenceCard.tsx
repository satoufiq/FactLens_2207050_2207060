import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Globe, Building2, Newspaper, Shield, FileText } from 'lucide-react';
import { EvidenceTypeBadge, RelationshipBadge } from './RelationshipBadge';
import type { SavedEvidenceItem } from '../../../data/savedEvidenceMockData';

interface EvidenceCardProps {
  evidence: SavedEvidenceItem;
  index: number;
  onOpenDrawer: (item: SavedEvidenceItem) => void;
  onToggleSave: (id: string) => void;
  onAddToCollection?: (item: SavedEvidenceItem) => void;
  onOpenOriginalScan?: (scanId: string) => void;
  isBn?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  index,
  onOpenDrawer,
  onToggleSave,
  isBn
}) => {
  const [isSaved, setIsSaved] = useState(true);

  const displayTitle = isBn && evidence.titleBn ? evidence.titleBn : evidence.title;
  const displayDescription = isBn && evidence.descriptionBn ? evidence.descriptionBn : evidence.description;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onToggleSave(evidence.id);
  };

  const getSourceIcon = (sourceType?: string) => {
    if (!sourceType) return Globe;
    if (sourceType.toLowerCase().includes('institutional') || sourceType.toLowerCase().includes('government')) {
      return Building2;
    }
    if (sourceType.toLowerCase().includes('news') || sourceType.toLowerCase().includes('media')) {
      return Newspaper;
    }
    if (sourceType.toLowerCase().includes('threat') || sourceType.toLowerCase().includes('risk')) {
      return Shield;
    }
    return FileText;
  };

  const SourceIcon = getSourceIcon(evidence.sourceType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 * index }}
      whileHover={{ y: -5 }}
      onClick={() => onOpenDrawer(evidence)}
      className="group relative bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl hover:border-blue-400/60 dark:hover:border-blue-600/60 transition-all duration-220 cursor-pointer flex flex-col justify-between gap-4 overflow-hidden"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <EvidenceTypeBadge type={evidence.type} isBn={isBn} />

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Animated Filled Star (Section 31) */}
          <button
            onClick={handleBookmarkClick}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isSaved ? "Remove from saved" : "Save evidence"}
          >
            <motion.div
              animate={{
                scale: isSaved ? [1, 1.25, 1] : 1,
                rotate: isSaved ? [-8, 0] : 0
              }}
              transition={{ duration: 0.25 }}
            >
              <Star
                className={`w-4 h-4 ${
                  isSaved
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17px] md:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {displayTitle}
          </h3>

          {/* Optional Thumbnail Image (for Image Analysis) */}
          {evidence.imageThumbnail && (
            <img
              src={evidence.imageThumbnail}
              alt={displayTitle}
              className="w-[72px] h-[56px] object-cover rounded-[10px] border border-slate-200 dark:border-slate-800 shrink-0"
            />
          )}
        </div>

        {/* Summary (Max 3 lines) */}
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
          {displayDescription}
        </p>

        {evidence.url && (
          <span className="inline-block text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50 truncate max-w-full">
            {evidence.url}
          </span>
        )}
      </div>

      {/* Footer Metadata & Relationship */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div>
          <RelationshipBadge relationship={evidence.relationship} isBn={isBn} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <SourceIcon className="w-3.5 h-3.5 text-slate-400 group-hover:scale-105 transition-transform" />
            <span className="truncate">{evidence.source}</span>
            <span>•</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
              {evidence.scanId}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">{evidence.savedAt}</span>
            
            {/* Hover Action Arrow */}
            <div className="opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-0.5">
              <span>{isBn ? 'দেখুন' : 'Open'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
