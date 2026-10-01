import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Mail,
  Link as LinkIcon,
  Upload,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  Activity
} from 'lucide-react';
import UploadZone from '@/components/scanner/UploadZone';

const SCAM_MODES = [
  { id: 'sms', label: 'SMS & WhatsApp', icon: MessageSquare, color: '#F97316' },
  { id: 'url', label: 'Suspicious URL', icon: LinkIcon, color: '#00D2C2' },
  { id: 'email', label: 'Email Phishing', icon: Mail, color: '#6366F1' },
  { id: 'file', label: 'Screenshot Upload', icon: Upload, color: '#00E599' },
];

const PRESETS = [
  { label: 'bKash Lottery Prize SMS', content: 'অভিনন্দন! আপনি বিকাশ থেকে ১০০০০ টাকা লটারি পুরস্কার পেয়েছেন। ভিজিট করুন http://bkash-bonus.top' },
  { label: 'Urgent Upfront Fee Scam', content: 'আপনার পার্সেল এয়ারপোর্টে আটকে আছে। ছাড়াতে আজই ৫০০০ টাকা এই বিকাশ নম্বরে পাঠান।' },
  { label: 'Nagad Account Suspended', content: 'আপনার নগদ অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। রিসেট করতে পিন টাইপ করুন।' },
];

const RISK_CHIPS = [
  { label: 'Smishing Intent', icon: '📱' },
  { label: 'Non-Bank URL Domain', icon: '🌐' },
  { label: 'Upfront Fee Demand', icon: '💳' },
  { label: 'Urgency Pressure', icon: '⚡' },
  { label: 'Lottery Prize Bait', icon: '🎰' },
  { label: 'PIN / OTP Harvesting', icon: '🔑' },
];

