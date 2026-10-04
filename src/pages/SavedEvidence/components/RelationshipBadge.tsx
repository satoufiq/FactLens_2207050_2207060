import React from 'react';
import { SearchCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import type { SavedEvidenceType, EvidenceRelationship } from '../../../data/savedEvidenceMockData';

interface EvidenceTypeBadgeProps {
  type: SavedEvidenceType;
  isBn?: boolean;
}

export const EvidenceTypeBadge: React.FC<EvidenceTypeBadgeProps> = ({ type, isBn }) => {
  switch (type) {
    case 'CLAIM_EVIDENCE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
          <SearchCheck className="w-3.5 h-3.5" />
          <span>{isBn ? 'দাবির প্রমাণ' : 'CLAIM EVIDENCE'}</span>
        </span>
      );
    case 'SCAM_SIGNAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <span>{isBn ? 'স্ক্যাম সংকেত' : 'SCAM SIGNAL'}</span>
        </span>
      );
    case 'IMAGE_SIGNAL':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
          <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
          <span>{isBn ? 'ছবি ফোরেনসিক্স' : 'IMAGE ANALYSIS'}</span>
        </span>
      );
  }
};

interface RelationshipBadgeProps {
  relationship: EvidenceRelationship;
  isBn?: boolean;
}

export const RelationshipBadge: React.FC<RelationshipBadgeProps> = ({ relationship, isBn }) => {
  switch (relationship) {
    case 'SUPPORTING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
          ✓ {isBn ? 'সমর্থনকারী' : 'SUPPORTING'}
        </span>
      );
    case 'CONTRADICTING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          × {isBn ? 'খণ্ডনকারী' : 'CONTRADICTING'}
        </span>
      );
    case 'RISK_INDICATOR':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
          ⚠ {isBn ? 'ঝুঁকি নির্দেশক' : 'RISK INDICATOR'}
        </span>
      );
    case 'DETECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
          ⚡ {isBn ? 'চিহ্নিত সংকেত' : 'SIGNAL DETECTED'}
        </span>
      );
    case 'INSUFFICIENT':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          ○ {isBn ? 'অপর্যাপ্ত' : 'INSUFFICIENT'}
        </span>
      );
  }
};
