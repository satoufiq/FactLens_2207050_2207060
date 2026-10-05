import React, { useState, useEffect } from 'react';

interface ProfileStatsProps {
  totalScans: number;
  savedEvidence: number;
  thisWeek: number;
  isBn?: boolean;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  totalScans,
  savedEvidence,
  thisWeek,
  isBn
}) => {
  const [counts, setCounts] = useState({ scans: 0, saved: 0, week: 0 });

  useEffect(() => {
    const duration = 700;
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      setCounts({
        scans: Math.round(totalScans * progress),
        saved: Math.round(savedEvidence * progress),
        week: Math.round(thisWeek * progress)
      });
      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [totalScans, savedEvidence, thisWeek]);

  const convertBnNum = (n: number) => {
    if (!isBn) return n.toString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  const statItems = [
    { value: counts.scans, label: isBn ? 'মোট স্ক্যান' : 'Total Scans' },
    { value: counts.saved, label: isBn ? 'সংরক্ষিত প্রমাণ' : 'Saved Items' },
    { value: counts.week, label: isBn ? 'এই সপ্তাহে' : 'This Week' }
  ];

  return (
    <div className="flex items-center gap-6 md:gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
      {statItems.map((item, idx) => (
        <div key={idx} className="space-y-0.5 text-left md:text-right">
          <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white block">
            {convertBnNum(item.value)}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};
