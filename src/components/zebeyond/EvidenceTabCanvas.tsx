import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Landmark, 
  Newspaper, 
  Search, 
  GraduationCap, 
  Download, 
  Cpu,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface TabItem {
  id: string;
  tabLabel: string;
  categoryBadge: string;
  badgeIcon: React.ReactNode;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  pdfFilename: string;
  checksum: string;
  specs: { label: string; value: string }[];
}

const EVIDENCE_TABS: TabItem[] = [
  {
    id: 'pid',
    tabLabel: 'MINISTRY PID',
    categoryBadge: 'GOVERNMENT GAZETTE',
    badgeIcon: <Building2 size={14} style={{ color: '#00E599' }} />,
    title: 'Press Information Department (PID) Gazette Audit',
    titleBn: 'প্রধানমন্ত্রীর কার্যালয় ও তথ্য মন্ত্রণালয়ের গেজেট যাচাই',
    description: 'FactLens connects directly to official Ministry Press Information Department archives to cross-reference gazette numbers, dates, and official seals against submitted claims.',
    descriptionBn: 'অফিসিয়াল পিআইডি প্রেস নোটের সাথে সংবাদের সময়সীমা ও মেটাডাটা তুলনা করে ভুয়া প্রজ্ঞাপন চিহ্নিত করা হয়।',
    pdfFilename: 'pid_gazette_audit_report_2026.pdf',
    checksum: 'SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    specs: [
      { label: 'Ingest Speed', value: '1.2 sec' },
      { label: 'Archive Depth', value: '2018 - 2026' },
      { label: 'Seal OCR', value: '99.8% Match' }
    ]
  },
  {
    id: 'bbank',
    tabLabel: 'BANGLADESH BANK',
    categoryBadge: 'FINANCIAL CIRCULAR',
    badgeIcon: <Landmark size={14} style={{ color: '#00E599' }} />,
    title: 'Financial & Banking Circular Verification',
    titleBn: 'বাংলাদেশ ব্যাংক ও আর্থিক খাতের সার্কুলার অথেন্টিকেশন',
    description: 'Verifies fake interest rate announcements, fake mobile banking cashback rules (bKash/Nagad), and fraudulent loan scheme PDF circulars.',
    descriptionBn: 'ভুয়া ক্যাশব্যাক অফার, সুদের হার ও জালিয়াতিপূর্ণ এমএফএস মেসেজ প্রতিরোধে কেন্দ্রীয় ব্যাংকের ডাটাবেজ অডিট।',
    pdfFilename: 'bb_circular_verification_spec.pdf',
    checksum: 'SHA256: 8f4e0012a64c4897f22312b9d0092e01',
    specs: [
      { label: 'Domain Trust', value: '100% Certified' },
      { label: 'API Latency', value: '450ms' },
      { label: 'Anti-Smishing', value: 'Active' }
    ]
  },
  {
    id: 'press',
    tabLabel: 'NATIONAL PRESS',
    categoryBadge: 'MEDIA ARCHIVE',
    badgeIcon: <Newspaper size={14} style={{ color: '#00E599' }} />,
    title: 'National Press & Media Cross-Reference',
    titleBn: 'জাতীয় দৈনিক ও টিভি সংবাদের ডিজিটাল অন-এয়ার হিস্ট্রি',
    description: 'Cross-checks fake Photoshop cards mimicking major TV channels (Prothom Alo, Somoy TV, Jamuna TV) against real published article feeds.',
    descriptionBn: 'প্রথম আলো, সময় টিভি কিংবা যমুনা টিভির ভুয়া ফটোশপ কার্ড চিহ্নিত করার রিয়েল-টাইম মিডিয়া ফিড।',
    pdfFilename: 'media_card_forensics_whitepaper.pdf',
    checksum: 'SHA256: d7a8fbb307d7809469ca9abcb0082e4f',
    specs: [
      { label: 'Media Outlets', value: '48 Outlets' },
      { label: 'Font Match', value: 'Strict' },
      { label: 'Reverse Search', value: 'Enabled' }
    ]
  },
  {
    id: 'factcheck',
    tabLabel: 'FACT-CHECK REGISTRY',
    categoryBadge: 'CONVERGENCE MATRIX',
    badgeIcon: <Search size={14} style={{ color: '#00E599' }} />,
    title: 'Unified Fact-Checking Organization Registry',
    titleBn: 'অনুমোদিত ফ্যাক্ট-চেকিং সংস্থার সার্বজনীন ডাটাবেজ',
    description: 'Aggregates past debunked viral claims from certified IFCN fact-checkers in Bangladesh to eliminate duplicate investigation work.',
    descriptionBn: 'সার্টিফাইড ফ্যাক্ট-চেকারদের পূর্ববর্তী অনুসন্ধান ফলাফল দ্রুত খুঁজে পাওয়ার সুবিধা।',
    pdfFilename: 'ifcn_bangladesh_consensus_2026.pdf',
    checksum: 'SHA256: 91b2c452e896e301290bb0021590823c',
    specs: [
      { label: 'IFCN Audit', value: 'Compliant' },
      { label: 'Historical Claims', value: '120,000+' },
      { label: 'Semantic Similarity', value: 'Cosine 0.94' }
    ]
  },
  {
    id: 'varsity',
    tabLabel: 'UNIVERSITY PORTAL',
    categoryBadge: 'ACADEMIC AUDIT',
    badgeIcon: <GraduationCap size={14} style={{ color: '#00E599' }} />,
    title: 'University & Board Notice Verification',
    titleBn: 'ঢাকা বিশ্ববিদ্যালয় ও শিক্ষা বোর্ডের নোটিশ ভেরিফিকেশন',
    description: 'Detects viral false announcements regarding exam postponement, HSC routine changes, and university admission deadlines.',
    descriptionBn: 'এইচএসসি পরীক্ষা স্থগিতকরণ ও ভর্তি পরীক্ষার ভুয়া ভাইরাল নোটিশ সরাসরি বোর্ডের নোটিশ বোর্ডের সাথে মিলান।',
    pdfFilename: 'academic_notice_auth_system.pdf',
    checksum: 'SHA256: 4192b0c1590a98d33190ab7b01980072',
    specs: [
      { label: 'Board Feeds', value: '11 Boards' },
      { label: 'Routine OCR', value: 'Pixel Precise' },
      { label: 'Direct Sync', value: 'Live' }
    ]
  }
];

