import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { DeleteAccountModal } from './DeleteAccountModal';

interface DangerZoneProps {
  onConfirmDeleteAccount: () => void;
  isBn?: boolean;
}

export const DangerZone: React.FC<DangerZoneProps> = ({ onConfirmDeleteAccount, isBn }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.55 }}
      className="bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/80 dark:border-red-900/50 p-6 md:p-8 space-y-4"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
        <AlertTriangle className="w-4 h-4" />
        <span>{isBn ? 'ডেঞ্জার জোন' : 'DANGER ZONE'}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
            {isBn ? 'অ্যাকাউন্ট স্থায়ীভাবে ডিলিট করুন' : 'Delete Account'}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg">
            {isBn
              ? 'আপনার ফ্যাক্টলেন্স অ্যাকাউন্ট এবং এর সাথে সম্পর্কিত সমস্ত তথ্য স্থায়ীভাবে মুছে ফেলুন।'
              : 'Permanently delete your FactLens account and associated account data.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 font-semibold text-xs md:text-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 shadow-sm"
        >
          {isBn ? 'অ্যাকাউন্ট ডিলিট করুন' : 'Delete Account'}
        </button>
      </div>

      <DeleteAccountModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirmDelete={() => {
          setShowModal(false);
          onConfirmDeleteAccount();
        }}
        isBn={isBn}
      />
    </motion.div>
  );
};
