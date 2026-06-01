import React, { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../api/client';
import { Bell } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read?: boolean;
}

function emojiForType(type: string) {
  if (!type) return '🔔';
  if (type.includes('session')) return '📅';
  if (type.includes('anomaly')) return '⚠️';
  if (type.includes('manual')) return '✍️';
  return '🔔';
}

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 10 });
      const data = res.data;
      const itemsArray = Array.isArray(data) ? data : (data && (data.items || data.notifications)) || [];
      setItems(itemsArray || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const id = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setItems((s) => s.map((it) => (it.id === id ? { ...it, read: true } : it)));
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    try {
      const list = Array.isArray(items) ? items : [];
      await Promise.all(list.filter((i) => !i.read).map((i) => notificationsApi.markRead(i.id)));
      setItems((s) => (Array.isArray(s) ? s.map((it) => ({ ...it, read: true })) : s));
    } catch (e) {
      console.error(e);
    }
  }

  const unreadCount = Array.isArray(items) ? items.filter((i) => !i.read).length : 0;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="header-icon-btn" onClick={() => setOpen(!open)} aria-label={t('notifications')}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--danger)',
              border: '2px solid var(--bg-card)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="animate-scale-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: 340,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('notifications')}</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'transparent', color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
                {t('markAllRead')}
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
            {loading ? (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{t('loading')}</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '32px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{t('noNotifications')}</div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  onClick={() => markRead(it.id)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 4,
                    cursor: 'pointer',
                    background: it.read ? 'transparent' : 'var(--primary-light)',
                  }}
                >
                  <div style={{ fontSize: 18, lineHeight: 1.2 }}>{emojiForType(it.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{it.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(it.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
