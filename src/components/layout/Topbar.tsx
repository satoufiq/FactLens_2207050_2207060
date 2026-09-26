import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, User, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function Topbar() {
  const { lang, setLang, t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  // Page title mapping
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/app': return t('ওভারভিউ ও যাচাইকরণ হাব', 'Overview & Verification Hub');
      case '/app/rumor': return t('গুজব ও দাবি স্ক্যানার', 'Rumor / Claim Scanner');
      case '/app/ocr-review': return t('ওসিআর পর্যালোচনা ও যাচাইকরণ চেকপয়েন্ট', 'OCR Review & Verification Checkpoint');
      case '/app/rumor/processing': return t('দাবি বিশ্লেষণ পাইপলাইন', 'Claim Analysis Pipeline');
      case '/app/result/rumor': return t('দাবি মূল্যায়ন ফলাফল', 'Claim Assessment Result');
      case '/app/scam': return t('স্ক্যাম অ্যালার্ট ও ফিশিং স্ক্যানার', 'Scam Alert & Phishing Scanner');
      case '/app/image': return t('ছবি পরীক্ষা ও ফটোশপ ফোরেনসিক্স', 'Image Check & Photoshop Forensics');
      case '/app/history': return t('যাচাইকরণ ইতিহাস অডিট', 'Verification History Audit');
      case '/app/saved': return t('সংরক্ষিত প্রমাণ ভল্ট', 'Saved Evidence Vault');
      case '/app/profile': return t('ব্যবহারকারী প্রোফাইল কেন্দ্র', 'User Profile Center');
      case '/app/settings': return t('প্ল্যাটফর্ম সেটিংস', 'Platform Settings');
      case '/app/help': return t('পদ্ধতি ও এপিআই নথিপত্র', 'Methodology & API Docs');
      default: return t('ফ্যাক্টলেন্স প্ল্যাটফর্ম', 'FactLens Platform');
    }
  };

  return (
    <header style={{
      height: 76,
      background: isLight ? 'rgba(226, 236, 231, 0.96)' : 'rgba(8, 12, 11, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: isLight ? '0 4px 20px rgba(0, 168, 112, 0.08)' : '0 10px 30px rgba(0,0,0,0.5)',
      color: isLight ? '#06231A' : '#FFFFFF',
    }}>
      
      {/* Left: Page Title & Breadcrumb Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#007A50' : '#00E599', background: isLight ? '#D4E6DC' : 'rgba(0, 229, 153, 0.1)', border: `1px solid ${isLight ? '#B8D9CB' : 'rgba(0, 229, 153, 0.3)'}`, padding: '2px 10px', borderRadius: 99 }}>
              {t('সিস্টেম সক্রিয়', 'SYSTEM ACTIVE')}
            </span>
            <span style={{ fontSize: 12, color: isLight ? '#3B5249' : '#8E9E97', fontFamily: 'monospace' }}>/ {location.pathname.replace('/', '')}</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: isLight ? '#06231A' : '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>{getPageTitle()}</h2>
        </div>
      </div>

      {/* Right Action Cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
        
        {/* Live PID Sync Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isLight ? '#D4E6DC' : '#0F1714', border: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`, padding: '6px 14px', borderRadius: 99, fontSize: 12, color: isLight ? '#007A50' : '#00E599', fontFamily: 'monospace', fontWeight: 700 }} className="hidden lg:flex">
          <ShieldCheck size={14} style={{ color: isLight ? '#007A50' : '#00E599' }} />
          <span>{t('পিআইডি আর্কাইভ: সিঙ্ক করা হয়েছে', 'PID ARCHIVE: SYNCED')}</span>
        </div>

        {/* Language Selector: বাংলা | EN */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: isLight ? '#D4E6DC' : '#0F1714', border: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`, borderRadius: 99, padding: 3, fontSize: 12, fontWeight: 700 }}>
          <button
            onClick={() => setLang('bn')}
            style={{
              padding: '4px 12px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              background: lang === 'bn' ? (isLight ? '#00A870' : '#00E599') : 'transparent',
              color: lang === 'bn' ? (isLight ? '#FFFFFF' : '#000000') : (isLight ? '#2D4239' : '#8E9E97'),
              fontWeight: 800,
              fontSize: 12,
              transition: 'all 0.2s ease',
            }}
          >
            বাংলা
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '4px 12px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              background: lang === 'en' ? (isLight ? '#00A870' : '#00E599') : 'transparent',
              color: lang === 'en' ? (isLight ? '#FFFFFF' : '#000000') : (isLight ? '#2D4239' : '#8E9E97'),
              fontWeight: 800,
              fontSize: 12,
              transition: 'all 0.2s ease',
            }}
          >
            EN
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: isLight ? '#B8D9CB' : '#1B2923', margin: '0 4px' }} />

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: isLight ? '#D4E6DC' : '#0F1714',
              border: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLight ? '#007A50' : '#8E9E97',
              cursor: 'pointer',
              position: 'relative',
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: isLight ? '#00A870' : '#00E599', boxShadow: isLight ? '0 0 8px #00A870' : '0 0 8px #00E599' }} />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div style={{ position: 'absolute', right: 0, top: 52, width: 320, background: isLight ? '#FFFFFF' : '#0F1714', borderRadius: 20, border: `1px solid ${isLight ? '#B8D9CB' : 'rgba(0, 229, 153, 0.3)'}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', padding: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isLight ? '#E0EDE6' : '#1B2923'}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: isLight ? '#06231A' : '#FFFFFF' }}>Notifications</span>
                <span style={{ fontSize: 10, background: isLight ? '#D4E6DC' : 'rgba(0, 229, 153, 0.2)', color: isLight ? '#007A50' : '#00E599', fontFamily: 'monospace', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                  2 New
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ padding: 12, background: isLight ? '#F3F8F5' : '#080C0B', borderRadius: 12, border: `1px solid ${isLight ? '#C2DCD0' : '#1B2923'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLight ? '#007A50' : '#00E599', fontWeight: 800 }}>
                    <CheckCircle2 size={14} /> Scan Audit Complete
                  </div>
                  <p style={{ fontSize: 11, color: isLight ? '#3B5249' : '#8E9E97', margin: '4px 0 0' }}>PID Gazette verification scan finished with 99.4% confidence rating.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 10px 4px 4px',
              borderRadius: 99,
              background: isLight ? '#D4E6DC' : '#0F1714',
              border: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 99, background: 'linear-gradient(135deg, #00E599, #00D2C2)', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              TA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }} className="hidden sm:flex">
              <span style={{ fontSize: 12, fontWeight: 800, color: isLight ? '#06231A' : '#FFFFFF', lineHeight: 1.1 }}>Tanvir Ahmed</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: isLight ? '#007A50' : '#00E599', fontWeight: 700 }}>RESEARCHER</span>
            </div>
          </button>

          {userMenuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 52, width: 220, background: isLight ? '#FFFFFF' : '#0F1714', borderRadius: 20, border: `1px solid ${isLight ? '#B8D9CB' : 'rgba(0, 229, 153, 0.3)'}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', padding: 12, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/app/profile" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, textDecoration: 'none', color: isLight ? '#06231A' : '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                <User size={16} style={{ color: isLight ? '#007A50' : '#00E599' }} /> User Profile
              </Link>
              <Link to="/app/settings" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, textDecoration: 'none', color: isLight ? '#06231A' : '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                <User size={16} style={{ color: isLight ? '#007A50' : '#00E599' }} /> Platform Settings
              </Link>
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, textDecoration: 'none', color: '#F87171', fontSize: 13, fontWeight: 700 }}>
                <LogOut size={16} /> Sign Out
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
