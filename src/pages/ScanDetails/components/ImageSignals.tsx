import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, FileCode } from 'lucide-react';
import type { ImageSignalItem, TechnicalSignalItem } from '../../../data/scanDetailsMockData';

interface ImageSignalsProps {
  visualSignals?: ImageSignalItem[];
  technicalSignals?: TechnicalSignalItem[];
  metadata?: {
    filename: string;
    format: string;
    dimensions: string;
    size: string;
    exif: string;
    camera: string;
    software: string;
    location: string;
  };
  isBn?: boolean;
}

export const ImageSignals: React.FC<ImageSignalsProps> = ({
  visualSignals = [],
  technicalSignals = [],
  metadata,
  isBn
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <ImageIcon className="w-4 h-4" />
            <span>{isBn ? 'ডিজিটাল ছবি সংকেত ও ফোরেনসিক্স' : 'DIGITAL IMAGE SIGNALS & ELA AUDIT'}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isBn ? 'ছবি ফোরেনসিক্সে প্রাপ্ত পরিবর্তন সংকেত' : 'Visual & Technical Forensic Signals'}
          </h3>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {isBn ? 'Error Level Analysis (ELA) এবং পিক্সেল গ্র্যাডিয়েন্ট নয়েজ বিশ্লেষণ।' : 'Pixel-level derivative edge analysis, ELA recompression & EXIF headers.'}
          </p>
        </div>
      </div>

      {/* Visual Signals Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'ভিজুয়াল নয়েজ ও এজ সংকেত' : 'VISUAL NOISE & EDGE SIGNALS'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visualSignals.map((sig) => (
            <div
              key={sig.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  {sig.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sig.status === 'DETECTED' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {sig.status} ({sig.scorePct}%)
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {sig.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical ELA & EXIF Signals */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'কারিগরি ELA ও সফটওয়্যার স্বাক্ষর' : 'TECHNICAL ELA & EXIF SIGNATURES'}
        </h4>
        <div className="space-y-2">
          {technicalSignals.map((tech) => (
            <div
              key={tech.id}
              className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-start gap-3 text-xs"
            >
              <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {tech.title}
                </span>
                <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {tech.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata Info Grid */}
      {metadata && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'ছবি ফাইল মেটাডাটা ও EXIF' : 'FILE METADATA & EXIF AUDIT'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">FORMAT</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.format} ({metadata.dimensions})</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">CAMERA</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.camera}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">SOFTWARE EXPORT</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.software}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">GPS LOCATION</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.location}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
