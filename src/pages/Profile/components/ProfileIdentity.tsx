import React from 'react';
import { Mail, Calendar } from 'lucide-react';

interface ProfileIdentityProps {
  name: string;
  accountType: string;
  email: string;
  memberSince: string;
  isBn?: boolean;
}

export const ProfileIdentity: React.FC<ProfileIdentityProps> = ({
  name,
  accountType,
  email,
  memberSince,
  isBn
}) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {name}
        </h2>

        {/* Demo Account Pill */}
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#EFF6FF] dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
          {accountType}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium pt-1">
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Mail className="w-4 h-4 text-slate-400" />
          <span>{email}</span>
        </a>

        <span>•</span>

        <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{isBn ? `সদস্যতা শুরু ${memberSince}` : `Member since ${memberSince}`}</span>
        </div>
      </div>
    </div>
  );
};
