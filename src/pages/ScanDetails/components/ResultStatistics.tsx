import React, { useState, useEffect } from 'react';

interface ResultStatisticsProps {
  sourcesReviewed?: number;
  supporting?: number;
  contradicting?: number;
  insufficient?: number;
  isBn?: boolean;
}

export const ResultStatistics: React.FC<ResultStatisticsProps> = ({
  sourcesReviewed = 4,
  supporting = 0,
  contradicting = 0,
  insufficient = 4,
  isBn
}) => {
  const [counts, setCounts] = useState({
    sources: 0,
    supp: 0,
    contra: 0,
    inss: 0
  });

  useEffect(() => {
    const duration = 650;
    const steps = 20;
    const interval = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const progress = currentStep / steps;

      setCounts({
        sources: Math.round(sourcesReviewed * progress),
        supp: Math.round(supporting * progress),
        contra: Math.round(contradicting * progress),
        inss: Math.round(insufficient * progress)
      });

      if (currentStep >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [sourcesReviewed, supporting, contradicting, insufficient]);

  const convertBnNum = (n: number) => {
    if (!isBn) return n.toString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  const statItems = [
    { value: counts.sources, label: isBn ? 'উৎস পর্যালোচিত' : 'Sources reviewed' },
    { value: counts.supp, label: isBn ? 'সমর্থনকারী' : 'Supporting' },
    { value: counts.contra, label: isBn ? 'খণ্ডনকারী' : 'Contradicting' },
    { value: counts.inss, label: isBn ? 'অপর্যাপ্ত / নিরপেক্ষ' : 'Insufficient / neutral' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 pt-6 border-t border-slate-200/70 dark:border-slate-800">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className={`flex flex-col ${
            idx > 0 ? 'sm:border-l sm:border-slate-200/70 sm:dark:border-slate-800 sm:pl-6' : ''
          }`}
        >
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {convertBnNum(item.value)}
          </span>
          <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};
