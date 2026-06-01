import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Hash, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !studentNumber || !password) {
      const m = t('pleaseFillAllFields');
      setError(m);
      toast.error(m);
      return;
    }
    if (password.length < 8) {
      const m = t('passwordMinLength');
      setError(m);
      toast.error(m);
      return;
    }
    if (password !== confirm) {
      const m = t('passwordsDoNotMatch');
      setError(m);
      toast.error(m);
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email, password, student_number: studentNumber });
      toast.success(t('accountCreated'));
      navigate('/overview', { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        t('registrationFailed');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const features = [t('feature3LayerQR'), t('featureRealTimeAnalytics'), t('featureBilingual')];

  return (
    <div className="login-grid" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* LEFT PANEL */}
      <div
        className="login-hero hide-mobile"
        style={{
          background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 40%, #1A56DB 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 48,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1A56DB 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(26,86,219,0.5)',
              overflow: 'hidden',
            }}
          >
            <img src="/logo.jpeg" alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{t('smartAttendance')}</span>
        </div>

        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {t('loginHeroTitle')}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 16, maxWidth: 340, lineHeight: 1.6 }}>
            {t('loginHeroSubtitle')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
            {features.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', color: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} />
                </span>
                <span style={{ fontSize: 14, color: '#fff' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('universityOfBamenda')}</div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{t('createYourAccount')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 6, marginBottom: 28 }}>{t('signupSubtitle')}</p>

          {error && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{t('registrationFailed')}</p>
              <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full name */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="name" className="field-label">{t('name')}</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="name" type="text" autoComplete="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className="field-input" style={{ paddingLeft: 40 }} disabled={submitting} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" className="field-label">{t('email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="email" type="email" autoComplete="email" placeholder="you@institution.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" style={{ paddingLeft: 40 }} disabled={submitting} />
              </div>
            </div>

            {/* Matricule */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="matricule" className="field-label">{t('matricule')}</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="matricule" type="text" placeholder="UBa20XXXX" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} className="field-input" style={{ paddingLeft: 40 }} disabled={submitting} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="password" className="field-label">{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t('enterYourPassword')} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" style={{ paddingLeft: 40, paddingRight: 44 }} disabled={submitting} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={submitting} aria-label={showPassword ? t('hidePassword') : t('showPassword')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="confirm" className="field-label">{t('confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t('confirmPassword')} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input" style={{ paddingLeft: 40 }} disabled={submitting} />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-lg btn-block" style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #1648C8 100%)', color: '#fff' }}>
              {submitting ? (
                <>
                  <svg className="animate-spin" style={{ width: 20, height: 20 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t('creatingAccount')}</span>
                </>
              ) : (
                t('register')
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 24 }}>
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