export default function ScamAlert() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('sms');
  const [inputVal, setInputVal] = useState('');
  const [scanned] = useState(false);
  const [loading] = useState(false);
  const [scanProgress] = useState(0);

  const handleScan = () => {
    if (!inputVal.trim()) return;
    if (activeMode === 'file') {
      // Navigate to OCR review or directly to scam processing with OCR flag
      navigate('/app/ocr-review', { state: { content: inputVal, fromModule: 'scam' } });
    } else {
      navigate('/app/scam/processing', { state: { content: inputVal, type: 'text' } });
    }
  };

  const currentMode = SCAM_MODES.find(m => m.id === activeMode) || SCAM_MODES[0];
  const isReady = Boolean(inputVal.trim());
  const flaggedIndices = scanned ? [0, 1, 2, 3, 5] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 20, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #F97316, transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 20, padding: '3px 12px', marginBottom: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SECURITY THREAT RADAR — MODULE 02</div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>Scam & Phishing Alert Engine</h1>
              <p style={{ fontSize: 13.5, color: '#F97316', marginTop: 6, fontFamily: '"Noto Sans Bengali", sans-serif' }}>সন্দেহজনক এসএমএস, ফিশিং লিঙ্ক বা লটারি প্রতারণার বার্তা পরীক্ষা করুন।</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[{ v: '120+', l: 'Risk Patterns' }, { v: '50K+', l: 'Scam Domains' }, { v: 'Daily', l: 'Updated' }].map((s, i) => (
                <div key={i} style={{ background: '#060A09', border: '1px solid #1B2923', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#8E9E97', textTransform: 'uppercase', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {SCAM_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => { setActiveMode(mode.id); setInputVal(''); }}
              style={{
                padding: 14,
                borderRadius: 14,
                border: `1px solid ${isActive ? mode.color : '#1B2923'}`,
                background: isActive ? '#0F1714' : '#080C0B',
                color: isActive ? '#fff' : '#8E9E97',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 0 20px ${mode.color}25` : 'none',
              }}
            >
              <div style={{ padding: 6, borderRadius: 8, background: `${mode.color}15`, color: mode.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* Left Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ gridColumn: 'span 7' }}>
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>INPUT PAYLOAD</span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>Paste Suspicious {currentMode.label}:</h3>
            </div>

            {activeMode === 'file' ? (
              <UploadZone onFileSelect={() => setInputVal('screenshot_scam_sample.png')} />
            ) : (
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={`Paste suspicious ${currentMode.label} message, link, or email here...`}
                rows={4}
                style={{
                  width: '100%',
                  background: '#080C0B',
                  border: '1px solid #1B2923',
                  borderRadius: 14,
                  padding: 14,
                  color: '#fff',
                  fontSize: 13.5,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: '"Noto Sans Bengali", sans-serif',
                }}
              />
            )}

            {/* Presets */}
            {activeMode !== 'file' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#8E9E97', fontFamily: 'monospace' }}>Or click sample scam threat:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInputVal(p.content)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: '1px solid #1B2923',
                        background: '#080C0B',
                        color: '#F97316',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'monospace',
                      }}
                    >
                      ⚡ {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={!isReady || loading}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: isReady && !loading ? '#F97316' : '#1B2923',
                color: isReady && !loading ? '#ffffff' : '#5A6E64',
                fontSize: 14,
                fontWeight: 800,
                cursor: isReady && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                boxShadow: isReady && !loading ? '0 0 24px rgba(249,115,22,0.3)' : 'none',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid #ffffff30', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Scanning threat radar ({scanProgress}%)...
                </>
              ) : (
                <>
                  <ShieldAlert size={17} /> Scan for Scam Indicators <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* Risk chip tags */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'monospace' }}>DETECTION CATEGORIES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RISK_CHIPS.map((chip, i) => {
                  const flagged = flaggedIndices.includes(i);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: flagged ? 'rgba(239,68,68,0.15)' : '#060A09',
                      border: `1px solid ${flagged ? 'rgba(239,68,68,0.4)' : '#1B2923'}`,
                      color: flagged ? '#FCA5A5' : '#8E9E97',
                      transition: 'all 0.3s',
                    }}>
                      <span>{chip.icon}</span>
                      {chip.label}
                      {flagged && <XCircle size={11} style={{ color: '#EF4444' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Result Panel with Unique Cyber Security Radar HUD Sweep Animation */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ gridColumn: 'span 5' }}>
          <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #1B2923' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>THREAT PIPELINE CONSOLE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#F97316', fontFamily: 'monospace', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                <Activity size={12} className="animate-pulse" />
                PIPELINE RUNNING
              </div>
            </div>

            {/* ── SECURITY THREAT PIPELINE CONSOLE SCANNING ANIMATION ── */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', background: '#060A09', borderRadius: 16, border: '1px solid rgba(249,115,22,0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontFamily: 'monospace', color: '#F97316', fontWeight: 700 }}>
                  <span>PATTERNS & PHISHING INSPECTION</span>
                  <span>{scanProgress}%</span>
                </div>

                {/* Threat Pipeline Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { num: '01', label: 'SMS & Text Analysis', pct: 20 },
                    { num: '02', label: 'Phishing Domain Lookup', pct: 40 },
                    { num: '03', label: 'MFS Brand Spoofing Check', pct: 60 },
                    { num: '04', label: 'Urgency Fraud Pattern Match', pct: 80 },
                    { num: '05', label: 'Threat Risk Score Assembly', pct: 100 },
                  ].map((st, i) => {
                    const isCurrent = scanProgress >= st.pct - 20 && scanProgress <= st.pct;
                    const isDone = scanProgress > st.pct;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: scanProgress >= st.pct - 20 ? 1 : 0.35, transition: 'all 0.3s' }}>
                        {isDone ? (
                          <CheckCircle size={15} style={{ color: '#F97316', flexShrink: 0 }} />
                        ) : isCurrent ? (
                          <motion.div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #F97316', borderTopColor: 'transparent', flexShrink: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #1B2923', flexShrink: 0 }} />
                        )}
                        <span style={{ fontFamily: 'monospace', fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#F97316' : '#E2E8E5' }}>{st.num} {st.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: '#1B2923', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                  <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EF4444)', borderRadius: 99 }} animate={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {scanned && !loading ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.92, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#EF4444', fontFamily: 'monospace', lineHeight: 1 }}>92%</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: 8 }}>
                      <AlertTriangle size={15} color="#EF4444" />
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#FCA5A5' }}>HIGH THREAT RISK DETECTED</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#FCA5A5', fontFamily: '"Noto Sans Bengali", sans-serif', lineHeight: 1.5 }}>সতর্কতা: এটি একটি ক্ষতিকর ফিশিং লিঙ্ক (Smishing Scam)</p>
                    <div style={{ marginTop: 12, height: 6, background: '#1B2923', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 0.8 }} style={{ height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EF4444)', borderRadius: 4 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'monospace' }}>FLAGGED THREAT INDICATORS</div>
                    {[
                      { icon: '🔗', text: 'Unofficial .top TLD domain', sev: 'HIGH' },
                      { icon: '⚡', text: 'Urgent cashback phrasing', sev: 'HIGH' },
                      { icon: '💳', text: 'bKash brand name spoofing', sev: 'HIGH' },
                      { icon: '🎰', text: 'Lottery prize bait pattern', sev: 'MED' },
                      { icon: '🔑', text: 'PIN number request', sev: 'CRIT' },
                    ].map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 12 }}>
                        <span>{f.icon}</span>
                        <span style={{ flex: 1, color: '#FECACA' }}>{f.text}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: f.sev === 'CRIT' ? '#EF4444' : '#F97316', fontFamily: 'monospace', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 4 }}>{f.sev}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : !loading ? (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={26} color="#F97316" />
                  </div>
                  <p style={{ fontSize: 13, color: '#8E9E97', textAlign: 'center', lineHeight: 1.5 }}>Paste suspicious content on the left to run threat indicator scan.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Safety tips */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <AlertTriangle size={13} color="#F59E0B" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FDE68A' }}>Safety Reminders</span>
              </div>
              {[
                'Never enter mobile banking PINs on unverified links',
                'Official bKash/Nagad never asks for OTP via SMS',
                'Lottery wins without participation = scam signal',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: '#8E9E97', marginBottom: i < 2 ? 5 : 0, lineHeight: 1.4 }}>
                  <CheckCircle size={11} color="#00E599" style={{ marginTop: 2, flexShrink: 0 }} />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
