import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ChevronDown,
  LogOut,
  PencilLine,
  Settings,
  User,
  Lock,
  X,
  ScanFace,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { usersApi } from '../../api/client';

type ToastType = 'success' | 'error';

interface ProfileData {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  avatar?: string;
  avatar_base64?: string;
  student_number?: string;
  matricule?: string;
  staff_id?: string;
  phone?: string;
  department?: string;
  bio?: string;
  created_at?: string;
  member_since?: string;
  face_registered?: boolean;
  face_registered_at?: string;
  courses_count?: number;
  sessions_count?: number;
  attendance_percent?: number;
  mark?: number;
  students_count?: number;
  week_count?: number;
  week_sessions?: number;
  stats?: Record<string, any>;
  [key: string]: any;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  department: string;
  bio: string;
}

const strengthForPassword = (password: string) => {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length < 8 || score <= 1) {
    return { key: 'weak' as const, width: '25%', color: 'var(--danger)' };
  }
  if (score === 2) {
    return { key: 'fair' as const, width: '50%', color: 'var(--warning)' };
  }
  if (score === 3) {
    return { key: 'strong' as const, width: '75%', color: 'var(--success)' };
  }
  return { key: 'veryStrong' as const, width: '100%', color: 'var(--success-dark)' };
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
};

const toBase64Only = (dataUrl: string) => dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

