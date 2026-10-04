import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BreadcrumbProps {
  isBn?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ isBn }) => {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium"
    >
      <Link
        to="/app"
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {isBn ? 'অ্যাক্টিভিটি' : 'Activity'}
      </Link>
      <span className="text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-900 dark:text-slate-100 font-semibold">
        {isBn ? 'সংরক্ষিত প্রমাণ' : 'Saved Evidence'}
      </span>
    </motion.nav>
  );
};
