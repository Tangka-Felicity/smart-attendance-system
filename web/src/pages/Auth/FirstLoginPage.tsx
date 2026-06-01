import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { authApi } from '../../api/client';

const strengthForPassword = (password: string) => {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length < 8 || score <= 1) {
    return { key: 'weak' as const, width: '25%', color: '#DC2626' };
  }
  if (score === 2) {
    return { key: 'fair' as const, width: '50%', color: '#F59E0B' };
  }
  if (score === 3) {
    return { key: 'strong' as const, width: '75%', color: '#16A34A' };
  }
  return { key: 'veryStrong' as const, width: '100%', color: '#166534' };
};

const FirstLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const strength = useMemo(() => strengthForPassword(newPassword), [newPassword]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.first_login) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError(t('required'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    try {
      setError('');
      setLoading(true);
      await authApi.firstLoginChangePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setLoading(false);
      setToastVisible(true);
      window.setTimeout(() => {
        updateUser({ ...user, first_login: false });
        navigate('/overview', { replace: true });
      }, 900);
    } catch (submitError: any) {
      setLoading(false);
      setError(submitError?.response?.data?.detail || submitError?.message || t('somethingWentWrong'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-[440px] p-8"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--primary-light)' }}
          >
            <KeyRound size={48} color="var(--primary)" />
          </div>
          <h1 className="text-[24px] font-bold" style={{ color: 'var(--text)' }}>
            {t('welcomeWithName').replace('{name}', user.name || '')}
          </h1>
          <p className="mt-2 text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>{t('firstLoginMessage')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('newPassword')}</label>
            <div
              className="flex h-14 items-center px-4"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}
            >
              <LockKeyhole size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                type={showNewPassword ? 'text' : 'password'}
                placeholder={t('newPassword')}
                className="ml-3 h-full w-full bg-transparent outline-none"
                style={{ color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                className="ml-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-hover)' }}>
              <div className="h-full" style={{ width: strength.width, backgroundColor: strength.color }} />
            </div>
            <p className="mt-2 text-xs" style={{ color: strength.color }}>
              {t(strength.key)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('confirmPassword')}</label>
            <div
              className="flex h-14 items-center px-4"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}
            >
              <LockKeyhole size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('confirmPassword')}
                className="ml-3 h-full w-full bg-transparent outline-none"
                style={{ color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="ml-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? (
            <div
              className="px-4 py-3"
              style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg btn-block"
          >
            {loading ? <span className="animate-pulse">{t('loading')}</span> : t('setPassword')}
          </button>
        </form>

        {toastVisible ? (
          <div
            className="mt-4 px-4 py-3 text-center text-sm font-semibold"
            style={{ background: 'var(--success)', color: '#fff', borderRadius: 'var(--radius-md)' }}
          >
            {t('passwordUpdatedSuccessfully')}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FirstLoginPage;
