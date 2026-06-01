import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link, Outlet } from 'react-router-dom';
import {
  LogOut, Menu, X, Sun, Moon, User, Settings, UserPlus, Search,
  LayoutDashboard, Users as UsersIcon, BookOpen, Calendar, BarChart3,
  AlertTriangle, ScrollText,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

interface LayoutUser {
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'LECTURER' | 'STUDENT';
}

interface LayoutProps {
  user?: LayoutUser;
  onLogout?: () => void;
  unreadNotifications?: number;
  children?: React.ReactNode;
}

type NavSection = 'main' | 'management';

const navItems: Array<{
  path: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  section: NavSection;
  roleRequired?: string;
}> = [
  { path: '/', labelKey: 'overview', icon: <LayoutDashboard size={18} />, section: 'main' },
  { path: '/users', labelKey: 'users', icon: <UsersIcon size={18} />, section: 'main' },
  { path: '/courses', labelKey: 'courses', icon: <BookOpen size={18} />, section: 'main' },
  { path: '/sessions', labelKey: 'sessions', icon: <Calendar size={18} />, section: 'main' },
  { path: '/registrations', labelKey: 'registrations', icon: <UserPlus size={18} />, section: 'management', roleRequired: 'ADMIN' },
  { path: '/reports', labelKey: 'reports', icon: <BarChart3 size={18} />, section: 'management' },
  { path: '/anomalies', labelKey: 'anomalies', icon: <AlertTriangle size={18} />, section: 'management' },
  { path: '/audit', labelKey: 'auditLog', icon: <ScrollText size={18} />, section: 'management', roleRequired: 'SUPER_ADMIN' },
];

const pageTitle: Record<string, TranslationKey> = {
  '/': 'overview',
  '/users': 'users',
  '/courses': 'courses',
  '/sessions': 'sessions',
  '/registrations': 'registrations',
  '/reports': 'reports',
  '/anomalies': 'anomalies',
  '/audit': 'auditLog',
  '/profile': 'profile',
  '/settings': 'settings',
};

export const Layout: React.FC<LayoutProps> = ({
  user: userProp,
  onLogout: onLogoutProp,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleTheme]);

  // Global Escape to close modals or panels
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.dispatchEvent(new Event('closeAllModals'));
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const user = userProp || {
    name: authUser?.name || 'Admin User',
    role: (authUser?.role as 'ADMIN' | 'SUPER_ADMIN' | 'LECTURER' | 'STUDENT') || 'ADMIN',
  };
  const userEmail = (authUser as any)?.email || '';
  const avatarSource =
    (authUser as any)?.avatar_url ||
    (authUser as any)?.avatar ||
    (authUser as any)?.avatar_base64 ||
    '';
  const avatarSrc = avatarSource
    ? (avatarSource.startsWith('data:') || avatarSource.startsWith('http')
        ? avatarSource
        : `data:image/jpeg;base64,${avatarSource}`)
    : '';

  const currentPath = location.pathname;
  const title = t(pageTitle[currentPath] || 'dashboard');
  const profileActive = currentPath === '/profile' || currentPath === '/settings';
  const roleLabel = user.role === 'SUPER_ADMIN' ? t('superAdmin') : t(user.role.toLowerCase() as TranslationKey);

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roleRequired) return true;
    if (item.roleRequired === 'SUPER_ADMIN') return user.role === 'SUPER_ADMIN';
    if (item.roleRequired === 'ADMIN') return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    return item.roleRequired === user.role;
  });

  const mainItems = visibleNavItems.filter((i) => i.section === 'main');
  const managementItems = visibleNavItems.filter((i) => i.section === 'management');

  const handleLogout = async () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  const userInitial = user.name.charAt(0).toUpperCase();

  const renderNavLink = (item: (typeof navItems)[number]) => {
    const isActive = currentPath === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        title={t(item.labelKey)}
        onClick={() => setSidebarOpen(false)}
        className={`app-sidebar-link ${isActive ? 'active' : ''}`}
      >
        <span className="app-sidebar-icon">{item.icon}</span>
        <span className="app-sidebar-label">{t(item.labelKey)}</span>
      </Link>
    );
  };

  const avatarNode = (fontSize: number) =>
    avatarSrc ? (
      <img src={avatarSrc} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <span style={{ color: '#fff', fontWeight: 700, fontSize }}>{userInitial}</span>
    );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="hide-laptop hide-tablet"
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 30 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        {/* Logo */}
        <div className="app-sidebar-logo-section">
          <div className="app-sidebar-logo-box">
            <img src="/logo.jpeg" alt={t('smartAttendance')} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="app-sidebar-logo-text">
            <div className="app-sidebar-logo-title">{t('smartAttendance')}</div>
            <div className="app-sidebar-logo-subtitle">{t('universitySystem')}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="app-sidebar-nav">
          <div className="sidebar-section-label">{t('mainMenu')}</div>
          {mainItems.map(renderNavLink)}

          {managementItems.length > 0 && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section-label">{t('management')}</div>
              {managementItems.map(renderNavLink)}
            </>
          )}
        </nav>

        {/* User card */}
        <div className="app-sidebar-footer">
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="app-sidebar-user-card"
            style={profileActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}
          >
            <div className="app-sidebar-avatar">{avatarNode(13)}</div>
            <div className="app-sidebar-user-text" style={{ flex: 1, minWidth: 0 }}>
              <div className="app-sidebar-user-name">{user.name}</div>
              <div className="app-sidebar-user-role">{roleLabel}</div>
            </div>
            <Settings size={16} style={{ color: '#4B5563', flexShrink: 0 }} className="app-sidebar-user-text" />
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="app-hamburger header-icon-btn"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="app-header-title">{title}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <button className="header-search-btn hide-tablet hide-mobile" type="button">
              <Search size={15} />
              <span style={{ flex: 1, textAlign: 'left' }}>{t('search')}...</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                Ctrl+K
              </span>
            </button>

            {/* Language toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['en', 'fr'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: lang === l ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: lang === l ? 'var(--primary)' : 'transparent',
                    color: lang === l ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button onClick={toggleTheme} title="Toggle dark mode (Ctrl+D)" className="header-icon-btn">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Avatar + dropdown */}
            <div ref={avatarMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setAvatarMenuOpen((c) => !c)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: avatarSrc ? 'var(--bg-card)' : 'var(--primary)',
                  border: avatarMenuOpen ? '2px solid var(--primary)' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={t('profile')}
              >
                {avatarNode(14)}
              </button>

              {avatarMenuOpen && (
                <div
                  className="animate-scale-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    width: 240,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 8,
                    zIndex: 60,
                  }}
                >
                  {/* User info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: avatarSrc ? 'var(--bg-card)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {avatarNode(14)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      {userEmail && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {userEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <button className="dropdown-item" onClick={() => { setAvatarMenuOpen(false); navigate('/profile'); }}>
                    <User size={16} />
                    <span>{t('viewProfile')}</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { setAvatarMenuOpen(false); navigate('/settings'); }}>
                    <Settings size={16} />
                    <span>{t('settings')}</span>
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
                  <button className="dropdown-item dropdown-item-danger" onClick={() => { setAvatarMenuOpen(false); void handleLogout(); }}>
                    <LogOut size={16} />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="app-main-padding" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', padding: 28 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
