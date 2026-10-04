import React from 'react';
import { motion } from 'framer-motion';
import { Link2, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';

interface URLAnalysisProps {
  urlData?: {
    submittedUrl: string;
    domain: string;
    createdDate: string;
    sslValid: boolean;
    suspiciousRedirects: boolean;
    phishingDatabaseMatch: boolean;
  };
  isBn?: boolean;
}

export const URLAnalysis: React.FC<URLAnalysisProps> = ({ urlData, isBn }) => {
  if (!urlData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Link2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span>{isBn ? 'ইউআরএল এবং ডোমেন নিরাপত্তা পরীক্ষা' : 'URL & DOMAIN SECURITY FORENSICS'}</span>
        </div>
        <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded">
          FLAGGED UNTRUSTED
        </span>
      </div>

      {/* Target URL highlight */}
      <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs md:text-sm rounded-xl border border-slate-800 break-all select-all flex items-center justify-between">
        <span>{urlData.submittedUrl}</span>
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">DOMAIN REGISTRATION</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{urlData.createdDate}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">SSL CERTIFICATE</span>
          <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>Invalid / Self-signed</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">THREAT INTEL MATCH</span>
          <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Phishing Database Positive</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
