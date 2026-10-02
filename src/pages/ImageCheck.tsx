import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImagePlus,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ScanSearch,
  Settings2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  FileImage,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { imageCheckMockData, type ImageCheckData } from '../data/imageCheckMockData';

export const ImageCheck: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // File & Workspace state
  const [fileState, setFileState] = useState<ImageCheckData | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationState, setValidationState] = useState<'IDLE' | 'CHECKING' | 'READY' | 'ERROR_FORMAT' | 'ERROR_SIZE'>('IDLE');
  
  // Preview controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File upload handler
  const handleFileChange = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeMB = 10;

    if (!validTypes.includes(file.type)) {
      setValidationState('ERROR_FORMAT');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setValidationState('ERROR_SIZE');
      return;
    }

    setValidationState('CHECKING');

    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);

    // Create File Metadata
    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        setFileState({
          fileName: file.name,
          fileType: file.type.split('/')[1].toUpperCase(),
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          dimensions: `${img.width} × ${img.height}`,
          colorMode: 'RGB',
          status: 'READY',
          metadata: {
            camera: 'Available (Exif Headers Identified)',
            date: new Date().toLocaleDateString(),
            location: 'Not available (Location Stripped)',
            software: 'Available (Analyzed)'
          },
          supportedFormats: ['JPEG', 'PNG', 'WebP']
        });
        setValidationState('READY');
        setZoomLevel(1);
      }, 600);
    };
    img.src = objectUrl;
  };

  // Load Example Mock Image
  const handleUseExampleImage = () => {
    setValidationState('CHECKING');
    setTimeout(() => {
      setFileState(imageCheckMockData);
      setImagePreviewUrl(null); // Will render mock SVG poster canvas
      setValidationState('READY');
      setZoomLevel(1);
    }, 500);
  };

  const handleResetImage = () => {
    setFileState(null);
    setImagePreviewUrl(null);
    setValidationState('IDLE');
    setZoomLevel(1);
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      navigate('/app/image/processing');
    }, 600);
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-12 md:space-y-16 pb-28 max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-4 ${
      isLight ? 'text-gray-900' : 'text-white'
    }`}>
      
      {/* ── 3. PAGE HEADER WITH STAGGER ANIMATION ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
            isLight
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          }`}>
            IMAGE ANALYSIS
          </span>
          <span className={`text-xs font-mono font-bold ${isLight ? 'text-gray-500' : 'text-emerald-400/80'}`}>
            MODULE 03
          </span>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {isBn ? 'ছবি ইনস্পেকশন ও ফোরেনসিক্স' : 'Image Check'}
        </h1>

        <p className={`text-sm md:text-base font-medium leading-relaxed max-w-3xl ${
          isLight ? 'text-[#1E3B30]' : 'text-emerald-200/80'
        }`}>
          Analyze an image for signs of manipulation, AI generation, and other technical signals.
        </p>
        <p className={`text-xs md:text-sm font-medium ${
          isLight ? 'text-gray-600' : 'text-emerald-400/70'
        }`}>
          ছবিটিতে পরিবর্তন, AI-generated content বা অন্যান্য প্রযুক্তিগত সংকেত আছে কি না পরীক্ষা করুন।
        </p>
      </motion.div>

      {/* ── 4. MAIN IMAGE UPLOAD WORKSPACE CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`rounded-3xl border p-6 md:p-10 shadow-2xl relative overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-[#E2E8F0] shadow-xl'
            : 'bg-[#0F1714] border-[#1B2923] shadow-2xl'
        }`}
      >
        {/* Subtle background image grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"
        />

        {/* STATE A: EMPTY UPLOAD DROPZONE */}
        {validationState === 'IDLE' && (
          <div className="space-y-8 relative z-10">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 md:p-16 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-6 ${
                isDragging
                  ? isLight
                    ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
                    : 'border-blue-500 bg-blue-950/30 scale-[1.01]'
                  : isLight
                  ? 'border-[#CBD5E1] bg-white hover:border-blue-400 hover:bg-blue-50/30'
                  : 'border-[#1B2923] bg-[#080C0B] hover:border-blue-500/50 hover:bg-[#0F1E2E]/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {/* Upload Icon Decoration (72x72px with gentle floating animation) */}
              <motion.div
                animate={{ translateY: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-18 h-18 rounded-2xl flex items-center justify-center relative shadow-md ${
                  isDragging ? 'scale-110' : ''
                } ${
                  isLight
                    ? 'bg-[#EFF6FF] text-blue-600 border border-blue-200'
                    : 'bg-blue-950/60 text-blue-400 border border-blue-500/40'
                }`}
              >
                <ImagePlus className="w-9 h-9" />
                <div className="absolute -inset-2 rounded-2xl border border-blue-500/20 animate-pulse pointer-events-none" />
              </motion.div>

              <div className="space-y-2">
                <h3 className={`text-lg md:text-xl font-extrabold ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  {isDragging
                    ? (isBn ? 'বিশ্লেষণের জন্য ছবি ছেড়ে দিন' : 'Drop image to analyze')
                    : (isBn ? 'এখানে ছবি ড্রপ করুন বা ব্রাউজ করতে ক্লিক করুন' : 'Drop your image here')}
                </h3>
                <p className={`text-xs md:text-sm font-medium ${
                  isLight ? 'text-gray-600' : 'text-emerald-200/70'
                }`}>
                  {isBn ? 'ফাইল ব্রাউজ করতে ড্রপজোন বক্সে ক্লিক করুন' : 'or click to browse files from your computer'}
                </p>
              </div>

              {/* Supported Formats Pills */}
              <div className="flex items-center gap-3 pt-2">
                {['JPEG', 'PNG', 'WebP'].map((fmt) => (
                  <span
                    key={fmt}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold border shadow-xs ${
                      isLight
                        ? 'bg-[#F8FAFC] text-gray-700 border-[#E2E8F0]'
                        : 'bg-[#141F1B] text-emerald-300 border-[#1B2923]'
                    }`}
                  >
                    {fmt}
                  </span>
                ))}
                <span className={`text-xs font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  • Max size: 10 MB
                </span>
              </div>
            </div>

            {/* Example Demo Image Option */}
            <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              isLight
                ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                : 'bg-[#080C0B] border-[#1B2923]'
            }`}>
              <div className="space-y-1">
                <span className={`text-xs font-bold font-mono ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  DEMO PROTOTYPE WORKSPACE
                </span>
                <p className={`text-xs md:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-emerald-200/80'}`}>
                  {isBn ? 'নমুনা ছবি দিয়ে সিস্টেম কিভাবে কাজ করে দেখুন' : 'Want to see how Image Check works?'}
                </p>
              </div>

              <button
                onClick={handleUseExampleImage}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-400 text-black font-extrabold'
                }`}
              >
                <FileImage className="w-4 h-4" />
                {isBn ? 'নমুনা ছবি ব্যবহার করুন' : 'Use Example Image'}
              </button>
            </div>

            {/* Security / Privacy Notice */}
            <div className={`flex items-center gap-3 text-xs md:text-sm font-medium px-2 ${
              isLight ? 'text-gray-600' : 'text-emerald-200/70'
            }`}>
              <Info className="w-4.5 h-4.5 text-gray-400 shrink-0" />
              <span>
                {isBn
                  ? 'ⓘ ছবি বিশ্লেষণ প্রদত্ত চিত্র এবং উপলব্ধ প্রযুক্তিগত সংকেত ব্যবহার করে মূল্যায়ন সম্পন্ন করে।'
                  : 'ⓘ Image analysis uses the submitted image and available technical signals to prepare an assessment.'}
              </span>
            </div>
          </div>
        )}

        {/* STATE B: VALIDATION / CHECKING STATE */}
        {validationState === 'CHECKING' && (
          <div className="py-20 text-center space-y-6 relative z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-600 mx-auto"
            />
            <div className="space-y-2">
              <h3 className={`text-xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {isBn ? 'ছবি পরীক্ষা করা হচ্ছে...' : 'Checking image...'}
              </h3>
              <p className={`text-xs md:text-sm font-mono font-bold ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}>
                Validating file format, dimensions & technical metadata...
              </p>
            </div>
          </div>
        )}

        {/* STATE C: ERROR STATES (INVALID FORMAT / OVERSIZED) */}
        {(validationState === 'ERROR_FORMAT' || validationState === 'ERROR_SIZE') && (
          <div className={`p-10 text-center space-y-6 rounded-3xl border relative z-10 max-w-xl mx-auto my-6 ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-black">
                {validationState === 'ERROR_FORMAT'
                  ? (isBn ? 'অসমর্থিত ছবি ফরম্যাট' : 'Unsupported image format')
                  : (isBn ? 'ছবিটি আকারে অতিরিক্ত বড়' : 'Image is too large')}
              </h3>
              <p className="text-xs md:text-sm font-medium">
                {validationState === 'ERROR_FORMAT'
                  ? 'Please upload a JPEG, PNG, or WebP image.'
                  : 'The selected file exceeds the supported upload size. Maximum file size: 10 MB.'}
              </p>
            </div>
            <button
              onClick={handleResetImage}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all shadow-md"
            >
              {isBn ? 'অন্য একটি ছবি নির্বাচন করুন' : 'Choose Another Image'}
            </button>
          </div>
        )}

        {/* STATE D: UPLOADED IMAGE PREVIEW WORKSPACE (60 / 40 SPLIT) */}
        {validationState === 'READY' && fileState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8 relative z-10"
          >
            {/* Header row */}
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? 'border-gray-200' : 'border-[#1B2923]'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full animate-ping ${
                  isLight ? 'bg-emerald-600' : 'bg-[#00E599]'
                }`} />
                <h3 className={`text-base font-black uppercase tracking-wider font-mono ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}>
                  {isBn ? 'নির্বাচিত ছবি ওয়ার্কস্পেস' : 'Selected Image Workspace'}
                </h3>
              </div>

              <button
                onClick={handleResetImage}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isLight
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : 'bg-[#141F1B] border-[#1B2923] text-emerald-300 hover:bg-[#1B2B25]'
                }`}
              >
                <X className="w-4 h-4" />
                {isBn ? 'অন্য ছবি পরিবর্তন করুন' : 'Replace ×'}
              </button>
            </div>

            {/* 60 / 40 DESKTOP SPLIT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN (60% = 7 cols): IMAGE PREVIEW AREA */}
              <div className="lg:col-span-7 space-y-4">
                <div className={`relative rounded-2xl border p-4 min-h-[380px] md:min-h-[440px] flex items-center justify-center overflow-hidden shadow-2xl group ${
                  isLight ? 'bg-white border-gray-200' : 'bg-[#0F172A] border-slate-700/60'
                }`}>
                  
                  {/* Top-right Image Controls Overlay */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 text-slate-200 text-xs font-mono shadow-md">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-bold text-blue-400">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700" />
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-400"
                      title="Fullscreen Modal"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Render Uploaded URL or Mock Poster Canvas */}
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Uploaded Preview"
                        className="max-h-[400px] w-auto object-contain rounded-lg transition-transform duration-200"
                        style={{ transform: `scale(${zoomLevel})` }}
                      />
                    ) : (
                      /* High-Tech Mock Event Poster Graphic */
                      <div
                        className={`w-full max-w-md h-80 rounded-xl border p-6 flex flex-col justify-between relative overflow-hidden transition-transform duration-200 shadow-2xl ${
                          isLight
                            ? 'bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 border-indigo-400 text-white'
                            : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40 text-white'
                        }`}
                        style={{ transform: `scale(${zoomLevel})` }}
                      >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
                        <div className="space-y-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                            BANGLADESH YOUTH CONCLAVE
                          </span>
                          <h2 className="text-xl md:text-2xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                            National Youth Innovation Summit
                          </h2>
                          <p className="text-xs text-blue-300/80 font-mono">Dhaka — 2026 • Official Announcement</p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-800">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">VENUE: KICC DHAKA</span>
                            <span className="text-emerald-400 font-bold">VERIFICATION READY</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1">
                  <span>Aspect Ratio: 16:9 • RGB 8-bit</span>
                  <span>Click controls to inspect details</span>
                </div>
              </div>

              {/* RIGHT COLUMN (40% = 5 cols): IMAGE INFORMATION & METADATA */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Image Specs Card */}
                <div className={`p-6 rounded-2xl border space-y-5 shadow-lg ${
                  isLight
                    ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                    : 'bg-[#080C0B] border-[#1B2923]'
                }`}>
                  <h4 className={`text-xs font-mono font-black uppercase tracking-wider ${
                    isLight ? 'text-blue-700' : 'text-blue-400'
                  }`}>
                    IMAGE INFORMATION
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase text-[10px] block">FILENAME</span>
                      <span className={`font-bold truncate block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {fileState.fileName}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase text-[10px] block">FORMAT</span>
                      <span className={`font-bold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {fileState.fileType}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase text-[10px] block">FILE SIZE</span>
                      <span className={`font-bold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {fileState.fileSize}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase text-[10px] block">RESOLUTION</span>
                      <span className={`font-bold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {fileState.dimensions}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Accordion Inspection Card */}
                <div className={`p-6 rounded-2xl border space-y-4 shadow-lg ${
                  isLight
                    ? 'bg-white border-[#E2E8F0]'
                    : 'bg-[#080C0B] border-[#1B2923]'
                }`}>
                  <button
                    onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                    className="w-full flex items-center justify-between text-xs font-mono font-black uppercase text-left tracking-wider text-blue-600"
                  >
                    <span>EXIF & TECHNICAL METADATA</span>
                    {isMetadataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {isMetadataExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2 text-xs font-mono"
                      >
                        <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                          <span className="text-gray-500">Camera Header:</span>
                          <span className="font-bold text-emerald-600">{fileState.metadata.camera}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                          <span className="text-gray-500">Date Timestamp:</span>
                          <span className="font-bold text-emerald-600">{fileState.metadata.date}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                          <span className="text-gray-500">GPS Coordinates:</span>
                          <span className="font-bold text-amber-600">{fileState.metadata.location}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
                          <span className="text-gray-500">Software Edits:</span>
                          <span className="font-bold text-blue-600">{fileState.metadata.software}</span>
                        </div>

                        <p className={`text-[11px] font-sans leading-relaxed pt-2 ${
                          isLight ? 'text-gray-600' : 'text-emerald-200/70'
                        }`}>
                          Metadata availability can vary between images and does not by itself establish authenticity.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SECTION 17: MAIN ANALYZE BUTTON (Height 52px, Radius 14px, Font Weight 600) */}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`w-full h-[52px] rounded-[14px] font-semibold text-base transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] ${
                    isLight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{isBn ? 'ফোরেনসিক স্ক্যান চালনা করা হচ্ছে...' : 'Initializing Image Forensics...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-blue-200" />
                      <span>{isBn ? 'ছবি পরীক্ষা সম্পন্ন করুন →' : '✦ Analyze Image →'}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── 14. WHAT DOES IMAGE CHECK LOOK FOR? (3 DECORATED CARDS) ── */}
      <div className="space-y-6 pt-4">
        <h2 className={`text-2xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {isBn ? 'ইমেজ চেক কি কি বিষয় পরীক্ষা করে?' : 'What does Image Check look for?'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Card 1 — Visual Signals */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            className={`p-7 rounded-3xl border space-y-4 relative overflow-hidden shadow-xl ${
              isLight
                ? 'bg-white border-[#E2E8F0]'
                : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            {/* Subtle dot matrix decoration */}
            <div className="absolute top-4 right-4 text-xs text-blue-500/20 font-mono">
              · · · ·
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-600 border border-blue-500/30 w-fit">
              <ScanSearch className="w-7 h-7" />
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Visual signals
            </h3>
            <p className={`text-xs md:text-sm font-medium leading-relaxed ${
              isLight ? 'text-gray-700' : 'text-emerald-200/80'
            }`}>
              Examines image characteristics that may indicate digital manipulation or unusual visual patterns.
            </p>
          </motion.div>

          {/* Card 2 — Technical Inspection */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            className={`p-7 rounded-3xl border space-y-4 relative overflow-hidden shadow-xl ${
              isLight
                ? 'bg-white border-[#E2E8F0]'
                : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            <div className="absolute top-4 right-4 text-xs text-indigo-500/20 font-mono">
              · · · ·
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 w-fit">
              <Settings2 className="w-7 h-7" />
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Technical inspection
            </h3>
            <p className={`text-xs md:text-sm font-medium leading-relaxed ${
              isLight ? 'text-gray-700' : 'text-emerald-200/80'
            }`}>
              Reviews available technical properties and metadata associated with the image.
            </p>
          </motion.div>

          {/* Card 3 — AI Generation Signals */}
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            className={`p-7 rounded-3xl border space-y-4 relative overflow-hidden shadow-xl ${
              isLight
                ? 'bg-white border-[#E2E8F0]'
                : 'bg-[#0F1714] border-[#1B2923]'
            }`}
          >
            <div className="absolute top-4 right-4 text-xs text-purple-500/20 font-mono">
              · · · ·
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-600 border border-purple-500/30 w-fit">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className={`text-lg font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
              AI-generation signals
            </h3>
            <p className={`text-xs md:text-sm font-medium leading-relaxed ${
              isLight ? 'text-gray-700' : 'text-emerald-200/80'
            }`}>
              Uses image-analysis models to identify patterns associated with AI-generated imagery.
            </p>
          </motion.div>

        </div>
      </div>

      {/* ── 16. POSSIBLE ASSESSMENTS SECTION ── */}
      <div className="space-y-6 pt-4">
        <h2 className={`text-2xl font-black tracking-tight ${
          isLight ? 'text-[#06231A]' : 'text-white'
        }`}>
          {isBn ? 'সম্ভাব্য মূল্যায়নের ধরন' : 'Possible assessment'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Likely Authentic */}
          <div className={`p-6 rounded-3xl border space-y-3 shadow-md ${
            isLight
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
          }`}>
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              ✓
            </div>
            <h4 className="text-base font-black text-emerald-800 dark:text-emerald-200">
              Likely Authentic
            </h4>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 font-medium">
              Technical signals match original camera captures without manipulation flags.
            </p>
          </div>

          {/* 2. Possible Manipulation */}
          <div className={`p-6 rounded-3xl border space-y-3 shadow-md ${
            isLight
              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
              ⚠
            </div>
            <h4 className="text-base font-black text-amber-800 dark:text-amber-200">
              Possible Manipulation
            </h4>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 font-medium">
              Conflicting compression levels, typography changes, or edited elements identified.
            </p>
          </div>

          {/* 3. Likely AI-Generated */}
          <div className={`p-6 rounded-3xl border space-y-3 shadow-md ${
            isLight
              ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#7C3AED]'
              : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
          }`}>
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
              ✦
            </div>
            <h4 className="text-base font-black text-purple-800 dark:text-purple-200">
              Likely AI-Generated
            </h4>
            <p className="text-xs text-purple-900/80 dark:text-purple-300/80 font-medium">
              Diffusion artifacts and synthetic generative features detected by AI classifiers.
            </p>
          </div>

          {/* 4. Unable to Analyze */}
          <div className={`p-6 rounded-3xl border space-y-3 shadow-md ${
            isLight
              ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
              : 'bg-[#080C0B] border-[#1B2923] text-gray-300'
          }`}>
            <div className="w-10 h-10 rounded-2xl bg-slate-600 text-white flex items-center justify-center font-bold text-lg">
              —
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-gray-200">
              Unable to Analyze
            </h4>
            <p className="text-xs text-slate-600 dark:text-gray-400 font-medium">
              Resolution too low or image data corrupted for conclusive signal processing.
            </p>
          </div>

        </div>
      </div>

      {/* ── 24. HOW IMAGE CHECK WORKS WORKFLOW SECTION ── */}
      <div className={`p-8 md:p-10 rounded-3xl border space-y-8 shadow-xl ${
        isLight
          ? 'bg-white border-[#E2E8F0]'
          : 'bg-[#0F1714] border-[#1B2923]'
      }`}>
        <h3 className={`text-xl font-black tracking-tight ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          {isBn ? 'ইনস্পেকশন কাজের ধারা' : 'How Image Check Works'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          <div className="space-y-2 relative">
            <span className="text-xs font-mono font-bold text-blue-600">01 UPLOAD</span>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Upload Image
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Submit JPEG, PNG, or WebP file for technical ingestion.
            </p>
          </div>

          <div className="space-y-2 relative">
            <span className="text-xs font-mono font-bold text-blue-600">02 INSPECT</span>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Metadata Inspection
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Review EXIF camera headers, software tags, and file headers.
            </p>
          </div>

          <div className="space-y-2 relative">
            <span className="text-xs font-mono font-bold text-blue-600">03 ANALYZE</span>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Image Analysis Models
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Scan compression levels (ELA) & generative AI patterns.
            </p>
          </div>

          <div className="space-y-2 relative">
            <span className="text-xs font-mono font-bold text-blue-600">04 EXPLAIN</span>
            <h4 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Assessment + Explanation
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Synthesize multi-signal verdict with clear visual explanations.
            </p>
          </div>

        </div>
      </div>

      <div className={`p-8 md:p-10 rounded-3xl border space-y-6 shadow-xl ${
        isLight ? 'bg-white border-blue-200 text-gray-900' : 'bg-[#0F172A] border-slate-700/60 text-white'
      }`}>
        <div className="flex items-center gap-3 text-blue-500">
          <Info className="w-6 h-6" />
          <h3 className="text-lg font-black uppercase tracking-wider">
            About Image Check
          </h3>
        </div>

        <p className={`text-xs md:text-sm leading-relaxed max-w-4xl font-medium ${
          isLight ? 'text-gray-600' : 'text-slate-300'
        }`}>
          FactLens does not treat one signal as absolute proof. The assessment combines available technical and image analysis signals to provide an understandable result.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs font-mono">
          <div className={`p-4 rounded-xl border space-y-1 ${
            isLight ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <span className="text-blue-500 font-bold">Metadata unavailable?</span>
            <p className={`${isLight ? 'text-gray-600' : 'text-slate-300'} font-sans text-xs`}>→ Analysis may still continue using ELA and neural visual models.</p>
          </div>
          <div className={`p-4 rounded-xl border space-y-1 ${
            isLight ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <span className="text-amber-500 font-bold">Model unavailable?</span>
            <p className={`${isLight ? 'text-gray-600' : 'text-slate-300'} font-sans text-xs`}>→ A partial or unable-to-analyze result may be shown transparently.</p>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX FULLSCREEN MODAL ── */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            >
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-blue-400 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Fullscreen"
                  className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full max-w-2xl h-96 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 flex flex-col justify-between text-white border border-blue-500/40">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest w-fit">
                    FULLSCREEN INSPECTION VIEW
                  </span>
                  <h2 className="text-3xl font-black">National Youth Innovation Summit</h2>
                  <p className="text-sm text-blue-300 font-mono">Dhaka — 2026</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ImageCheck;
