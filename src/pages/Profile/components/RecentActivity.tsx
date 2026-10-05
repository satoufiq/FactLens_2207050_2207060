import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchCheck, ShieldAlert, Image as ImageIcon, ArrowRight } from 'lucide-react';
import type { UserProfileData } from '../../../data/profileMockData';

interface RecentActivityItemProps {
  item: UserProfileData['recentActivity'][0];
  index: number;
  isBn?: boolean;
}

export const RecentActivityItem: React.FC<RecentActivityItemProps> = ({
  item,
  index,
  isBn
}) => {
  const navigate = useNavigate();

  const getTypeIcon = () => {
    switch (item.type) {
      case 'RUMOR':
        return <SearchCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'SCAM':
        return <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'IMAGE':
      default:
        return <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getResultBadge = () => {
    switch (item.result) {
      case 'UNVERIFIED':
        return { label: isBn ? 'অসমর্থিত' : 'UNVERIFIED', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200' };
      case 'HIGH_RISK':
        return { label: isBn ? 'উচ্চ ঝুঁকি' : 'HIGH RISK', bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200' };
      case 'LIKELY_AUTHENTIC':
      case 'SUPPORTED':
        return { label: isBn ? 'সত্যতা প্রমাণিত' : 'AUTHENTIC', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200' };
      case 'CONTRADICTED':
      default:
        return { label: isBn ? 'ভুয়া প্রমাণিত' : 'CONTRADICTED', bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200' };
    }
  };

  const badge = getResultBadge();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 * index }}
      whileHover={{ x: 3 }}
      onClick={() => navigate(`/app/history/${item.scanId}`)}
      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs md:text-sm"
    >
      <div className="flex items-center gap-3 truncate">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm shrink-0">
          {getTypeIcon()}
        </div>
        <div className="truncate">
          <h4 className="font-bold text-slate-900 dark:text-white truncate">
            {item.title}
          </h4>
          <span className="text-[11px] text-slate-400 font-medium">
            {item.type} • {item.time}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${badge.bg}`}>
          {badge.label}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
      </div>
    </motion.div>
  );
};

interface RecentActivityProps {
  items: UserProfileData['recentActivity'];
  isBn?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ items, isBn }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'সাম্প্রতিক অ্যাক্টিভিটি' : 'RECENT ACTIVITY'}
        </h3>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <RecentActivityItem key={item.id} item={item} index={idx} isBn={isBn} />
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
        <button
          onClick={() => navigate('/app/history')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <span>{isBn ? 'সব অ্যাক্টিভিটি দেখুন →' : 'View All Activity →'}</span>
        </button>
      </div>
    </motion.div>
  );
};
