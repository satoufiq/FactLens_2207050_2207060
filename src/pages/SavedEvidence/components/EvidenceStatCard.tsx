import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, SearchCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';

interface EvidenceStatCardProps {
  icon: 'Bookmark' | 'SearchCheck' | 'ShieldAlert' | 'Image';
  value: number;
  label: string;
  delayMs?: number;
  isBn?: boolean;
}

export const EvidenceStatCard: React.FC<EvidenceStatCardProps> = ({
  icon,
  value,
  label,
  delayMs = 0,
  isBn
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timerDelay = setTimeout(() => {
      const duration = 700;
      const steps = 20;
      const stepTime = duration / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep += 1;
        const progress = currentStep / steps;
        setCount(Math.round(value * progress));

        if (currentStep >= steps) clearInterval(timer);
      }, stepTime);

      return () => clearInterval(timer);
    }, delayMs);

    return () => clearTimeout(timerDelay);
  }, [value, delayMs]);

  const getIcon = () => {
    switch (icon) {
      case 'SearchCheck':
        return { IconComp: SearchCheck, bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' };
      case 'ShieldAlert':
        return { IconComp: ShieldAlert, bg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' };
      case 'Image':
        return { IconComp: ImageIcon, bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' };
      case 'Bookmark':
      default:
        return { IconComp: Bookmark, bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' };
    }
  };

  const { IconComp, bg } = getIcon();

  const convertBnNum = (n: number) => {
    if (!isBn) return n.toString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + delayMs / 1000 }}
      whileHover={{ y: -3 }}
      className="group bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${bg} transition-transform duration-200 group-hover:rotate-6`}>
          <IconComp className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-0.5">
        <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white block">
          {convertBnNum(count)}
        </span>
        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 block">
          {label}
        </span>
      </div>
    </motion.div>
  );
};
