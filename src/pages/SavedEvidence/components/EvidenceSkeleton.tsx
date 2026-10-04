import React from 'react';

export const EvidenceSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isBn?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isBn
}) => {
  if (totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const convertBnNum = (n: number) => {
    if (!isBn) return n.toString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  return (
    <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <div>
        {isBn
          ? `${convertBnNum(totalItems)} টি উপাদানের মধ্যে ${convertBnNum(startItem)}–${convertBnNum(endItem)} দেখানো হচ্ছে`
          : `Showing ${startItem}–${endItem} of ${totalItems} saved items`}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          ←
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentPage === pageNum
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {convertBnNum(pageNum)}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
};
