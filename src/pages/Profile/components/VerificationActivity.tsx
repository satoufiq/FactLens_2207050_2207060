import React from 'react';
import { motion } from 'framer-motion';
import { Activity, SearchCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { ActivityChart } from './ActivityChart';
import type { UserProfileData } from '../../../data/profileMockData';

interface VerificationActivityProps {
  activity: UserProfileData['activity'];
  weeklyActivity: UserProfileData['weeklyActivity'];
  isBn?: boolean;
}

export const VerificationActivity: React.FC<VerificationActivityProps> = ({
  activity,
  weeklyActivity,
  isBn
}) => {
  const miniCards = [
    {
      title: isBn ? 'গুজব / দাবি' : 'Rumor / Claim',
      count: activity.rumor,
      icon: SearchCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50'
    },
    {
      title: isBn ? 'স্ক্যাম অ্যালার্ট' : 'Scam Alert',
      count: activity.scam,
      icon: ShieldAlert,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50 border-red-200/80 dark:border-red-900/50'
    },
    {
      title: isBn ? 'ছবি ফোরেনসিক্স' : 'Image Check',
      count: activity.image,
      icon: ImageIcon,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200/80 dark:border-purple-900/50'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'যাচাইকরণ অ্যাক্টিভিটি সামারি' : 'VERIFICATION ACTIVITY'}
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {isBn ? 'গত ৭ দিনের পরিসংখ্যান' : 'Last 7 Days'}
        </span>
      </div>

      {/* 3 Activity Breakdown Mini Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {miniCards.map((card, idx) => {
          const IconComp = card.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 md:p-4 rounded-xl border ${card.bg} space-y-1.5`}
            >
              <div className="flex items-center justify-between">
                <IconComp className={`w-4 h-4 md:w-5 md:h-5 ${card.color}`} />
                <span className="text-lg md:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {card.count}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block truncate">
                {card.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recharts Activity Graph */}
      <ActivityChart data={weeklyActivity} isBn={isBn} />
    </motion.div>
  );
};
