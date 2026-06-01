import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { anomaliesApi } from '../../api/client';
import { Card, CardBody, ConfirmModal, EmptyState } from '../../components/ui';
import { useTranslation } from '../../context/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

const TYPES = [
  'All Types',
  'Attendance Drop',
  'Coordinator Abuse',
  'Repeated Face Failure',
  'Grace Period Gaming',
  'Geofence Spike',
];

export default function AnomaliesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'Open' | 'Resolved' | 'All'>('Open');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [courseFilter, setCourseFilter] = useState('');
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function fetchAnomalies() {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab === 'Open') params.status = 'open';
      if (activeTab === 'Resolved') params.status = 'resolved';
      if (typeFilter && typeFilter !== 'All Types') params.type = typeFilter;
      if (courseFilter) params.course_id = courseFilter;
      const res = await anomaliesApi.list(params);
      setAnomalies(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error(t('serverError'));
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnomalies();
    const id = window.setInterval(() => fetchAnomalies(), 30000);
    return () => window.clearInterval(id);
  }, [activeTab, typeFilter, courseFilter]);

  const counts = {
    open: anomalies.filter((a) => a.status === 'open').length,
    resolved: anomalies.filter((a) => a.status === 'resolved').length,
    all: anomalies.length,
  };

  function severityBorder(sev: string) {
    if (sev === 'high') return { borderLeft: '4px solid var(--danger)' };
    if (sev === 'medium') return { borderLeft: '4px solid var(--warning)' };
    return { borderLeft: '4px solid var(--border)' };
  }

  async function confirmResolve(id: string) {
    setConfirmId(id);
  }

  async function doResolve(id: string) {
    try {
      await anomaliesApi.resolve(id);
      setConfirmId(null);
      await fetchAnomalies();
      toast.success(t('success'));
    } catch (e) {
      console.error(e);
      toast.error(t('failedToResolveAnomaly'));
    }
  }

  const typeLabel = (type: string): string => {
    const map: Record<string, TranslationKey> = {
      'All Types': 'allTypes',
      'Attendance Drop': 'attendanceDrop',
      'Coordinator Abuse': 'coordinatorAbuse',
      'Repeated Face Failure': 'repeatedFaceFailure',
      'Grace Period Gaming': 'gracePeriodGaming',
      'Geofence Spike': 'geofenceSpike',
    };
    return map[type] ? t(map[type]) : type;
  };

  const tabLabel = (tab: 'Open' | 'Resolved' | 'All'): string => {
    const map: Record<'Open' | 'Resolved' | 'All', TranslationKey> = {
      Open: 'open',
      Resolved: 'resolved',
      All: 'all',
    };
    return t(map[tab]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('anomalyFlags')}</h1>
        <div className="inline-flex items-center bg-[var(--table-hover)] px-3 py-1 rounded text-secondary">{t('open')} <span className="ml-2 text-white px-2 py-0.5 rounded-full text-sm" style={{ background: 'var(--danger)' }}>{counts.open}</span></div>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="flex gap-3">
            {(['Open','Resolved','All'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1 rounded" style={activeTab === tab ? { background: 'var(--primary-light)', color: 'var(--primary)' } : { background: 'transparent', color: 'var(--text-secondary)' }}>
                {tabLabel(tab)} <span className="ml-2 text-sm bg-[var(--table-hover)] px-2 rounded">{tab === 'Open' ? counts.open : tab === 'Resolved' ? counts.resolved : counts.all}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-3 items-center">
            <select className="bg-input border border-default px-2 py-1 rounded" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPES.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
            </select>
            <input className="bg-input border border-default px-2 py-1 rounded" placeholder={t('courseId')} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} />
            <button className="px-3 py-1 text-white rounded" style={{ background: 'var(--primary)' }} onClick={fetchAnomalies}>{t('apply')}</button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div>{t('loadingAnomalies')}</div>
      ) : anomalies.length === 0 ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title={t('noOpenAnomalyFlags')}
          description={t('noData')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {anomalies.map((a) => (
            <Card key={a.id} style={severityBorder(a.severity || 'low')}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[var(--table-hover)] px-2 py-1 rounded text-secondary">{typeLabel(a.type)}</span>
                      <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{a.course_name || a.course}</span>
                    </div>
                    <div className="mt-2 text-primary">{a.description}</div>
                    {a.student_name && (
                      <div className="mt-2" style={{ color: 'var(--primary)' }}><a href={`#/students/${a.student_id}`}>{a.student_name}</a></div>
                    )}
                    <div className="mt-4 text-sm text-secondary">{t('detected')} {new Date(a.detected_at).toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {a.status === 'resolved' ? (
                      <div className="text-sm" style={{ color: 'var(--success)' }}>{t('resolvedBy')} {a.resolver_name} {t('on')} {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : ''}</div>
                    ) : (
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded text-secondary" style={{ border: '1px solid var(--border)' }}>{t('viewDetails')}</button>
                        <button className="px-3 py-1 text-white rounded" style={{ background: 'var(--primary)' }} onClick={() => confirmResolve(a.id)}>{t('markResolved')}</button>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        title={t('markAsResolved')}
        description={t('confirmResolveAnomaly')}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        onConfirm={() => confirmId && doResolve(confirmId)}
        onCancel={() => setConfirmId(null)}
        loading={false}
      />
    </div>
  );
}
