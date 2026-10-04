import React from 'react';

interface EvidenceRelationshipProps {
  relationship: 'SUPPORTING' | 'CONTRADICTING' | 'INSUFFICIENT';
  isBn?: boolean;
}

export const EvidenceRelationship: React.FC<EvidenceRelationshipProps> = ({
  relationship,
  isBn
}) => {
  switch (relationship) {
    case 'SUPPORTING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
          ✓ {isBn ? 'সমর্থনকারী' : 'SUPPORTING'}
        </span>
      );
    case 'CONTRADICTING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          × {isBn ? 'খণ্ডনকারী' : 'CONTRADICTING'}
        </span>
      );
    case 'INSUFFICIENT':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          ○ {isBn ? 'অপর্যাপ্ত' : 'INSUFFICIENT'}
        </span>
      );
  }
};