export default function EvidenceTabCanvas() {
  const [activeTabId, setActiveTabId] = useState<string>('pid');
  const activeTab = EVIDENCE_TABS.find(t => t.id === activeTabId) || EVIDENCE_TABS[0];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      
      {/* 1. Sleek Navigation Tabs Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 12 }} className="no-scrollbar">
        {EVIDENCE_TABS.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 800,
                letterSpacing: '0.05em',
                border: `1px solid ${isActive ? '#00E599' : '#1B2923'}`,
                background: isActive ? '#00E599' : '#0F1714',
                color: isActive ? '#000000' : '#8E9E97',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 0 20px rgba(0, 229, 153, 0.35)' : 'none',
              }}
            >
              {tab.tabLabel}
            </button>
          );
        })}
      </div>

      {/* 2. Main High-Legibility Dark Glassmorphic Card Container */}
      <div style={{
        background: '#0F1714',
        border: '1px solid rgba(0, 229, 153, 0.3)',
        borderRadius: 24,
        padding: '28px 32px',
        boxShadow: '0 0 50px rgba(0, 229, 153, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 28, alignItems: 'center' }}
          >
            {/* Left Column: Details & Evidence Info */}
            <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Category Pill Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.12)', padding: '4px 14px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)', width: 'fit-content' }}>
                {activeTab.badgeIcon}
                <span>{activeTab.categoryBadge}</span>
              </div>

              {/* Title & Bengali Subtitle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                  {activeTab.title}
                </h3>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#00E599', margin: 0 }}>
                  {activeTab.titleBn}
                </p>
              </div>

              {/* English & Bengali Description Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13.5, color: '#8E9E97', margin: 0, lineHeight: 1.6 }}>
                  {activeTab.description}
                </p>
                <div style={{ padding: 14, background: '#060A09', borderLeft: '3px solid #00E599', borderRadius: '0 12px 12px 0', fontSize: 13, color: '#E2E8E5', lineHeight: 1.5, fontWeight: 600 }}>
                  📌 {activeTab.descriptionBn}
                </div>
              </div>

              {/* Key Technical Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 4 }}>
                {activeTab.specs.map((spec, i) => (
                  <div key={i} style={{ padding: 12, background: '#060A09', borderRadius: 12, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', textTransform: 'uppercase', fontWeight: 700 }}>{spec.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF' }}>{spec.value}</span>
                  </div>
                ))}
              </div>

              {/* Download PDF & Checksum CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 6, flexWrap: 'wrap' }}>
                <a
                  href={`#download-${activeTab.pdfFilename}`}
                  onClick={(e) => { e.preventDefault(); alert(`FactLens Verification Whitepaper PDF (${activeTab.pdfFilename}) downloading...`); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 900,
                    background: '#00E599',
                    color: '#000000',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 0 20px rgba(0, 229, 153, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Download Evidence Spec PDF
                  <Download size={14} />
                </a>

                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#5A6E64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={activeTab.checksum}>
                  {activeTab.checksum}
                </span>
              </div>

            </div>

            {/* Right Column: 3D evidence integration matrix visualizer */}
            <div style={{ gridColumn: 'span 5' }}>
              <div style={{
                background: '#060A09',
                borderRadius: 20,
                padding: 24,
                border: '1px solid #1B2923',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 320,
              }}>
                
                {/* Background CAD Grid Overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, #1B2923 1px, transparent 1px), linear-gradient(to bottom, #1B2923 1px, transparent 1px)', backgroundSize: '1.5rem 1.5rem', opacity: 0.3, pointerEvents: 'none' }} />

                {/* 3D Animated Orbital Assembly */}
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  
                  <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    
                    {/* Outer Rotating Orbital Ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px dashed rgba(0, 229, 153, 0.4)' }}
                    />

                    {/* Middle Counter-Rotating Ring */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', border: '1px dashed rgba(0, 210, 194, 0.5)' }}
                    />

                    {/* Central FactLens Core Chip */}
                    <div style={{
                      width: 100,
                      height: 100,
                      background: '#0F1714',
                      borderRadius: 20,
                      padding: 12,
                      border: '1.5px solid #00E599',
                      boxShadow: '0 0 30px rgba(0, 229, 153, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      gap: 4,
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00E599', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Cpu size={20} />
                      </div>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#00E599', fontWeight: 900, letterSpacing: '0.05em' }}>FACTLENS CORE</span>
                      <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#8E9E97' }}>VERIFIED ENGINE</span>
                    </div>

                    {/* Floating Satellite Status Badges */}
                    <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', background: '#0F1714', color: '#00E599', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, border: '1px solid rgba(0, 229, 153, 0.4)', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 0 15px rgba(0, 229, 153, 0.2)' }}>
                      <CheckCircle2 size={12} style={{ color: '#00E599' }} /> PID SYNC
                    </div>

                    <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', background: '#0F1714', color: '#00E599', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, border: '1px solid rgba(0, 229, 153, 0.4)', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 0 15px rgba(0, 229, 153, 0.2)' }}>
                      <Lock size={12} style={{ color: '#00E599' }} /> SHA-256 SAFE
                    </div>

                    <div style={{ position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)', background: '#0F1714', color: '#00E599', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, border: '1px solid rgba(0, 229, 153, 0.4)' }}>
                      99.8%
                    </div>

                  </div>

                  {/* Caption */}
                  <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      3D EVIDENCE INTEGRATION MATRIX
                    </span>
                    <p style={{ fontSize: 11, color: '#8E9E97', fontFamily: 'monospace', margin: 0 }}>
                      {activeTab.tabLabel} Archive Connection Active
                    </p>
                  </div>

                </div>

              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
