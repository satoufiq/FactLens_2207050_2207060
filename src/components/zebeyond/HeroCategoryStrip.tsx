import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  ShieldAlert, 
  FileCheck2, 
  Eye, 
  GraduationCap, 
  Bot, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  titleEn: string;
  titleBn: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  stats: string;
  color: string;
  description: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'rumor',
    titleEn: 'Viral Claim Verification',
    titleBn: 'ভাইরাল রিউমার স্ক্যানার',
    subtitle: 'Breaking News & Claims',
    icon: <Search className="w-8 h-8 text-[#00E599]" />,
    badge: '99.2% Accuracy',
    stats: '14,280 Verifications',
    color: '#00E599',
    description: 'Real-time cross-verification of viral Facebook and WhatsApp rumor statements against government archives.'
  },
  {
    id: 'phishing',
    titleEn: 'Phishing & Smishing Audit',
    titleBn: 'ফিশিং লিঙ্ক ও স্ক্যাম',
    subtitle: 'Smishing & Fake URLs',
    icon: <ShieldAlert className="w-8 h-8 text-emerald-400" />,
    badge: 'Threat Detection',
    stats: '8,410 Scams Flagged',
    color: '#10B981',
    description: 'Instant structural analysis of suspicious SMS links, bank phishing domains, and lottery impersonations.'
  },
  {
    id: 'gazette',
    titleEn: 'PID Circular Audit',
    titleBn: 'সরকারি পিআইডি গেজেট',
    subtitle: 'Ministry Circular Audit',
    icon: <FileCheck2 className="w-8 h-8 text-teal-300" />,
    badge: 'PID Verified',
    stats: '3,120 Circulars',
    color: '#5EEAD4',
    description: 'Direct OCR index matching with official Press Information Department (PID) gazettes and advisories.'
  },
  {
    id: 'forensics',
    titleEn: 'Photoshop & Deepfake Inspector',
    titleBn: 'ছবি বিকৃতি ও ফটোশপ',
    subtitle: 'Metadata & Forensics',
    icon: <Eye className="w-8 h-8 text-cyan-400" />,
    badge: 'ELA Forensics',
    stats: '9,850 Photos Scanned',
    color: '#22D3EE',
    description: 'Detects Photoshop manipulation, fake text overlays on newspaper screenshots, and synthesized headlines.'
  },
  {
    id: 'academic',
    titleEn: 'University & Exam Notices',
    titleBn: 'পরীক্ষা ও শিক্ষা সূচি',
    subtitle: 'University Notice Audit',
    icon: <GraduationCap className="w-8 h-8 text-[#00E599]" />,
    badge: 'Board Authenticated',
    stats: '5,600 Notices',
    color: '#00E599',
    description: 'Verifies fake exam cancellation notices, HSC result rumors, and varsity routine updates.'
  },
  {
    id: 'bot',
    titleEn: 'Autonomous Fact Crawler',
    titleBn: 'স্বয়ংক্রিয় ফ্যাক্টবট',
    subtitle: 'Continuous Crawler',
    icon: <Bot className="w-8 h-8 text-emerald-300" />,
    badge: '24/7 Active',
    stats: 'Real-time Ingest',
    color: '#6EE7B7',
    description: 'Autonomous multi-modal crawler detecting rumor spikes across Bangladesh digital channels.'
  }
];

export default function HeroCategoryStrip() {
  const [activeId, setActiveId] = useState<string>('rumor');
  const activeCategory = CATEGORIES.find(c => c.id === activeId) || CATEGORIES[0];

  return (
    <div className="w-full space-y-6">
      {/* 6 Category Glass Cards Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {CATEGORIES.map((cat, idx) => {
          const isActive = cat.id === activeId;
          return (
            <motion.button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`relative rounded-2xl p-4 text-left flex flex-col justify-between min-h-[140px] transition-all duration-300 cursor-pointer overflow-hidden ${
                isActive
                  ? 'bg-[#0F1714] border-2 border-[#00E599] shadow-[0_0_25px_rgba(0,229,153,0.3)]'
                  : 'bg-[#0F1714]/80 border border-[#1B2923] hover:border-[#00E599]/40 hover:bg-[#0F1714]'
              }`}
            >
              {/* Top Row: Icon + Arrow */}
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl transition-all ${
                  isActive ? 'bg-[#00E599]/20' : 'bg-[#1B2923]/50'
                }`}>
                  {cat.icon}
                </div>
                <ArrowUpRight className={`w-4 h-4 transition-all ${
                  isActive ? 'text-[#00E599] opacity-100' : 'text-[#8E9E97] opacity-40'
                }`} />
              </div>

              {/* Bottom Labels */}
              <div className="space-y-1 mt-3">
                <span className="text-[10px] font-mono font-bold text-[#00E599] uppercase tracking-wider block">
                  0{idx + 1} // MODULE
                </span>
                <h4 className="text-xs font-bold text-white leading-tight font-sans line-clamp-1">
                  {cat.titleEn}
                </h4>
                <p className="text-[10px] text-[#00E599] font-bengali line-clamp-1">
                  {cat.titleBn}
                </p>
              </div>

              {/* Active Indicator Line */}
              {isActive && (
                <motion.div
                  layoutId="activeCategoryBorder"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#00E599]"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Category Feature Banner Box */}
      <motion.div
        key={activeCategory.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0F1714] border border-[#1B2923] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#00E599]/15 rounded-xl border border-[#00E599]/30 text-[#00E599] shrink-0">
            {activeCategory.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#00E599] bg-[#00E599]/10 px-2.5 py-0.5 rounded-full border border-[#00E599]/30 uppercase">
                {activeCategory.badge}
              </span>
              <span className="text-xs font-mono text-[#8E9E97]">• {activeCategory.stats}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {activeCategory.titleEn} <span className="text-sm font-bengali text-[#00E599] font-normal">({activeCategory.titleBn})</span>
            </h3>
            <p className="text-xs text-[#8E9E97] max-w-2xl">
              {activeCategory.description}
            </p>
          </div>
        </div>

        <a
          href="/app"
          className="inline-flex items-center gap-2 bg-[#00E599] hover:bg-[#00F5A0] text-black text-xs font-black px-5 py-3 rounded-full shadow-[0_0_20px_rgba(0,229,153,0.3)] transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Scan Now
        </a>
      </motion.div>
    </div>
  );
}
