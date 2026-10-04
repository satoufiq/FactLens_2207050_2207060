import React from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderCheck } from 'lucide-react';
import type { CollectionItem } from '../../../data/savedEvidenceMockData';

interface CollectionCardProps {
  collection: CollectionItem;
  isSelected?: boolean;
  onSelect: () => void;
  isBn?: boolean;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  isSelected,
  onSelect,
  isBn
}) => {
  const displayTitle = isBn && collection.nameBn ? collection.nameBn : collection.name;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative text-left p-5 rounded-[18px] border transition-all duration-200 flex flex-col justify-between min-w-[200px] ${
        isSelected
          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
          : `${collection.bgClass} hover:shadow-md`
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <motion.div
          whileHover={{ x: 3 }}
          transition={{ duration: 0.2 }}
          className={`p-2.5 rounded-xl ${
            isSelected ? 'bg-white/20 text-white' : collection.iconBg
          }`}
        >
          {isSelected ? <FolderCheck className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
        </motion.div>

        {isSelected && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
            {isBn ? 'সক্রিয়' : 'ACTIVE'}
          </span>
        )}
      </div>

      <div className="space-y-1 pt-3">
        <h4 className={`text-base font-bold tracking-tight line-clamp-1 ${
          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
        }`}>
          {displayTitle}
        </h4>
        <span className={`text-xs font-semibold block ${
          isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
        }`}>
          {collection.count} {isBn ? 'টি সংরক্ষিত তথ্য' : 'saved items'}
        </span>
      </div>
    </motion.button>
  );
};
