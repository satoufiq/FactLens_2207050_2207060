import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ZoomIn, Maximize2, X, Eye } from 'lucide-react';

interface OriginalInputPreviewProps {
  imageSrc?: string;
  title?: string;
  isBn?: boolean;
}

export const OriginalInputPreview: React.FC<OriginalInputPreviewProps> = ({
  imageSrc = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80",
  title = "Original Input Image",
  isBn
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>{isBn ? 'মূল ইনপুট স্ক্রিনশট' : 'ORIGINAL INPUT PREVIEW'}</span>
        </div>
        <span className="text-[11px] text-slate-400">PNG / JPEG • 1920×1080</span>
      </div>

      {/* Dark Preview Box */}
      <div className="relative group bg-slate-950 rounded-xl overflow-hidden min-h-[180px] max-h-[260px] flex items-center justify-center border border-slate-800 shadow-inner">
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-full object-contain max-h-[240px] transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 font-semibold text-xs shadow-lg hover:bg-slate-100 transition-all transform hover:scale-105 active:scale-95"
          >
            <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
            <span>{isBn ? 'জুম ইন' : 'Zoom'}</span>
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'পূর্ণপর্দা' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>{isBn ? 'ছবিতে যেকোনো স্থান বড় দেখতে ক্লিক করুন' : 'Click preview to expand & inspect'}</span>
        <button
          onClick={() => setIsFullscreen(true)}
          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          {isBn ? 'ছবি দেখুন' : 'View Image'}
        </button>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox Controls */}
              <div className="absolute -top-12 right-0 flex items-center gap-3">
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5))}
                  className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                  title="Close Lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lightbox Image */}
              <div className="overflow-auto max-h-[82vh] max-w-full rounded-2xl border border-slate-800 shadow-2xl bg-slate-900 p-2">
                <img
                  src={imageSrc}
                  alt={title}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  className="max-h-[75vh] object-contain transition-transform duration-200"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
