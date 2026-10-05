import React from 'react';
import { motion } from 'framer-motion';
import { User, Edit3, Check } from 'lucide-react';

interface ProfileHeaderProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  isBn?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditing,
  onToggleEdit,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80"
    >
      <div className="space-y-1.5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 text-[11px] font-bold tracking-wider text-blue-700 dark:text-blue-300 uppercase">
          <User className="w-3.5 h-3.5" />
          {isBn ? 'অ্যাকাউন্ট প্রোফাইল' : 'ACCOUNT'}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isBn ? 'প্রোফাইল কেন্দ্র' : 'Profile'}
        </h1>

        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          {isBn
            ? 'আপনার FactLens অ্যাকাউন্ট পরিচালনা করুন এবং প্ল্যাটফর্মের ব্যবহারের পরিসংখ্যান দেখুন।'
            : 'Manage your FactLens account and view your verification activity.'}
        </p>

        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
          {isBn ? 'আপনার FactLens অ্যাকাউন্ট এবং যাচাই কার্যক্রম পরিচালনা করুন।' : 'আপনার FactLens অ্যাকাউন্ট এবং যাচাই কার্যক্রম পরিচালনা করুন।'}
        </p>
      </div>

      {/* Edit Profile Button (44-48px height) */}
      <div className="pt-2 md:pt-0">
        <button
          onClick={onToggleEdit}
          className={`h-11 md:h-12 px-5 rounded-xl font-semibold text-xs md:text-sm inline-flex items-center gap-2 transition-all shadow-md active:scale-95 ${
            isEditing
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-4 h-4" />
              <span>{isBn ? 'সম্পাদনা বন্ধ করুন' : 'Viewing Profile'}</span>
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              <span>{isBn ? '✎ প্রোফাইল সম্পাদনা' : '✎ Edit Profile'}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
