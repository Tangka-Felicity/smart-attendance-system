import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Button,
  Card,
  CardBody,
  Table,
  Badge,
  Modal,
  EmptyState,
} from '../../components/ui';
import toast from 'react-hot-toast';
import { Search, Plus, Play, Eye, FileText, Bell, MapPin } from 'lucide-react';
import { sessionsApi, coursesApi } from '../../api/client';
import { useTranslation } from '../../context/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

interface Session {
  id: string;
  course_name?: string;
  course?: { code?: string; name?: string };
  venue?: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  status?: 'OPEN' | 'PENDING' | 'CLOSED';
  present_count?: number;
  total_students?: number;
}

const STATUS_TABS = ['All', 'OPEN', 'PENDING', 'CLOSED'] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const getStatusBadge = (t: (key: TranslationKey) => string, status?: string) => {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
        <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
        {t('open')}
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
        {t('pending')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--text)' }} />
      {t('closed')}
    </span>
  );
};

const SessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState<StatusTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrData, setSelectedQrData] = useState('');
  const [selectedSessionTitle, setSelectedSessionTitle] = useState('');

  const emptyForm = {
    course_id: '',
    venue_name: '',
    start_time: '',
    end_time: '',
    latitude: '',
    longitude: '',
    category: 'REGULAR',
    geofence_radius: '50',
    grace_period: '15',
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [locating, setLocating] = useState(false);

  const { data: courseOptions = [] } = useQuery({
    queryKey: ['courses-options'],
    queryFn: async () => {
      const res = await coursesApi.list();
      return (res.data as Array<{ id: string; code?: string; name?: string }>) || [];
    },
    enabled: createOpen,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', statusTab],
    queryFn: async () => {
      const params = statusTab === 'All' ? {} : { status: statusTab };
      const res = await sessionsApi.list(params);
      return res.data as Session[];
    },
  });

  const openMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await sessionsApi.open(sessionId);
      const qrRes = await sessionsApi.getQR(sessionId);
      return qrRes.data;
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      const session = sessions.find((s) => s.id === sessionId);
      const code = data?.session_code || session?.session_code || '';
      setSelectedQrData(data?.qr_code || data?.qr || data || '');
      setQrModalOpen(true);
      setSelectedSessionTitle(session?.course_name || t('sessions'));
      toast.success(`${t('sessionOpenedSuccess')}${code ? ' - Code: ' + code : ''}`);
    },
    onError: (err: any) => {
      toast.error(t('failedToOpenSession') + ': ' + String(err));
    },
  });

  const announceMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await sessionsApi.announce(sessionId);
      return res.data;
    },
    onSuccess: () => {
      toast.success(t('announcementSent'));
    },
    onError: (err: any) => {
      toast.error(t('failedToSendAnnouncement') + ': ' + String(err));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        course_id: form.course_id,
        venue_name: form.venue_name.trim(),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        category: form.category,
        geofence_radius: Number(form.geofence_radius) || 50,
        grace_period: Number(form.grace_period) || 15,
      };
      const res = await sessionsApi.create(body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('sessionCreatedSuccess'));
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || t('failedToCreateSession'));
    },
  });

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('locationError'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success(t('locationCaptured'));
      },
      () => {
        setLocating(false);
        toast.error(t('locationError'));
      }
    );
  };

  const handleCreateSubmit = () => {
    if (!form.course_id || !form.venue_name.trim() || !form.start_time || !form.end_time || !form.latitude || !form.longitude) {
      toast.error(t('fillRequiredFields'));
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast.error(t('endAfterStart'));
      return;
    }
    createMutation.mutate();
  };

  const setField = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const courseName = (session.course_name || session.course?.name || '').toLowerCase();
      const courseCode = (session.course?.code || '').toLowerCase();
      const venue = (session.venue || '').toLowerCase();
      return courseName.includes(query) || courseCode.includes(query) || venue.includes(query);
    });
  }, [sessions, searchQuery]);

  const tableColumns = [
    {
      key: 'course',
      label: t('course'),
      render: (_: unknown, row: Session) => (
        <div className="space-y-1">
          <div className="font-semibold text-primary">{row.course_name || row.course?.name || '—'}</div>
          <div className="text-xs text-secondary">{row.course?.code || ''}</div>
        </div>
      ),
    },
    { key: 'venue', label: t('venue') },
    {
      key: 'date',
      label: t('date'),
      render: (_: unknown, row: Session) => {
        if (!row.start_time) return '—';
        return format(new Date(row.start_time), 'PPP');
      },
    },
    {
      key: 'time',
      label: t('startEndTime'),
      render: (_: unknown, row: Session) => {
        if (!row.start_time || !row.end_time) return '—';
        return `${format(new Date(row.start_time), 'p')} - ${format(new Date(row.end_time), 'p')}`;
      },
    },
    {
      key: 'category',
      label: t('category'),
      render: (value: string) => <Badge variant="primary">{value || t('regular')}</Badge>,
    },
    {
      key: 'status',
      label: t('status'),
      render: (_: unknown, row: Session) => getStatusBadge(t, row.status),
    },
    {
      key: 'present_count',
      label: t('studentsPresent'),
      render: (value: number, row: Session) => `${value ?? 0}/${row.total_students ?? 0}`,
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_: unknown, row: Session) => (
        <div className="flex flex-wrap gap-2">
          {row.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMutation.mutate(row.id)}
            >
              <Play size={14} />
              {t('openSession')}
            </Button>
          )}
          {row.status === 'OPEN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/sessions/${row.id}`)}
            >
              <Eye size={14} />
              {t('viewLive')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/sessions/${row.id}`)}
          >
            <FileText size={14} />
            {t('viewDetails')}
          </Button>
          {row.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => announceMutation.mutate(row.id)}
            >
              <Bell size={14} />
              {t('announceSession')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCloseQr = () => {
    setQrModalOpen(false);
    setSelectedQrData('');
  };

  const statusTabLabel = (tab: StatusTab): string => {
    const map: Record<StatusTab, TranslationKey> = {
      All: 'all',
      OPEN: 'open',
      PENDING: 'pending',
      CLOSED: 'closed',
    };
    return t(map[tab]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('sessions')}</h1>
          <p className="text-secondary">{t('sessionsSubtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          {t('newSession')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={
              statusTab === tab
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }
            }
          >
            {statusTabLabel(tab)}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={t('searchSessions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-default rounded-lg focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as any]: 'var(--primary)' }}
              />
            </div>
          </div>

          <Table
            columns={tableColumns}
            data={filteredSessions}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                title={t('noSessionsFound')}
                description={t('noData')}
              />
            }
          />
        </CardBody>
      </Card>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('newSession')}
        subtitle={t('sessionsSubtitle')}
        icon={<Plus size={20} />}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateSubmit} isLoading={createMutation.isPending}>{t('createSession')}</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">{t('course')} <span className="req">*</span></label>
            <select className="field-input" value={form.course_id} onChange={(e) => setField('course_id', e.target.value)}>
              <option value="">{t('selectCourse')}</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">{t('venue')} <span className="req">*</span></label>
            <input className="field-input" value={form.venue_name} onChange={(e) => setField('venue_name', e.target.value)} placeholder={t('venue')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">{t('startTime')} <span className="req">*</span></label>
              <input type="datetime-local" className="field-input" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} />
            </div>
            <div>
              <label className="field-label">{t('endTime')} <span className="req">*</span></label>
              <input type="datetime-local" className="field-input" value={form.end_time} onChange={(e) => setField('end_time', e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="field-label" style={{ marginBottom: 0 }}>{t('location')} <span className="req">*</span></label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleUseLocation} disabled={locating}>
                <MapPin size={14} /> {locating ? t('loading') : t('useCurrentLocation')}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
              <input className="field-input" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} placeholder={t('latitude')} inputMode="decimal" />
              <input className="field-input" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} placeholder={t('longitude')} inputMode="decimal" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">{t('category')}</label>
              <select className="field-input" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                <option value="REGULAR">{t('regular')}</option>
                <option value="MANDATORY">{t('mandatory')}</option>
                <option value="OPTIONAL">{t('optional')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('geofenceRadius')}</label>
              <input className="field-input" value={form.geofence_radius} onChange={(e) => setField('geofence_radius', e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="field-label">{t('gracePeriod')}</label>
              <input className="field-input" value={form.grace_period} onChange={(e) => setField('grace_period', e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={qrModalOpen}
        onClose={handleCloseQr}
        title={`${t('qrCodeFor')} ${selectedSessionTitle}`}
        size="md"
        footer={
          <Button variant="ghost" onClick={handleCloseQr}>{t('close')}</Button>
        }
      >
        <div className="flex flex-col items-center gap-4">
          {selectedQrData ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(selectedQrData)}`}
              alt={t('sessionQRCode')}
              className="w-72 h-72"
            />
          ) : (
            <p className="text-secondary">{t('loadingQR')}</p>
          )}
          <p className="text-sm text-secondary">{t('shareQRInstruction')}</p>
        </div>
      </Modal>
    </div>
  );
};

export default SessionsPage;
