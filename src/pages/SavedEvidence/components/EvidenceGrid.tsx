import React from 'react';
import { EvidenceCard } from './EvidenceCard';
import type { SavedEvidenceItem } from '../../../data/savedEvidenceMockData';

interface EvidenceGridProps {
  items: SavedEvidenceItem[];
  viewMode: 'grid' | 'list';
  onOpenDrawer: (item: SavedEvidenceItem) => void;
  onToggleSave: (id: string) => void;
  onAddToCollection?: (item: SavedEvidenceItem) => void;
  onOpenOriginalScan?: (scanId: string) => void;
  isBn?: boolean;
}

export const EvidenceGrid: React.FC<EvidenceGridProps> = ({
  items,
  viewMode,
  onOpenDrawer,
  onToggleSave,
  onAddToCollection,
  onOpenOriginalScan,
  isBn
}) => {
  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
          : 'flex flex-col gap-4'
      }
    >
      {items.map((item, idx) => (
        <EvidenceCard
          key={item.id}
          evidence={item}
          index={idx}
          onOpenDrawer={onOpenDrawer}
          onToggleSave={onToggleSave}
          onAddToCollection={onAddToCollection}
          onOpenOriginalScan={onOpenOriginalScan}
          isBn={isBn}
        />
      ))}
    </div>
  );
};
