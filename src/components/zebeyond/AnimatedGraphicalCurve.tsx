import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export interface CurveNode {
  id: string;
  label: string;
  labelBn: string;
  cx: number; // percentage along curve X (0-100)
  cy: number; // percentage along curve Y (0-100)
  sourcesCount: number;
  accuracyRate: string;
  latencyMs: string;
  icon: string;
  details: string;
}

const NODES: CurveNode[] = [
  {
    id: 'keyword',
    label: 'Keyword Match Index',
    labelBn: 'স্থানীয় ফ্যাক্ট-চেক ইনডেক্স',
    cx: 8,
    cy: 88,
    sourcesCount: 2,
    accuracyRate: '68.4%',
    latencyMs: '120ms',
    icon: '🔍',
    details: 'Initial fast-lookup vector search against local fact-check archives and keyword databases.'
  },
  {
    id: 'news-feed',
    label: 'News RSS Feed Crawl',
    labelBn: 'সংবাদ পোর্টাল ফিড',
    cx: 19,
    cy: 82,
    sourcesCount: 8,
    accuracyRate: '79.1%',
    latencyMs: '350ms',
    icon: '📰',
    details: 'Scans major Bangladeshi news portals (Prothom Alo, Daily Star, Somoy TV, Jamuna TV) for key event timestamps.'
  },
  {
    id: 'ocr-scan',
    label: 'Bengali Screenshot OCR',
    labelBn: 'বাংলা ওসিআর এক্সট্রাকশন',
    cx: 32,
    cy: 71,
    sourcesCount: 14,
    accuracyRate: '86.5%',
    latencyMs: '680ms',
    icon: '📸',
    details: 'Extracts Bengali and English text from social media screenshots, WhatsApp forwards, and viral news card images.'
  },
  {
    id: 'bangabert',
    label: 'BangaBERT Stance Model',
    labelBn: 'নিউরাল স্ট্যান্স এনকোডার',
    cx: 47,
    cy: 54,
    sourcesCount: 22,
    accuracyRate: '93.2%',
    latencyMs: '1.2s',
    icon: '🧠',
    details: 'BangaBERT transformer NLP model calculates semantic stance agreement between claim text and official statements.'
  },
  {
    id: 'gazette',
    label: 'PID Gazette Archive',
    labelBn: 'পিআইডি ও সরকারি গেজেট',
    cx: 60,
    cy: 39,
    sourcesCount: 35,
    accuracyRate: '96.8%',
    latencyMs: '1.8s',
    icon: '📜',
    details: 'Queries Press Information Department (PID) gazettes, ministry circulars, and university registrar notifications.'
  },
  {
    id: 'forensics',
    label: 'Deepfake & Photo ELA',
    labelBn: 'ডিপফেক ও ছবি ফরেনসিক',
    cx: 73,
    cy: 28,
    sourcesCount: 42,
    accuracyRate: '98.7%',
    latencyMs: '2.4s',
    icon: '🖼️',
    details: 'Performs Error Level Analysis (ELA) and EXIF metadata inspection to detect Photoshop card edits and GAN deepfakes.'
  },
  {
    id: 'phishing',
    label: 'Smishing & URL Audit',
    labelBn: 'ফিশিং লিঙ্ক ও ডোমেইন স্ক্যান',
    cx: 84,
    cy: 22,
    sourcesCount: 50,
    accuracyRate: '99.4%',
    latencyMs: '3.1s',
    icon: '🛡️',
    details: 'Scans non-bank MFS URLs, typo-squatted lottery links, and urgency pressure signals in fraudulent SMS text.'
  },
  {
    id: 'consensus',
    label: 'Multimodal Consensus',
    labelBn: 'মাল্টি-সোর্স কনসেনসাস',
    cx: 93,
    cy: 20,
    sourcesCount: 60,
    accuracyRate: '99.9%',
    latencyMs: '3.8s',
    icon: '✅',
    details: 'Aggregates confidence scores across all 60+ verified source feeds to generate auditable Bengali evidence reports.'
  }
];