const initialsFromName = (name?: string) =>
  (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

const getRoleLabel = (role: string | undefined, t: (key: any) => string) => {
  switch ((role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
      return t('superAdmin');
    case 'ADMIN':
      return t('admin');
    case 'LECTURER':
      return t('lecturer');
    case 'COORDINATOR':
      return t('coordinator');
    case 'STUDENT':
      return t('student');
    default:
      return role || '—';
  }
};

const getAvatarSrc = (profile: ProfileData | null, _fallbackName?: string, preview?: string | null) => {
  const candidate = preview || profile?.avatar_url || profile?.avatar || profile?.avatar_base64;
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith('data:') || candidate.startsWith('http')) {
    return candidate;
  }

  return `data:image/jpeg;base64,${candidate}`;
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [savePasswordLoading, setSavePasswordLoading] = useState(false);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [faceSaving, setFaceSaving] = useState(false);
  const [passwordState, setPasswordState] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    department: '',
    bio: '',
  });

  const { data } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => {
      const response = await usersApi.me();
      return response.data as ProfileData;
    },
    initialData: user as ProfileData,
  });

  useEffect(() => {
    if (data) {
      setProfile(data);
      setFormState({
        name: data?.name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        department: data?.department || '',
        bio: data?.bio || '',
      });
      updateUser({
        ...(user as any),
        ...(data as any),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    setProfile((current) => current || (user as ProfileData));
  }, [user]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const activeProfile = profile || (user as ProfileData) || {};
  const role = (activeProfile.role || user?.role || '').toUpperCase();
  const displayName = activeProfile.name || user?.name || 'User';
  const displayEmail = activeProfile.email || user?.email || '';
  const avatarSrc = getAvatarSrc(activeProfile, displayName, avatarPreview);
  const initials = initialsFromName(displayName);
  const isLecturer = role === 'LECTURER';

  const stats = useMemo(() => {
    const fallback = (keys: string[]) =>
      keys.reduce((acc, key) => {
        const value = activeProfile[key];
        return acc || value === 0 || Boolean(value) ? value : acc;
      }, undefined as any);

    if (role === 'STUDENT') {
      return [
        { label: t('courses'), value: fallback(['courses_count', 'course_count', 'courses']) ?? 0 },
        { label: t('sessions'), value: fallback(['sessions_count', 'session_count', 'sessions']) ?? 0 },
        { label: t('attendancePercent'), value: `${fallback(['attendance_percent', 'attendance']) ?? 0}%` },
        { label: t('markOutOf10'), value: fallback(['mark', 'mark_out_of_10']) ?? 0 },
      ];
    }

    return [
      { label: t('courses'), value: fallback(['courses_count', 'course_count', 'courses']) ?? 0 },
      { label: t('sessions'), value: fallback(['sessions_count', 'session_count', 'sessions']) ?? 0 },
      { label: t('students'), value: fallback(['students_count', 'student_count', 'students']) ?? 0 },
      { label: t('thisWeek'), value: fallback(['week_sessions', 'week_count', 'this_week']) ?? 0 },
    ];
  }, [activeProfile, role, t]);

  const profileRows = useMemo(() => {
    type ProfileField = keyof FormState | 'student_number';
    type ProfileRow = { label: string; value: React.ReactNode; field: ProfileField; editable: boolean };
    const rows: ProfileRow[] = [
      { label: t('fullName'), value: activeProfile.name || '—', field: 'name', editable: true },
      {
        label: role === 'STUDENT' ? t('matricule') : t('staffId'),
        value: activeProfile.student_number || activeProfile.matricule || activeProfile.staff_id || '—',
        field: 'student_number',
        editable: false,
      },
      { label: t('email'), value: activeProfile.email || '—', field: 'email', editable: true },
      { label: t('phone'), value: activeProfile.phone || '—', field: 'phone', editable: true },
    ];

    if (isLecturer) {
      rows.push({ label: t('department'), value: activeProfile.department || '—', field: 'department', editable: true });
    }

    rows.push({ label: t('bio'), value: activeProfile.bio || '—', field: 'bio', editable: true });
    return rows;
  }, [activeProfile, isLecturer, role, t]);

  const pushToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      pushToast('error', t('invalidImageType') || 'Please choose a JPG or PNG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const base64 = toBase64Only(dataUrl);
      setAvatarPreview(dataUrl);
      setLoadingAvatar(true);
      try {
        const response = await usersApi.updateAvatar({ avatar_base64: base64 });
        const updated = response.data?.user || response.data || {};
        const merged = { ...(activeProfile as any), ...(updated as any), avatar_url: updated.avatar_url || updated.avatar || dataUrl };
        setProfile(merged);
        updateUser({ ...(user as any), ...(merged as any) });
        pushToast('success', t('success'));
      } catch (error: any) {
        setAvatarPreview(null);
        pushToast('error', error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
      } finally {
        setLoadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadAvatar(file);
    }
    event.target.value = '';
  };

  const handleSaveProfile = async () => {
    setSaveProfileLoading(true);
    try {
      const payload: Record<string, any> = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        bio: formState.bio,
      };

      if (isLecturer) {
        payload.department = formState.department;
      }

      const response = await usersApi.updateMe(payload);
      const updated = response.data?.user || response.data || payload;
      const merged = { ...(activeProfile as any), ...(updated as any) };
      setProfile(merged);
      updateUser({ ...(user as any), ...(merged as any) });
      setEditing(false);
      pushToast('success', t('success'));
    } catch (error: any) {
      pushToast('error', error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const handleSavePassword = async () => {
    const { current_password, new_password, confirm_password } = passwordState;
    if (!current_password || !new_password || !confirm_password) {
      pushToast('error', t('fillRequiredFields'));
      return;
    }
    if (new_password.length < 8) {
      pushToast('error', t('passwordTooShort'));
      return;
    }
    if (new_password !== confirm_password) {
      pushToast('error', t('passwordMismatch'));
      return;
    }

    setSavePasswordLoading(true);
    try {
      await usersApi.changePassword({
        current_password,
        new_password,
        confirm_password,
      });
      setPasswordState({ current_password: '', new_password: '', confirm_password: '' });
      pushToast('success', t('passwordUpdatedSuccessfully'));
    } catch (error: any) {
      pushToast('error', error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setSavePasswordLoading(false);
    }
  };

  const handleFaceCapture = async () => {
    const video = webcamVideoRef.current;
    if (!video) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      pushToast('error', t('somethingWentWrong'));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFacePreview(dataUrl);
  };

  const startWebcam = async () => {
    try {
      setFaceModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      pushToast('error', error?.message || t('cameraAccessIsRequiredForFaceCapture'));
      setFaceModalOpen(false);
    }
  };

  const closeWebcam = () => {
    setFaceModalOpen(false);
    setFacePreview(null);
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
  };

  const saveFace = async () => {
    if (!facePreview) {
      return;
    }

    setFaceSaving(true);
    try {
      const base64 = toBase64Only(facePreview);
      const response = await usersApi.updateFace({ face_image_base64: base64 });
      const updated = response.data?.user || response.data || {};
      const merged = {
        ...(activeProfile as any),
        ...(updated as any),
        face_registered: true,
        face_registered_at: updated.face_registered_at || new Date().toISOString(),
      };
      setProfile(merged);
      updateUser({ ...(user as any), ...(merged as any) });
      pushToast('success', t('faceRegistered'));
      closeWebcam();
    } catch (error: any) {
      pushToast('error', error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setFaceSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: 999,
    backgroundColor: 'var(--bg)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {t('profile')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
            {t('editProfile')}
          </p>
        </div>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((current) => !current)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 999,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
              color: 'var(--text-inverse)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                {initials}
              </div>
            )}
            <ChevronDown size={16} />
          </button>

          {dropdownOpen ? (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 10px)',
                minWidth: 220,
                borderRadius: 16,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 12px 32px var(--shadow-strong)',
                padding: 8,
                zIndex: 50,
              }}
            >
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/profile');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--text)',
                }}
              >
                <User size={16} />
                <span>{t('viewProfile')}</span>
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--text)',
                }}
              >
                <Settings size={16} />
                <span>{t('settings')}</span>
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  void handleLogout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--danger)',
                }}
              >
                <LogOut size={16} />
                <span>{t('signOut')}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
        <section
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 32,
          }}
        >
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={handleAvatarChange}
            />
            <button
              className="profile-avatar-button"
              onClick={openFilePicker}
              disabled={loadingAvatar}
              style={{
                position: 'relative',
                width: 130,
                height: 130,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid var(--bg)',
                backgroundColor: 'var(--primary)',
                color: 'var(--text-inverse)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 42, fontWeight: 800 }}>{initials}</span>
              )}
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: 'var(--overlay-strong)',
                  color: 'var(--text-inverse)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }}
                className="profile-avatar-overlay"
              >
                <Camera size={18} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t('change')}</span>
              </span>
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{displayName}</h2>
            <div style={{ marginTop: 10 }}>
              <span style={roleBadgeStyle}>{getRoleLabel(role, t)}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 10 }}>{displayEmail}</p>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          <div
            style={{
              backgroundColor: 'var(--bg)',
              borderRadius: 10,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{stat.value}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginTop: 4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, color: 'var(--text-secondary)', fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{t('memberSince')}:</span>{' '}
            {formatDate(activeProfile.created_at || activeProfile.member_since)}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 24 }}>
          <article
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('personalInfo')}</h3>
              <button
                onClick={() => setEditing((current) => !current)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <PencilLine size={16} />
                <span>{editing ? t('cancel') : t('editProfile')}</span>
              </button>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
              {profileRows.map((row) => (
                <div key={row.label} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{row.label}</div>
                  {editing && row.editable ? (
                    row.field === 'bio' ? (
                      <textarea
                        value={formState.bio}
                        onChange={(e) => setFormState((current) => ({ ...current, bio: e.target.value }))}
                        rows={4}
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg)',
                          color: 'var(--text)',
                          padding: '12px 14px',
                          resize: 'vertical',
                        }}
                      />
                    ) : (
                      <input
                        value={formState[row.field === 'name' ? 'name' : row.field === 'email' ? 'email' : row.field === 'phone' ? 'phone' : 'department']}
                        onChange={(e) => {
                          const field =
                            row.field === 'name'
                              ? 'name'
                              : row.field === 'email'
                                ? 'email'
                                : row.field === 'phone'
                                  ? 'phone'
                                  : 'department';
                          setFormState((current) => ({ ...current, [field]: e.target.value }));
                        }}
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg)',
                          color: 'var(--text)',
                          padding: '0 14px',
                        }}
                      />
                    )
                  ) : (
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: row.value === '—' ? 'var(--text-secondary)' : 'var(--text)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.value}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {editing ? (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormState({
                      name: activeProfile.name || '',
                      email: activeProfile.email || '',
                      phone: activeProfile.phone || '',
                      department: activeProfile.department || '',
                      bio: activeProfile.bio || '',
                    });
                  }}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 700,
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saveProfileLoading}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 12,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                    opacity: saveProfileLoading ? 0.75 : 1,
                  }}
                >
                  {saveProfileLoading ? t('loading') : t('save')}
                </button>
              </div>
            ) : null}
          </article>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <article
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('faceRegistration')}</h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: activeProfile.face_registered ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: activeProfile.face_registered ? 'var(--success)' : 'var(--danger)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {activeProfile.face_registered ? t('faceRegistered') : t('faceNotRegistered')}
                </span>
              </div>

              <div style={{ marginTop: 18, color: 'var(--text-secondary)', fontSize: 14 }}>
                {activeProfile.face_registered ? (
                  <>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{t('registeredOn')}:</span>{' '}
                    {formatDate(activeProfile.face_registered_at)}
                  </>
                ) : (
                  <span>{t('faceNotRegistered')}</span>
                )}
              </div>

              <button
                onClick={startWebcam}
                style={{
                  marginTop: 22,
                  height: 48,
                  width: '100%',
                  borderRadius: 12,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <ScanFace size={18} />
                {t('updateFace')}
              </button>
            </article>

            <article
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 28,
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('accountSecurity')}</h3>

              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {t('currentPassword')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', padding: '0 14px' }}>
                    <Lock size={16} color="var(--text-secondary)" />
                    <input
                      type="password"
                      value={passwordState.current_password}
                      onChange={(e) => setPasswordState((current) => ({ ...current, current_password: e.target.value }))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {t('newPassword')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', padding: '0 14px' }}>
                    <Lock size={16} color="var(--text-secondary)" />
                    <input
                      type="password"
                      value={passwordState.new_password}
                      onChange={(e) => setPasswordState((current) => ({ ...current, new_password: e.target.value }))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--text)' }}
                    />
                  </div>
                  <div style={{ marginTop: 10, height: 8, borderRadius: 999, backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ width: strengthForPassword(passwordState.new_password).width, height: '100%', backgroundColor: strengthForPassword(passwordState.new_password).color }} />
                  </div>
                  <div style={{ color: strengthForPassword(passwordState.new_password).color, fontSize: 12, marginTop: 6 }}>
                    {t(strengthForPassword(passwordState.new_password).key)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {t('confirmPassword')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', padding: '0 14px' }}>
                    <Lock size={16} color="var(--text-secondary)" />
                    <input
                      type="password"
                      value={passwordState.confirm_password}
                      onChange={(e) => setPasswordState((current) => ({ ...current, confirm_password: e.target.value }))}
                      style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePassword}
                  disabled={savePasswordLoading}
                  style={{
                    height: 48,
                    width: '100%',
                    borderRadius: 12,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: savePasswordLoading ? 0.75 : 1,
                  }}
                >
                  {savePasswordLoading ? t('loading') : t('updatePassword')}
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      {faceModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              borderRadius: 20,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('faceRegistration')}</h3>
              <button onClick={closeWebcam} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 16 }}>
              <div
                style={{
                  backgroundColor: 'var(--surface-dark)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  minHeight: 360,
                  position: 'relative',
                }}
              >
                {facePreview ? (
                  <img src={facePreview} alt="face preview" style={{ width: '100%', height: 360, objectFit: 'cover' }} />
                ) : (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: 360, objectFit: 'cover' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {facePreview ? (
                  <button
                    onClick={() => setFacePreview(null)}
                    style={{
                      height: 44,
                      padding: '0 16px',
                      borderRadius: 12,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontWeight: 700,
                    }}
                  >
                    {t('retake')}
                  </button>
                ) : null}
                <button
                  onClick={facePreview ? saveFace : handleFaceCapture}
                  disabled={faceSaving}
                  style={{
                    height: 44,
                    padding: '0 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                    opacity: faceSaving ? 0.75 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {faceSaving ? t('loading') : facePreview ? t('save') : t('capture')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 90,
            backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'var(--text-inverse)',
            padding: '14px 18px',
            borderRadius: 14,
            boxShadow: '0 12px 30px var(--shadow-strong)',
            fontWeight: 700,
          }}
        >
          {toast.message}
        </div>
      ) : null}

      <style>{`
        .profile-avatar-button:hover .profile-avatar-overlay {
          opacity: 1 !important;
        }
        button:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
