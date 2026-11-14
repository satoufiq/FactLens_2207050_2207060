import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, FileCheck2, ArrowRight, TrendingUp, ChevronRight, Clock, Inbox } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { SystemStorage, type ScanRecord } from '@/services/storage';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    const list = SystemStorage.getScans();
    setScans(list);
  }, [user]);

  const displayName = user?.full_name || SystemStorage.getUserProfile().name || 'Shahriar Abdullah';

  const totalScans = scans.length;
  const rumorScans = scans.filter((s) => s.type === 'RUMOR').length;
  const scamScans = scans.filter((s) => s.type === 'SCAM').length;
  const imageScans = scans.filter((s) => s.type === 'IMAGE').length;

  const rumorPct = totalScans > 0 ? Math.round((rumorScans / totalScans) * 100) : 0;
  const scamPct = totalScans > 0 ? Math.round((scamScans / totalScans) * 100) : 0;
  const imagePct = totalScans > 0 ? Math.round((imageScans / totalScans) * 100) : 0;

  // Recent 4 scans
  const recentList = scans.slice(0, 4);

  // Dynamic 7-day activity based on scan timestamps
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = daysOfWeek.map((day, idx) => {
    // Count scans matching day of week
    const count = scans.filter((s) => {
      const d = new Date(s.createdAt).getDay();
      // Sunday is 0, Mon is 1
      const mappedIdx = d === 0 ? 6 : d - 1;
      return mappedIdx === idx;
    }).length;
    return { day, scans: count };
  });

  const getStatusColor = (res: string) => {
    if (res === 'SUPPORTED' || res === 'AUTHENTIC' || res === 'LOW_RISK') return '#00E599';
    if (res === 'CONTRADICTED' || res === 'HIGH_RISK' || res === 'LIKELY_AI_GENERATED') return '#EF4444';
    return '#F59E0B';
  };

  const getTypeColor = (type: string) => {
    if (type === 'RUMOR') return '#00D2C2';
    if (type === 'SCAM') return '#F97316';
    return '#6366F1';
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return t('এইমাত্র', 'Just now');
      if (diff < 3600) return `${Math.floor(diff / 60)} ${t('মিনিট আগে', 'min ago')}`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('ঘণ্টা আগে', 'hr ago')}`;
      return `${Math.floor(diff / 86400)} ${t('দিন আগে', 'days ago')}`;
    } catch {
      return t('সম্প্রতি', 'Recently');
    }
  };

  const engines = [
    {
      to: '/app/rumor',
      icon: Search,
      accentColor: '#00D2C2',
      tag: t('ইঞ্জিন ০১', 'ENGINE 01'),
      title: t('গুজব স্ক্যানার', 'Rumor Scanner'),
      desc: t('সরকারি গেজেট, বিশ্ববিদ্যালয় নোটিশ ও প্রেস আর্কাইভের মাধ্যমে তথ্য যাচাই করুন।', 'Verify claims against Ministry gazettes, university notices, and press archives using BanglaBERT NLP.'),
      btnLabel: t('স্ক্যানার চালু করুন', 'Launch Scanner'),
      btnBg: '#00E599',
      btnText: '#040A07',
    },
    {
      to: '/app/scam',
      icon: ShieldAlert,
      accentColor: '#F97316',
      tag: t('ইঞ্জিন ০২', 'ENGINE 02'),
      title: t('স্ক্যাম অ্যালার্ট', 'Scam Alert'),
      desc: t('ফিশিং এসএমএস, এমএফএস ক্যাশব্যাক প্রতারণা ও ভুয়া লটারি বার্তা সনাক্ত করুন।', 'Detect phishing SMS, MFS cashback fraud, suspicious domains, and urgency scam patterns.'),
      btnLabel: t('স্ক্যাম পরীক্ষা করুন', 'Check for Scams'),
      btnBg: '#F97316',
      btnText: '#fff',
    },
    {
      to: '/app/image',
      icon: FileCheck2,
      accentColor: '#6366F1',
      tag: t('ইঞ্জিন ০৩', 'ENGINE 03'),
      title: t('ছবি ফোরেনসিক্স', 'Image Forensics'),
      desc: t('ইএলএ কম্প্রেশন বিশ্লেষণ, মেটাডাটা ও ডিপফেক ফেস কারসাজি পরীক্ষা।', 'ELA compression analysis, EXIF metadata inspection, and deepfake artifact detection.'),
      btnLabel: t('ছবি পরিদর্শন করুন', 'Inspect Image'),
      btnBg: '#6366F1',
      btnText: '#fff',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* ── WELCOME HEADER ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0F1714 0%, #080C0B 100%)',
            border: '1px solid #1B2923',
            borderRadius: 20,
            padding: '28px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top line accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00E599, transparent)' }} />
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(0,229,153,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, position: 'relative', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,153,0.1)', border: '1px solid rgba(0,229,153,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E599', boxShadow: '0 0 6px #00E599' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                  {t('যাচাইকরণ প্ল্যাটফর্ম সক্রিয়', 'VERIFICATION PLATFORM ACTIVE')}
                </span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {t('স্বাগতম, ', 'Welcome back, ')}<span style={{ color: '#00E599' }}>{displayName}</span>.
              </h1>
              <p style={{ fontSize: 14, color: '#8E9E97', marginTop: 8, maxWidth: 480 }}>
                {t('রিয়েল-টাইম তথ্য প্রমাণ স্ক্যান শুরু করতে একটি ইঞ্জিন নির্বাচন করুন বা সরাসরি ইনপুট দিন।', 'Select a verification engine below to begin inspecting digital media or claims.')}
              </p>
            </div>

            {/* Dynamic System Stats pills */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { val: `${totalScans}`, label: t('মোট স্ক্যান', 'Total Scans') },
                { val: `${rumorScans}`, label: t('গুজব পরীক্ষা', 'Rumor Scans') },
                { val: `${scamScans + imageScans}`, label: t('স্ক্যাম ও ছবি', 'Scam & Media') },
              ].map((s, i) => (
                <div key={i} style={{ background: '#060A09', border: '1px solid #1B2923', borderRadius: 14, padding: '12px 18px', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: '#8E9E97', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3 ENGINE CARDS ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
      >
        {engines.map((eng, i) => {
          const Icon = eng.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              onClick={() => navigate(eng.to)}
              style={{
                background: '#0F1714',
                border: '1px solid #1B2923',
                borderRadius: 18,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = eng.accentColor + '60';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${eng.accentColor}18`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#1B2923';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: eng.accentColor + '15', border: `1px solid ${eng.accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={eng.accentColor} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: eng.accentColor, background: eng.accentColor + '10', border: `1px solid ${eng.accentColor}25`, borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{eng.tag}</span>
              </div>

              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>{eng.title}</h3>
                <p style={{ fontSize: 12.5, color: '#8E9E97', marginTop: 6, lineHeight: 1.55 }}>{eng.desc}</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); navigate(eng.to); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  background: eng.btnBg,
                  color: eng.btnText,
                  border: 'none',
                  borderRadius: 40,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                {eng.btnLabel} <ArrowRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── AUDIT TABLE + CHART ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}
      >
        {/* Dynamic Recent Scans */}
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #1B2923', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{t('সাম্প্রতিক স্ক্যানসমূহ', 'RECENT SCANS')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 2 }}>{t('নিরীক্ষা ট্রেইল', 'Audit Trail')}</div>
            </div>
            <button
              onClick={() => navigate('/app/history')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#00E599', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {t('সবগুলো দেখুন', 'View All')} <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentList.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Inbox size={32} style={{ color: '#5A6E64' }} />
                <span style={{ fontSize: 13, color: '#8E9E97', fontWeight: 600 }}>{t('কোনো স্ক্যান এখনও রেকর্ড করা হয়নি', 'No scans recorded yet.')}</span>
                <p style={{ fontSize: 11, color: '#5A6E64', margin: 0 }}>
                  {t('উপরের ইঞ্জিনগুলো ব্যবহার করে আপনার প্রথম তথ্য যাচাই করুন।', 'Run a verification scan from any module above to start your audit trail.')}
                </p>
              </div>
            ) : (
              recentList.map((scan) => {
                const color = getTypeColor(scan.type);
                const resColor = getStatusColor(scan.result);
                const link = scan.type === 'RUMOR' ? `/app/history/${scan.id}` : `/app/history/${scan.id}`;
                return (
                  <motion.div
                    key={scan.id}
                    onClick={() => navigate(link)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: '#060A09',
                      border: '1px solid #1B2923',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <div style={{ width: 3, height: 36, borderRadius: 4, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: color, fontFamily: 'monospace', textTransform: 'uppercase' }}>{scan.type}</span>
                        <span style={{ fontSize: 10, color: '#5A6E64', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={9} /> {formatRelativeTime(scan.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8E5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {scan.title}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: resColor, background: resColor + '18', border: `1px solid ${resColor}35`, borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {scan.result}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Dynamic Telemetry Chart Panel */}
        <div style={{ background: '#0F1714', border: '1px solid #1B2923', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00E599', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{t('টেলেম্যাট্রি', 'TELEMETRY')}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 2 }}>{t('৭ দিনের কার্যক্রম', '7-Day Activity')}</div>
            </div>
            <TrendingUp size={16} color="#00E599" />
          </div>

          {/* Native High-Performance Telemetry Chart */}
          <div style={{ height: 130, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <svg viewBox="0 0 280 85" style={{ width: '100%', height: 85, overflow: 'visible' }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E599" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00E599" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              {(() => {
                const maxVal = Math.max(1, ...chartData.map(d => d.scans));
                const points = chartData.map((d, i) => {
                  const x = 15 + i * (250 / 6);
                  const y = 75 - (d.scans / maxVal) * 60;
                  return { x, y, scans: d.scans };
                });
                const dPath = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                const areaPath = `${dPath} L ${points[points.length - 1].x} 80 L ${points[0].x} 80 Z`;
                return (
                  <>
                    <path d={areaPath} fill="url(#areaGrad)" />
                    <path d={dPath} fill="none" stroke="#00E599" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={p.scans > 0 ? 3.5 : 2} fill="#00E599" stroke="#060A09" strokeWidth="1.5" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: 4 }}>
              {chartData.map(d => (
                <span key={d.day} style={{ fontSize: 9.5, color: '#6A7E75', fontFamily: 'monospace' }}>{d.day}</span>
              ))}
            </div>
          </div>

          {/* Dynamic Module breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: t('গুজব', 'Rumor'), pct: rumorPct, color: '#00D2C2' },
              { label: t('স্ক্যাম', 'Scam'), pct: scamPct, color: '#F97316' },
              { label: t('ছবি', 'Image'), pct: imagePct, color: '#6366F1' },
            ].map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8E9E97', marginBottom: 4 }}>
                  <span>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 700 }}>{m.pct}%</span>
                </div>
                <div style={{ height: 4, background: '#1B2923', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    style={{ height: '100%', background: m.color, borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid #1B2923', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#8E9E97' }}>{t('সর্বমোট স্ক্যান', 'Total Scans')}</span>
            <span style={{ color: '#00E599', fontWeight: 800, fontFamily: 'monospace' }}>{totalScans}</span>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
