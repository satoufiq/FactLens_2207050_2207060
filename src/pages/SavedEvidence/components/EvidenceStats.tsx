import React from 'react';
import { EvidenceStatCard } from './EvidenceStatCard';

interface EvidenceStatsProps {
  totalCount: number;
  claimCount: number;
  scamCount: number;
  imageCount: number;
  isBn?: boolean;
}

export const EvidenceStats: React.FC<EvidenceStatsProps> = ({
  totalCount,
  claimCount,
  scamCount,
  imageCount,
  isBn
}) => {
  const stats = [
    {
      icon: 'Bookmark' as const,
      value: totalCount,
      label: isBn ? 'সংরক্ষিত বিষয়বস্তু' : 'Saved Items',
      delayMs: 0
    },
    {
      icon: 'SearchCheck' as const,
      value: claimCount,
      label: isBn ? 'দাবির প্রমাণ' : 'Claim Evidence',
      delayMs: 100
    },
    {
      icon: 'ShieldAlert' as const,
      value: scamCount,
      label: isBn ? 'স্ক্যাম সংকেত' : 'Scam Signals',
      delayMs: 200
    },
    {
      icon: 'Image' as const,
      value: imageCount,
      label: isBn ? 'ছবি ফোরেনসিক্স' : 'Image Analysis',
      delayMs: 300
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-5">
      {stats.map((stat, idx) => (
        <EvidenceStatCard
          key={idx}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          delayMs={stat.delayMs}
          isBn={isBn}
        />
      ))}
    </div>
  );
};
