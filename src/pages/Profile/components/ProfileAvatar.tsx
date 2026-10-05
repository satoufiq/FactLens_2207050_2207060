import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

interface ProfileAvatarProps {
  initials: string;
  statusText: string;
  onOpenUpload: () => void;
  isBn?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  initials,
  statusText,
  onOpenUpload,
  isBn
}) => {
  return (
    <div className="relative group shrink-0">
      {/* 96px Circular Avatar */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
        onClick={onOpenUpload}
        className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#172554] text-white flex items-center justify-center font-extrabold text-2xl md:text-3xl tracking-wider shadow-lg border-4 border-white dark:border-slate-800 cursor-pointer relative overflow-hidden select-none"
      >
        <span>{initials}</span>

        {/* Translucent Dark Overlay on Hover (Section 8) */}
        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[10px] font-bold space-y-1">
          <Camera className="w-5 h-5 text-blue-400" />
          <span>{isBn ? 'ছবি পরিবর্তন' : 'Change photo'}</span>
        </div>
      </motion.div>

      {/* Green Status Indicator Dot (● at bottom-right) */}
      <div
        className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md cursor-help"
        title={statusText}
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    </div>
  );
};
