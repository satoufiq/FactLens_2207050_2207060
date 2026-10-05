import React from 'react';
import { motion } from 'framer-motion';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileStats } from './ProfileStats';
import type { UserProfileData } from '../../../data/profileMockData';

interface ProfileHeroProps {
  user: UserProfileData['user'];
  stats: UserProfileData['stats'];
  onOpenUploadPhoto: () => void;
  isBn?: boolean;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  stats,
  onOpenUploadPhoto,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden space-y-6"
    >
      {/* Hero Background Decoration (Section 6 & 29) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 20%, #2563EB 0%, transparent 40%), radial-gradient(circle at 10% 80%, #4F46E5 0%, transparent 45%)`
        }}
      />

      {/* Subtle Geometric Checkmark Verification Patterns (Barely Visible Opacity 0.04) */}
      <div className="absolute right-8 bottom-6 pointer-events-none opacity-[0.04] dark:opacity-[0.07] text-blue-600">
        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <ProfileAvatar
            initials={user.initials}
            statusText={user.status}
            onOpenUpload={onOpenUploadPhoto}
            isBn={isBn}
          />

          <ProfileIdentity
            name={user.name}
            accountType={user.accountType}
            email={user.email}
            memberSince={user.memberSince}
            isBn={isBn}
          />
        </div>

        {/* Right / Bottom Stats */}
        <ProfileStats
          totalScans={stats.totalScans}
          savedEvidence={stats.savedEvidence}
          thisWeek={stats.thisWeek}
          isBn={isBn}
        />
      </div>
    </motion.div>
  );
};
