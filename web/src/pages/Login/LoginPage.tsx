import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../api/client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    let cancelled = false;
    const healthUrl = API_BASE_URL.replace(/\/v1\/?$/, '') + '/health';

    // A hosted free-tier backend may be asleep; poll a few times with a long
    // per-attempt timeout to give it time to wake before declaring it down.
    const probe = async (timeoutMs: number) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(healthUrl, { signal: controller.signal });
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    };

    const checkBackend = async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const ok = await probe(30_000);
          if (cancelled) return;
          if (ok) {
            setBackendStatus('up');
            return;
          }
        } catch (err) {
          console.error('Backend health check failed:', err);
        }
        // brief pause before retrying (gives the server time to spin up)
        await new Promise((r) => setTimeout(r, 2_000));
      }
      if (!cancelled) setBackendStatus('down');
    };

    checkBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      const message = t('pleaseEnterBoth');
      setError(message);
      toast.error(message);
      return;
    }

    try {
      const user = await login(email, password);
      toast.success(t('welcomeBack'));
      navigate(user?.first_login ? '/first-login' : '/overview', { replace: true });
    } catch (err: any) {
      console.error('Login failed:', err, 'response:', err?.response?.data, 'status:', err?.response?.status);
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        t('loginFailed');
      setError(message);
      toast.error(message);
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
        {/* Top */}
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

        {/* Middle */}
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

        {/* Bottom */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('universityOfBamenda')}</div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{t('welcomeBack')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 6, marginBottom: 32 }}>{t('signInToContinue')}</p>

          {/* Error */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20 }}
            >
              <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{t('loginFailed')}</p>
              <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>
            </div>
          )}
          {backendStatus === 'checking' && !error && (
            <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg className="animate-spin" style={{ width: 16, height: 16, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t('connectingToServer')}</span>
            </div>
          )}
          {backendStatus === 'down' && !error && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--warning)' }}>
              {t('serverWakingUp')}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="email" className="field-label">{t('email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  style={{ paddingLeft: 40 }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="password" className="field-label">{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('enterYourPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted"
                  disabled={loading}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'transparent', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-lg btn-block"
              style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #1648C8 100%)', color: '#fff' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" style={{ width: 20, height: 20 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t('signingIn')}</span>
                </>
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('or')}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('newStudent')}</Link>
          </p>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
            {t('smartAttendanceSystemV1')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
