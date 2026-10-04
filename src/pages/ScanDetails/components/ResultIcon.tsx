import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { ResultStatus } from '../../../data/scanDetailsMockData';

interface ResultIconProps {
  result: ResultStatus;
}

export const ResultIcon: React.FC<ResultIconProps> = ({ result }) => {
  const getIconConfig = () => {
    switch (result) {
      case 'SUPPORTED':
      case 'LIKELY_AUTHENTIC':
        return {
          Icon: CheckCircle2,
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          ringColor: 'bg-emerald-400/20'
        };
      case 'CONTRADICTED':
        return {
          Icon: XCircle,
          bgClass: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          ringColor: 'bg-red-400/20'
        };
      case 'HIGH_RISK':
        return {
          Icon: ShieldAlert,
          bgClass: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          ringColor: 'bg-red-500/20'
        };
      case 'POSSIBLE_MANIPULATION':
      case 'MEDIUM_RISK':
        return {
          Icon: AlertTriangle,
          bgClass: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
          iconColor: 'text-amber-600 dark:text-amber-400',
          ringColor: 'bg-amber-400/20'
        };
      case 'UNVERIFIED':
      default:
        return {
          Icon: HelpCircle,
          bgClass: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          ringColor: 'bg-blue-400/20'
        };
    }
  };

  const { Icon, bgClass, iconColor, ringColor } = getIconConfig();

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Subtle ring expansion animation once */}
      <motion.div
        initial={{ scale: 1, opacity: 0.4 }}
        animate={{ scale: 1.15, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut', repeat: 0 }}
        className={`absolute inset-0 rounded-full ${ringColor}`}
      />
      {/* Icon Circle */}
      <motion.div
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`w-[72px] h-[72px] rounded-full border ${bgClass} flex items-center justify-center shadow-inner`}
      >
        <Icon className={`w-9 h-9 ${iconColor}`} />
      </motion.div>
    </div>
  );
};
