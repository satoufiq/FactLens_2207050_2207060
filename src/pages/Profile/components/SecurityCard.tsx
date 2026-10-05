import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Smartphone, Monitor } from 'lucide-react';
import type { UserProfileData } from '../../../data/profileMockData';

interface SecurityCardProps {
  security: UserProfileData['security'];
  isBn?: boolean;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ security, isBn }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.5 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'অ্যাকাউন্ট সিকিউরিটি' : 'ACCOUNT SECURITY'}
          </h3>
        </div>
      </div>

      {/* Light Green Status Banner (Section 26) */}
      <div className="p-3.5 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/40 border border-[#BBF7D0] dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>{isBn ? '✓ অ্যাকাউন্ট সিকিউরিটি স্ট্যাটাস অত্যন্ত নিরাপদ' : '✓ Account security looks good'}</span>
      </div>

      {/* Security Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
        {/* Password */}
        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {isBn ? 'পাসওয়ার্ড' : 'Password'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isBn ? `সর্বশেষ পরিবর্তন: ${security.passwordLastChanged}` : `Last changed ${security.passwordLastChanged}`}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/settings')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            {isBn ? 'পরিবর্তন' : 'Manage'}
          </button>
        </div>

        {/* Two-Factor */}
        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {isBn ? 'টু-ফ্যাক্টর অথেনটিকেশন (2FA)' : 'Two-factor authentication'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {security.twoFactorEnabled ? (isBn ? 'সক্রিয় রয়েছে' : 'Enabled') : (isBn ? 'সক্রিয় নয়' : 'Not enabled')}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/settings')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            {isBn ? 'সক্রিয় করুন' : 'Enable'}
          </button>
        </div>

        {/* Active Sessions */}
        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {isBn ? 'সক্রিয় সেশনসমূহ' : 'Active sessions'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {security.activeSessions} {isBn ? 'টি ডিভাইসে লগইন করা' : 'active devices connected'}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/settings')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            {isBn ? 'দেখুন' : 'View'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
