import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const navigate = useNavigate();

  // Password Requirements Validation
  const reqMinLength = password.length >= 8;
  const reqUppercase = /[A-Z]/.test(password);
  const reqLowercase = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);

  const passedReqCount = [reqMinLength, reqUppercase, reqLowercase, reqNumber].filter(Boolean).length;

  // Strength calculation
  let strengthLabel = 'Weak';
  let strengthColor = '#F87171';
  let strengthPct = 33;

  if (passedReqCount >= 4) {
    strengthLabel = 'Strong';
    strengthColor = '#00E599';
    strengthPct = 100;
  } else if (passedReqCount >= 2) {
    strengthLabel = 'Medium';
    strengthColor = '#FBBF24';
    strengthPct = 66;
  }

  // Confirm password match status
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  // Form validity check
  const isEmailValid = email.includes('@') && email.includes('.');
  const isFormValid =
    fullName.trim().length > 1 &&
    isEmailValid &&
    passedReqCount === 4 &&
    passwordsMatch &&
    agreedToTerms;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessState(true);
    }, 1000);
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
          maxWidth: 1080,
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
              CREATE FACTLENS ACCOUNT
            </span>

            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFFFFF', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Start checking with confidence.
            </h1>

            <p style={{ fontSize: 13.5, color: '#00E599', margin: 0, fontWeight: 700, fontFamily: '"Noto Sans Bengali", sans-serif' }}>
              সন্দেহজনক তথ্য যাচাই করতে আপনার FactLens অ্যাকাউন্ট তৈরি করুন।
            </p>

            {/* Steps List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {[
                { num: '01', title: 'Keep your scan history', desc: 'Revisit previous rumor, scam, and image checks.' },
                { num: '02', title: 'Review evidence', desc: 'Keep useful gazettes and source specs organized.' },
                { num: '03', title: 'Workspace continuity', desc: 'Access your verification workspace anytime.' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(0, 229, 153, 0.15)', border: '1px solid rgba(0, 229, 153, 0.3)', color: '#00E599', fontSize: 11, fontFamily: 'monospace', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {step.num}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{step.title}</h4>
                    <p style={{ fontSize: 11.5, color: '#8E9E97', margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, background: '#0F1714', borderRadius: 16, border: '1px solid #1B2923', display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
            <ShieldCheck size={20} style={{ color: '#00E599', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8E9E97' }}>
              ISO & IFCN-Compliant Factual Evidence Infrastructure
            </span>
          </div>
        </div>

        {/* Right Form Side */}
        <div style={{
          gridColumn: 'span 7',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 20,
        }}>

          {successState ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(0, 229, 153, 0.15)', border: '1.5px solid #00E599', color: '#00E599', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0, 229, 153, 0.3)' }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                Account Created Successfully!
              </h2>
              <p style={{ fontSize: 13.5, color: '#8E9E97', margin: 0, maxWidth: 360, lineHeight: 1.5 }}>
                Your FactLens account is ready. You can now access your digital fact verification workspace.
              </p>
              <button
                onClick={() => navigate('/app')}
                style={{
                  padding: '12px 28px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 900,
                  background: '#00E599',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 0 20px rgba(0, 229, 153, 0.4)',
                  marginTop: 8,
                }}
              >
                Go to Verification Workspace <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                  Create FactLens Account
                </h1>
                <p style={{ fontSize: 13, color: '#8E9E97', margin: 0 }}>
                  Enter your details to register for the platform.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Full Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Shahriar Ahmed"
                      style={{
                        width: '100%',
                        background: '#080C0B',
                        border: '1px solid #1B2923',
                        borderRadius: 12,
                        padding: '10px 14px 10px 40px',
                        fontSize: 13,
                        color: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
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
                        borderRadius: 12,
                        padding: '10px 14px 10px 40px',
                        fontSize: 13,
                        color: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Password Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  
                  {/* Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          background: '#080C0B',
                          border: '1px solid #1B2923',
                          borderRadius: 12,
                          padding: '10px 36px 10px 40px',
                          fontSize: 13,
                          color: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8E9E97', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#8E9E97', textTransform: 'uppercase' }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5A6E64' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          background: '#080C0B',
                          border: '1px solid #1B2923',
                          borderRadius: 12,
                          padding: '10px 36px 10px 40px',
                          fontSize: 13,
                          color: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8E9E97', cursor: 'pointer' }}
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#080C0B', padding: 10, borderRadius: 10, border: '1px solid #1B2923' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace' }}>
                      <span style={{ color: '#8E9E97' }}>Password Strength:</span>
                      <span style={{ color: strengthColor, fontWeight: 800 }}>{strengthLabel}</span>
                    </div>
                    <div style={{ height: 4, background: '#1B2923', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${strengthPct}%`, background: strengthColor, transition: 'all 0.3s ease' }} />
                    </div>
                  </div>
                )}

                {/* Terms Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: '#8E9E97', margin: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ accentColor: '#00E599', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>I agree to the Terms of Service & Privacy Policy</span>
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 14,
                    fontSize: 13.5,
                    fontWeight: 900,
                    background: isFormValid ? '#00E599' : '#1B2923',
                    color: isFormValid ? '#000000' : '#5A6E64',
                    border: 'none',
                    cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: isFormValid ? '0 0 20px rgba(0, 229, 153, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid #00000030', borderTop: '2px solid #000000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create FactLens Account <ArrowRight size={16} />
                    </>
                  )}
                </button>

              </form>

              {/* Footer Link */}
              <div style={{ borderTop: '1px solid #1B2923', paddingTop: 14, textAlign: 'center', fontSize: 12.5, color: '#8E9E97' }}>
                Already registered?{' '}
                <Link to="/login" style={{ color: '#00E599', fontWeight: 800, textDecoration: 'none' }}>
                  Sign In
                </Link>
              </div>
            </>
          )}

        </div>
      </motion.div>

    </div>
  );
}
