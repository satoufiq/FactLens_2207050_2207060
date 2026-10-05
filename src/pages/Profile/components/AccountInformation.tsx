import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, Copy, Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type { UserProfileData } from '../../../data/profileMockData';

interface AccountInformationProps {
  user: UserProfileData['user'];
  onTriggerToast: (msg: string) => void;
  isBn?: boolean;
}

export const AccountInformation: React.FC<AccountInformationProps> = ({
  user,
  onTriggerToast,
  isBn
}) => {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    onTriggerToast(isBn ? 'অ্যাকাউন্ট আইডি অনুলিপি করা হয়েছে' : 'Account ID copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.45 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isBn ? 'অ্যাকাউন্ট টেকনিক্যাল তথ্য' : 'ACCOUNT INFORMATION'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isBn ? 'অ্যাকাউন্ট আইডি' : 'ACCOUNT ID'}
          </span>
          <button
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-200 transition-colors"
          >
            <span>{user.id}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isBn ? 'অ্যাকাউন্ট ধরন' : 'ACCOUNT TYPE'}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {user.accountType}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isBn ? 'তৈরির তারিখ' : 'CREATED'}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {user.memberSince}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isBn ? 'সর্বশেষ সক্রিয়' : 'LAST ACTIVE'}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white block">
            {user.lastActive}
          </span>
        </div>
      </div>

      {/* Language Preference Pills (Section 23) */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {isBn ? 'পছন্দের ভাষা নির্বাচন' : 'PREFERRED SYSTEM LANGUAGE'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang('bn')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
              lang === 'bn'
                ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#2563EB] dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            বাংলা
          </button>

          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
              lang === 'en'
                ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#2563EB] dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            English
          </button>

          <button
            onClick={() => navigate('/app/settings')}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-auto"
          >
            {isBn ? 'সেটিংস দেখুন →' : 'Advanced Settings →'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