export default function AnimatedGraphicalCurve() {
  const [activeNodeId, setActiveNodeId] = useState<string>('bangabert');
  const activeNode = NODES.find(n => n.id === activeNodeId) || NODES[3];

  return (
    <div className="w-full bg-[#0F1714] border border-[#1B2923] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#E2E8E5] space-y-6">
      
      {/* 1. Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B2923] pb-6">
        
        {/* Left Side Stat Badges */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-[#00E599] tracking-tight font-mono">99.4%</span>
            <p className="text-[11px] font-mono text-[#8E9E97] uppercase font-bold">OCR & STANCE ACCURACY</p>
          </div>

          <div className="hidden sm:block w-px h-8 bg-[#1B2923]" />

          <div className="space-y-0.5">
            <span className="text-2xl font-black text-white tracking-tight font-mono">60+ Sources</span>
            <p className="text-[11px] font-mono text-[#8E9E97] uppercase font-bold">PID GASETTE & PRESS ARCHIVES</p>
          </div>
        </div>

        {/* Right Side Action Button */}
        <a 
          href="/app" 
          className="inline-flex items-center gap-2 bg-[#00E599] hover:bg-[#00F5A0] text-black text-xs font-black px-5 py-3 rounded-full shadow-[0_0_20px_rgba(0,229,153,0.3)] transition-all shrink-0 self-start sm:self-auto"
        >
          Launch Verification Workspace
          <ArrowRight size={14} />
        </a>

      </div>

      {/* 2. Main Graphical Canvas Container */}
      <div className="relative bg-[#080C0B] rounded-2xl p-6 sm:p-8 border border-[#1B2923] overflow-hidden min-h-[420px] flex flex-col justify-between">
        
        {/* Subtle CAD Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1B2923_1px,transparent_1px),linear-gradient(to_bottom,#1B2923_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />

        {/* Top Floating Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 bg-[#0F1714] border border-[#00E599]/40 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold text-[#00E599] shadow-sm">
            <TrendingUp size={14} />
            <span>ACCURACY vs GASETTE SOURCE DENSITY</span>
          </div>

          <span className="text-[10px] font-mono text-[#8E9E97] hidden sm:block">
            HOVER/CLICK PIPELINE NODES TO INSPECT LOGIC
          </span>
        </div>

        {/* 3. The Interactive SVG Graph Canvas */}
        <div className="relative z-10 w-full h-[280px] sm:h-[320px] my-4">
          
          {/* Y-Axis Label (Left) */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-[#8E9E97] pr-2 border-r border-[#1B2923]">
            <span className="text-[#00E599] font-extrabold">HIGH</span>
            <div className="-rotate-90 origin-center text-[9px] tracking-widest text-[#8E9E97] whitespace-nowrap my-auto font-black uppercase">
              ACCURACY & EVIDENCE DENSITY
            </div>
            <span>LOW</span>
          </div>

          {/* X-Axis Label (Bottom) */}
          <div className="absolute bottom-0 left-12 right-0 flex items-center justify-between text-[10px] font-mono font-bold text-[#8E9E97] pt-2 border-t border-[#1B2923]">
            <span>1 FEED</span>
            <span className="tracking-widest text-[#8E9E97] font-black uppercase">NUMBER OF CONSULTED EVIDENCE SOURCES</span>
            <span className="text-[#00E599] font-extrabold">60+ FEEDS</span>
          </div>

          {/* SVG Canvas for Smooth Curved Line */}
          <svg className="w-full h-full overflow-visible pl-12 pb-6">
            <defs>
              <linearGradient id="curveGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E599" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#00D2C2" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00E599" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Background Curve Area Glow Fill */}
            <path
              d="M 20 230 Q 150 220 300 150 T 650 40 L 650 240 L 20 240 Z"
              fill="url(#curveGradient)"
              opacity="0.1"
            />

            {/* Main Smooth Mint Curved Path */}
            <path
              d="M 20 230 C 120 230, 200 180, 320 130 C 450 80, 520 45, 650 40"
              fill="none"
              stroke="#00E599"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          {/* Render Interactive Node Points positioned along the curve */}
          <div className="absolute inset-0 pl-12 pb-6 pointer-events-none">
            {NODES.map((node) => {
              const isActive = node.id === activeNodeId;
              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.cx}%`,
                    top: `${node.cy}%`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                  onClick={() => setActiveNodeId(node.id)}
                  onMouseEnter={() => setActiveNodeId(node.id)}
                >
                  {/* Vertical Dotted Guideline when active */}
                  {isActive && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-[200px] border-l-2 border-dashed border-[#00E599]/60 pointer-events-none" />
                  )}

                  {/* Node Circle Pin */}
                  <div className={`relative flex flex-col items-center transition-all duration-300 ${
                    isActive ? 'scale-125 z-30' : 'group-hover:scale-110 z-20'
                  }`}>
                    
                    {/* Floating Label above pin */}
                    <span className={`text-[10px] font-mono font-extrabold whitespace-nowrap mb-1 px-2.5 py-0.5 rounded-full transition-all shadow-sm ${
                      isActive
                        ? 'bg-[#00E599] text-black font-bold'
                        : 'bg-[#0F1714] text-[#E2E8E5] border border-[#1B2923]'
                    }`}>
                      {node.icon} {node.label.split(' ')[0]}
                    </span>

                    {/* Pulse outer ring */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#00E599] shadow-[0_0_18px_#00E599]'
                        : 'bg-[#00E599]/20 group-hover:bg-[#00E599]/40'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-[#060A09]' : 'bg-[#00E599]'
                      }`} />
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* 4. Active Node Detail Floating Popover */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 bg-[#0F1714] text-white border border-[#00E599]/40 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#00E599]/15 text-[#00E599] flex items-center justify-center text-2xl font-black shrink-0 border border-[#00E599]/30">
                {activeNode.icon}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded-full border border-[#00E599]/30">
                    STAGE {NODES.indexOf(activeNode) + 1} OF 8
                  </span>
                  <span className="text-xs text-[#8E9E97] font-mono">• {activeNode.latencyMs} latency</span>
                </div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {activeNode.label} <span className="text-xs font-bengali text-[#00E599] font-normal">({activeNode.labelBn})</span>
                </h4>
                <p className="text-xs text-[#8E9E97] max-w-xl">
                  {activeNode.details}
                </p>
              </div>
            </div>

            {/* Node Quick Stats */}
            <div className="flex items-center gap-4 shrink-0 bg-[#080C0B] p-3 rounded-xl border border-[#1B2923]">
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#8E9E97] block uppercase">Accuracy</span>
                <span className="text-sm font-black text-[#00E599] font-mono">{activeNode.accuracyRate}</span>
              </div>
              <div className="w-px h-6 bg-[#1B2923]" />
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#8E9E97] block uppercase">Sources</span>
                <span className="text-sm font-black text-white font-mono">{activeNode.sourcesCount} Feeds</span>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
