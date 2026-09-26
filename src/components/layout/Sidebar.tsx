import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ShieldAlert,
  ImageIcon,
  History,
  Bookmark,
  User,
  Settings,
  HelpCircle,
  Cpu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 68;

interface SidebarProps {
  onWidthChange?: (w: number) => void;
}

export default function Sidebar({ onWidthChange }: SidebarProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';
  const [collapsed, setCollapsed] = useState(false);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onWidthChange?.(next ? SIDEBAR_COLLAPSED : SIDEBAR_FULL);
  };

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;

  const navGroups = [
    {
      title: t('প্রধান', 'MAIN'),
      items: [
        { to: '/app', icon: LayoutDashboard, label: t('ওভারভিউ', 'Overview'), end: true },
      ],
    },
    {
      title: t('ইঞ্জিনসমূহ', 'ENGINES'),
      items: [
        { to: '/app/rumor', icon: Search, label: t('গুজব স্ক্যানার', 'Rumor Scanner') },
        { to: '/app/scam', icon: ShieldAlert, label: t('স্ক্যাম অ্যালার্ট', 'Scam Alert') },
        { to: '/app/image', icon: ImageIcon, label: t('ছবি ফোরেনসিক্স', 'Image Check') },
      ],
    },
    {
      title: t('রেকর্ডসমূহ', 'RECORDS'),
      items: [
        { to: '/app/history', icon: History, label: t('স্ক্যান ইতিহাস', 'Scan History') },
        { to: '/app/saved', icon: Bookmark, label: t('সংরক্ষিত প্রমাণ', 'Saved Evidence') },
      ],
    },
    {
      title: t('সিস্টেম', 'SYSTEM'),
      items: [
        { to: '/app/profile', icon: User, label: t('ইউজার প্রোফাইল', 'Profile') },
        { to: '/app/scam-awareness', icon: HelpCircle, label: t('স্ক্যাম সেফটি গাইড', 'Safety Guide') },
        { to: '/app/architecture', icon: Cpu, label: t('আর্কিটেকচার', 'Architecture') },
        { to: '/app/settings', icon: Settings, label: t('সেটিংস', 'Settings') },
        { to: '/app/help', icon: HelpCircle, label: t('নথিপত্র ও সাহায্য', 'Docs & Help') },
      ],
    },
  ];

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width,
        background: isLight ? '#E0EDE6' : '#080C0B',
        borderRight: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transition: 'width 0.3s ease, background 0.3s ease, border-color 0.3s ease',
        overflow: 'hidden',
        boxShadow: isLight ? '4px 0 20px rgba(0, 168, 112, 0.08)' : '4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Logo Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          height: 64,
          borderBottom: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
          background: isLight ? '#D4E6DC' : '#060A09',
          flexShrink: 0,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: isLight ? '0 0 12px rgba(0, 168, 112, 0.3)' : '0 0 12px rgba(0,229,153,0.35)',
            }}
          >
            <img src="/factlens_logo.jpg" alt="FL" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: isLight ? '#06231A' : '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>FactLens</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: isLight ? '#007A50' : '#00E599', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>VERIFICATION CORE</div>
            </div>
          )}
        </Link>

        <button
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            background: 'transparent',
            border: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`,
            borderRadius: 8,
            color: isLight ? '#007A50' : '#5A6E64',
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: isLight ? '#007A50' : '#3D5247',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '0 8px',
                  marginBottom: 6,
                  fontFamily: 'monospace',
                }}
              >
                {group.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={Boolean((item as any).end)}
                    title={item.label}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: collapsed ? '10px' : '9px 10px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isActive ? (isLight ? '#00A870' : '#00E599') : 'transparent',
                      color: isActive ? (isLight ? '#FFFFFF' : '#040A07') : (isLight ? '#1E3B30' : '#8E9E97'),
                      transition: 'all 0.2s',
                      boxShadow: isActive ? (isLight ? '0 0 16px rgba(0, 168, 112, 0.35)' : '0 0 16px rgba(0,229,153,0.25)') : 'none',
                    })}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      if (!el.getAttribute('class')?.includes('active')) {
                        el.style.background = isLight ? '#D4E6DC' : '#0F1714';
                        el.style.color = isLight ? '#06231A' : '#E2E8E5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      if (!el.getAttribute('class')?.includes('active')) {
                        el.style.background = 'transparent';
                        el.style.color = isLight ? '#1E3B30' : '#8E9E97';
                      }
                    }}
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <>
                        <Icon
                          size={17}
                          style={{
                            flexShrink: 0,
                            color: isActive ? (isLight ? '#FFFFFF' : '#040A07') : (isLight ? '#007A50' : 'inherit'),
                          }}
                        />
                        {!collapsed && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer info pill */}
      {!collapsed && (
        <div style={{ padding: 12, borderTop: `1px solid ${isLight ? '#B8D9CB' : '#1B2923'}`, background: isLight ? '#D4E6DC' : '#060A09' }}>
          <div style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 800, color: isLight ? '#007A50' : '#00E599' }}>PID GAZETTE SYNC</div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', color: isLight ? '#2D4239' : '#8E9E97', marginTop: 2 }}>BangaBERT v3.4 • Real-time</div>
        </div>
      )}
    </aside>
  );
}
