import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Save, Check, Bell, Moon, Sun, Cpu } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  color?: string;
}

function Toggle({ checked, onChange, color = '#00E599' }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      type="button"
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        background: checked ? color : '#1B2923',
        transition: 'background 0.3s ease',
        padding: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'absolute',
          top: 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

export default function Settings() {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [betaFeatures, setBetaFeatures] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDarkMode = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48, maxWidth: 1100, margin: '0 auto', width: '100%' }}
    >
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          background: '#0F1714',
          border: '1px solid #1B2923',
          borderRadius: 24,
          padding: '24px 28px',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: 'rgba(0, 229, 153, 0.06)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, rgba(0, 229, 153, 0.3), transparent)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.1)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)', width: 'fit-content' }}>
            SYSTEM CONFIGURATION
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            {t('প্ল্যাটফর্ম সেটিংস', 'Platform Settings')}
          </h1>
          <p style={{ fontSize: 13, color: '#00E599', margin: 0 }}>
            {t('কনফিগারেশন, থিম এবং প্ল্যাটফর্ম সেটিংস পরিমার্জন করুন।', 'Configure interface language, appearance theme, and verification models.')}
          </p>
        </div>
      </motion.div>

      {/* ── GRID CONTENT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, alignItems: 'start' }}>

        {/* Left: Main Settings */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Language & Theme Configuration Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1B2923', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={16} style={{ color: '#00E599' }} />
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('ভাষা ও ইউজার ইন্টারফেস সেটিংস', 'Language & Theme Settings')}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Language Selector Section */}
              <div style={{ padding: 20, borderBottom: '1px solid #1B2923', display: 'flex', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0, 229, 153, 0.1)', border: '1px solid rgba(0, 229, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Globe size={16} style={{ color: '#00E599' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    {t('ইন্টারফেসের প্রধান ভাষা সিলেক্ট করুন', 'Primary Interface Language')}
                  </p>
                  <p style={{ fontSize: 12, color: '#8E9E97', margin: 0 }}>
                    {t('সমগ্র প্ল্যাটফর্মের ফলাফল ও বিবরণের ডিফল্ট ভাষা পরিবর্তন করুন।', 'Controls the default display language across the entire FactLens platform.')}
                  </p>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setLang('bn')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: lang === 'bn' ? '#00E599' : '#080C0B',
                        color: lang === 'bn' ? '#000000' : '#8E9E97',
                        boxShadow: lang === 'bn' ? '0 0 20px rgba(0,229,153,0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🇧🇩 বাংলা (Bengali First)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: lang === 'en' ? '#00E599' : '#080C0B',
                        color: lang === 'en' ? '#000000' : '#8E9E97',
                        boxShadow: lang === 'en' ? '0 0 20px rgba(0,229,153,0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🇬🇧 English (EN)
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Mode Selector Section (Light vs Dark) */}
              <div style={{ padding: 20, display: 'flex', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0, 210, 194, 0.1)', border: '1px solid rgba(0, 210, 194, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isDarkMode ? <Moon size={16} style={{ color: '#00D2C2' }} /> : <Sun size={16} style={{ color: '#F59E0B' }} />}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    {t('প্ল্যাটফর্ম ভিজ্যুয়াল থিম (ডার্ক / লাইট মোড)', 'Appearance Theme Mode')}
                  </p>
                  <p style={{ fontSize: 12, color: '#8E9E97', margin: 0 }}>
                    {t('পছন্দ অনুযায়ী ডার্ক মোড অথবা লাইট মোড বেছে নিন।', 'Select your preferred visual appearance theme.')}
                  </p>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        border: `1px solid ${isDarkMode ? '#00E599' : '#1B2923'}`,
                        cursor: 'pointer',
                        background: isDarkMode ? '#00E599' : '#080C0B',
                        color: isDarkMode ? '#000000' : '#8E9E97',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: isDarkMode ? '0 0 20px rgba(0,229,153,0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Moon size={14} /> Dark Mode (Default)
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        border: `1px solid ${!isDarkMode ? '#00E599' : '#1B2923'}`,
                        cursor: 'pointer',
                        background: !isDarkMode ? '#00E599' : '#080C0B',
                        color: !isDarkMode ? '#000000' : '#8E9E97',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: !isDarkMode ? '0 0 20px rgba(0,229,153,0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Sun size={14} /> Light Mode
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Preferences Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1B2923', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={16} style={{ color: '#00E599' }} />
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('প্ল্যাটফর্ম সার্ভিস অপশন', 'Platform Preferences')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { icon: <Bell size={14} />, label: t('পুশ নোটিফিকেশন', 'Push Notifications'), desc: t('স্ক্যান সম্পন্ন ও ডাটাবেস আপডেটের বার্তা', 'Alerts for scan completions and archive updates'), state: notifications, setter: setNotifications, color: '#00E599' },
                { icon: <Save size={14} />, label: t('অটো-সেভ প্রমান', 'Auto-Save Scans'), desc: t('স্বয়ংক্রিয়ভাবে স্ক্যান রেজাল্ট ভল্টে সংরক্ষণ', 'Automatically save results to Evidence Vault'), state: autoSave, setter: setAutoSave, color: '#6366F1' },
                { icon: <Cpu size={14} />, label: t('বিটা এআই ফিচার', 'Beta AI Features'), desc: t('নতুন বঙ্গবিইআরটি মডেলের আগাম এক্সেস', 'Early access to experimental BangaBERT models'), state: betaFeatures, setter: setBetaFeatures, color: '#F97316' },
              ].map((setting, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < 2 ? '1px solid #1B2923' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${setting.color}15`,
                        border: `1px solid ${setting.color}30`,
                        color: setting.color,
                        flexShrink: 0,
                      }}
                    >
                      {setting.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{setting.label}</p>
                      <p style={{ fontSize: 11, color: '#8E9E97', margin: 0 }}>{setting.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={setting.state} onChange={() => setting.setter(!setting.state)} color={setting.color} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Save Action button */}
          <div>
            <button
              onClick={handleSave}
              type="button"
              style={{
                padding: '12px 24px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                cursor: 'pointer',
                background: saved ? '#00D2C2' : '#00E599',
                color: '#000000',
                boxShadow: '0 0 20px rgba(0, 229, 153, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? t('সেটিংস সংরক্ষিত হয়েছে!', 'Settings Saved!') : t('পছন্দসমূহ সংরক্ষণ করুন', 'Save Preferences')}
            </button>
          </div>
        </div>

        {/* Right: User profile */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 16, background: 'linear-gradient(135deg, #00E599, #00D2C2)', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 0 15px rgba(0,229,153,0.3)' }}>
                TA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Shahriar Ahmed</p>
                <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#00E599', margin: 0, fontWeight: 700 }}>RESEARCHER TIER</p>
              </div>
            </div>

            <div style={{ padding: 14, background: '#080C0B', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#8E9E97' }}>API Quota:</span>
                <span style={{ color: '#00E599', fontFamily: 'monospace', fontWeight: 700 }}>8,420 / 10,000</span>
              </div>
              <div style={{ height: 4, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: '84%', height: '100%', background: '#00E599', borderRadius: 99 }} />
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
