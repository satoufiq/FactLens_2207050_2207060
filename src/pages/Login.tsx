import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      navigate('/app');
    }, 800);
  };

  const handleDemoLogin = () => {
    setEmail('shahriar@example.com');
    setPassword('demo123456');
    setIsSubmitting(true);
    setTimeout(() => {
      navigate('/app');
    }, 600);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060A09', color: '#E2E8E5', fontFamily: 'Inter, sans-serif', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflow: 'hidden' }}>
      
      {/* Background Ambient Glows & Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, #1B2923 1px, transparent 1px), linear-gradient(to bottom, #1B2923 1px, transparent 1px)', backgroundSize: '4rem 4rem', opacity: 0.2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'rgba(0, 229, 153, 0.07)', borderRadius: '50%', filter: 'blur(160px)', pointerEvents: 'none' }} />

      {/* Top Bar Logo */}
      <Link to="/" style={{ position: 'absolute', top: 28, left: 32, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', zIndex: 30 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #00E599, #00D2C2)', boxShadow: '0 0 20px rgba(0, 229, 153, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
            <path d="m8.5 11 1.8 1.8 3.7-3.7" />
          </svg>
        </div>
        <div>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>FactLens</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#00E599', fontWeight: 700, textTransform: 'uppercase' }}>VERIFICATION PLATFORM</span>
        </div>
      </Link>

      {/* Main Glassmorphic Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          maxWidth: 1040,
          background: '#0F1714',
          border: '1px solid rgba(0, 229, 153, 0.3)',
          borderRadius: 28,
          boxShadow: '0 0 60px rgba(0, 229, 153, 0.12)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          position: 'relative',
          zIndex: 10,
          margin: '60px 0 20px',
        }}
      >
        {/* Left Brand Side */}
        <div style={{
          gridColumn: 'span 5',
          background: '#080C0B',
          borderRight: '1px solid #1B2923',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }} className="hidden md:flex">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E599', background: 'rgba(0, 229, 153, 0.12)', padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)', width: 'fit-content' }}>
              DIGITAL SAFETY WORKSPACE
            </span>

            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', margin: 0, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              Welcome back to FactLens.
            </h2>

            <p style={{ fontSize: 13.5, color: '#00E599', margin: 0, fontWeight: 700, fontFamily: '"Noto Sans Bengali", sans-serif' }}>
              আপনার সংরক্ষিত ফ্যাক্ট টেস্ট রিপোর্ট ও ফরেনসিক হিস্ট্রিতে ফিরে আসুন।
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {[
                'Access saved rumor scanner reports & gazettes',
                'Review image forensic diagnostic heatmaps',
                'Track suspicious scam alert activity logs',
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#8E9E97' }}>
                  <CheckCircle size={15} style={{ color: '#00E599', flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Demo Access Box */}
          <div style={{ padding: 18, background: '#0F1714', borderRadius: 18, border: '1px solid #1B2923', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#FFFFFF' }}>Prototype Quick Access</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 800, color: '#00E599', background: 'rgba(0, 229, 153, 0.15)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(0, 229, 153, 0.3)' }}>DEMO MODE</span>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 800,
                background: '#00E599',
                color: '#000000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 0 15px rgba(0, 229, 153, 0.3)',
              }}
            >
              <Zap size={14} /> One-Click Demo Sign In
            </button>
          </div>
        </div>

        {/* Right Form Side */}
        <div style={{
          gridColumn: 'span 7',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Sign In to Account
            </h1>
            <p style={{ fontSize: 13, color: '#8E9E97', margin: 0 }}>
              Enter your registered email and password to access the platform workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    background: '#080C0B',
                    border: '1px solid #1B2923',
                    borderRadius: 14,
                    padding: '12px 16px 12px 44px',
                    fontSize: 13.5,
                    color: '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to your email.'); }}
                  style={{ fontSize: 11, fontFamily: 'monospace', color: '#00E599', textDecoration: 'none', fontWeight: 700 }}
                >
                  Forgot Password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    background: '#080C0B',
                    border: '1px solid #1B2923',
                    borderRadius: 14,
                    padding: '12px 44px 12px 44px',
                    fontSize: 13.5,
                    color: '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8E9E97', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 900,
                background: '#00E599',
                color: '#000000',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                boxShadow: '0 0 24px rgba(0, 229, 153, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid #00000030', borderTop: '2px solid #000000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Workspace <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>

          {/* Footer Link */}
          <div style={{ borderTop: '1px solid #1B2923', paddingTop: 16, textAlign: 'center', fontSize: 13, color: '#8E9E97' }}>
            Don't have an account yet?{' '}
            <Link to="/register" style={{ color: '#00E599', fontWeight: 800, textDecoration: 'none' }}>
              Create FactLens Account
            </Link>
          </div>

        </div>
      </motion.div>

    </div>
  );
}
