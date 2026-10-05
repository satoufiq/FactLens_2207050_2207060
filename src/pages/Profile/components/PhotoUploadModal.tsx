import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (msg: string) => void;
  isBn?: boolean;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  isBn
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleSimulatedUpload = () => {
    onUploadSuccess(isBn ? 'প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে' : 'Profile photo updated successfully.');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'প্রোফাইল ছবি আপলোড' : 'Change Profile Photo'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleSimulatedUpload(); }}
              onClick={handleSimulatedUpload}
              className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all space-y-3 ${
                dragActive
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isBn ? 'ছবি ড্র্যাগ করুন অথবা ক্লিক করে সিলেক্ট করুন' : 'Click to select or drag photo here'}
                </p>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG, WebP (Max 5MB)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
