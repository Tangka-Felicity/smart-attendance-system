import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { analyticsApi, coursesApi } from '../../api/client';
import { Card, CardBody, EmptyState, SkeletonCard } from '../../components/ui';
import { useTranslation } from '../../context/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

type ReportFilters = {
  course_id?: string;
  start?: string;
  end?: string;
  semester?: string;
  [key: string]: string | undefined;
};

type ReportSummary = {
  average_attendance?: number;
  total_sessions?: number;
  at_risk?: number;
  manual_entries?: number;
  good?: number;
  warning?: number;
  critical?: number;
};

type StudentRecord = {
  id?: string;
  student_name?: string;
  student_number?: string;
  sessions_attended?: number;
  average_percent?: number;
  mark?: string;
  status?: 'Good' | 'Warning' | 'At Risk' | 'Critical' | string;
  trend?: 'up' | 'down' | 'flat' | string;
  manual?: boolean;
};

type Course = {
  id: string;
  name: string;
};

type SortKey = 'student_name' | 'student_number' | 'sessions_attended' | 'mark';

const REPORT_TABS: Array<'Weekly' | 'Monthly' | 'Semester' | 'Annual' | 'Custom'> = ['Weekly', 'Monthly', 'Semester', 'Annual', 'Custom'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'Weekly' | 'Monthly' | 'Semester' | 'Annual' | 'Custom'>('Weekly');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [activeTab, filters]);

  async function fetchCourses() {
    try {
      const res = await coursesApi.list();
      setCourses(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error(t('serverError'));
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = { type: activeTab.toLowerCase(), ...filters };
      const res = await analyticsApi.reports(params);
      setSummary(res.data?.summary || null);
      setStudents(res.data?.students || []);
    } catch (e) {
      console.error(e);
      toast.error(t('serverError'));
      setSummary(null);
      setStudents([]);
    } finally {
      setLoading(false);
      setPage(1);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    let list = students.slice();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => (s.student_name || '').toLowerCase().includes(q));
    }
    if (sortBy) {
      list.sort((a: StudentRecord, b: StudentRecord) => {
        const va = a[sortBy];
        const vb = b[sortBy];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (va === vb) return 0;
        if (typeof va === 'string' && typeof vb === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortDir === 'asc' ? (Number(va) - Number(vb)) : (Number(vb) - Number(va));
      });
    }
    return list;
  }, [students, search, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  function exportCSV() {
    exportData('csv');
  }

  async function exportData(format: 'csv' | 'xlsx') {
    try {
      const params = { type: activeTab.toLowerCase(), ...filters, format };
      const res = await analyticsApi.export(params);
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error(t('exportFailed'));
    }
  }

  const tabLabel = (tab: typeof REPORT_TABS[number]): string => {
    const map: Record<typeof REPORT_TABS[number], TranslationKey> = {
      Weekly: 'weekly',
      Monthly: 'monthly',
      Semester: 'semester',
      Annual: 'annual',
      Custom: 'custom',
    };
    return t(map[tab]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('attendanceReports')}</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border-default text-secondary" style={{ border: '1px solid var(--border)' }} onClick={exportCSV}>{t('exportCsv')}</button>
          <button className="px-3 py-1 text-white rounded" style={{ background: 'var(--primary)' }} onClick={() => exportData('xlsx')}>{t('exportExcel')}</button>
        </div>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="flex gap-4">
            {REPORT_TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1 rounded" style={activeTab === tab ? { background: 'var(--primary-light)', color: 'var(--primary)' } : { background: 'transparent', color: 'var(--text-secondary)' }}>
                {tabLabel(tab)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Filters area - simplified for common controls */}
            <div className="col-span-1">
              {(activeTab === 'Semester' || activeTab === 'Annual') && (
                <div className="mb-2">
                  <label className="block text-sm text-secondary">{t('course')}</label>
                  <select className="w-full bg-input border border-default px-2 py-1 rounded focus:outline-none focus:ring-2" value={filters.course_id || ''} onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}>
                    <option value="">{t('select')}</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {(activeTab === 'Custom' || activeTab === 'Monthly') && (
                <div className="mb-2">
                  <label className="block text-sm text-secondary">{t('startDate')}</label>
                  <input type="date" className="w-full bg-input border border-default px-2 py-1 rounded focus:outline-none focus:ring-2" onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
                </div>
              )}
              {(activeTab === 'Custom' || activeTab === 'Monthly') && (
                <div className="mb-2">
                  <label className="block text-sm text-secondary">{t('endDate')}</label>
                  <input type="date" className="w-full bg-input border border-default px-2 py-1 rounded focus:outline-none focus:ring-2" onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
                </div>
              )}
              {activeTab === 'Semester' && (
                <div className="mb-2">
                  <label className="block text-sm text-secondary">{t('semester')}</label>
                  <select className="w-full bg-input border border-default px-2 py-1 rounded focus:outline-none focus:ring-2" onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
                    <option value="">{t('select')}</option>
                    <option value="1">{t('semester1')}</option>
                    <option value="2">{t('semester2')}</option>
                  </select>
                </div>
              )}
              <div className="mt-2">
                <button className="px-3 py-1 text-white rounded" style={{ background: 'var(--primary)' }} onClick={fetchReport}>{t('apply')}</button>
              </div>
            </div>

            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <input placeholder={t('searchStudent')} className="flex-1 bg-input border border-default px-2 py-1 rounded focus:outline-none focus:ring-2" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-4">
                <div className="col-span-3">
                  <Card>
                    <CardBody>
                      <div className="text-sm text-secondary">{t('averageAttendance')}</div>
                      <div className="text-2xl font-semibold">{summary?.average_attendance ?? '-' }%</div>
                    </CardBody>
                  </Card>
                </div>
                <div className="col-span-2">
                  <Card>
                    <CardBody>
                      <div className="text-sm text-secondary">{t('totalSessions')}</div>
                      <div className="text-xl font-semibold">{summary?.total_sessions ?? '-'}</div>
                    </CardBody>
                  </Card>
                </div>
                <div className="col-span-2">
                  <Card>
                    <CardBody>
                      <div className="text-sm text-secondary">{t('atRiskStudents')}</div>
                      <div className="text-xl font-semibold" style={{ color: 'var(--at-risk)' }}>{summary?.at_risk ?? 0}</div>
                    </CardBody>
                  </Card>
                </div>
                <div className="col-span-3">
                  <Card>
                    <CardBody>
                      <div className="text-sm text-secondary">{t('manualEntries')}</div>
                      <div className="text-xl font-semibold" style={{ color: 'var(--warning)' }}>{summary?.manual_entries ?? 0}</div>
                    </CardBody>
                  </Card>
                </div>
              </div>

              <div className="mt-4">
                <Card>
                  <CardBody>
                    <div className="space-y-3">
                      {(['good','warning','at_risk','critical'] as const).map((k) => {
                        type ProgressKey = 'good' | 'warning' | 'at_risk' | 'critical';
                        const progressMapping: Record<ProgressKey, { label: string; color: string; count: number }> = {
                          good: { label: t('goodRange'), color: 'var(--success)', count: summary?.good || 0 },
                          warning: { label: t('warningRange'), color: 'var(--warning)', count: summary?.warning || 0 },
                          at_risk: { label: t('atRiskRange'), color: 'var(--at-risk)', count: summary?.at_risk || 0 },
                          critical: { label: t('criticalRange'), color: 'var(--danger)', count: summary?.critical || 0 },
                        };
                        const item = progressMapping[k];
                        const total = (summary?.good || 0) + (summary?.warning || 0) + (summary?.at_risk || 0) + (summary?.critical || 0) || 1;
                        const pct = Math.round((item.count / total) * 100);
                        return (
                          <div key={k} className="flex items-center gap-3">
                            <div className="w-40 text-sm">{item.label}</div>
                            <div className="flex-1 bg-[var(--table-hover)] h-4 rounded overflow-hidden">
                              <div className="h-4" style={{ width: `${pct}%`, background: item.color }} />
                            </div>
                            <div className="w-12 text-right">{item.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>
              </div>

              <div className="mt-4">
                <Card>
                  <CardBody>
                    {loading ? (
                      <SkeletonCard count={4} />
                    ) : students.length === 0 ? (
                      <EmptyState
                        title={t('noDataSelectedFilters')}
                        description={t('noData')}
                      />
                    ) : (
                      <div>
                        <table className="min-w-full divide-y divide-[var(--border)]">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left cursor-pointer bg-table-header" onClick={() => toggleSort('student_name')}>{t('studentName')}</th>
                              <th className="px-4 py-2 text-left cursor-pointer bg-table-header" onClick={() => toggleSort('student_number')}>{t('studentNumber')}</th>
                              <th className="px-4 py-2 text-left cursor-pointer bg-table-header" onClick={() => toggleSort('sessions_attended')}>{t('sessionsAttended')}</th>
                              <th className="px-4 py-2 text-left bg-table-header">{t('averagePercent')}</th>
                              <th className="px-4 py-2 text-left bg-table-header" onClick={() => toggleSort('mark')}>{t('markOutOf10')}</th>
                              <th className="px-4 py-2 text-left bg-table-header">{t('status')}</th>
                              <th className="px-4 py-2 text-left bg-table-header">{t('trend')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-[var(--border)]">
                            {pageData.map((s, idx) => (
                              <tr key={s.id || idx} className={s.manual ? 'border-l-4' : ''} style={s.manual ? { borderColor: 'var(--warning)' } : undefined}>
                                <td className="px-4 py-2">{s.student_name}</td>
                                <td className="px-4 py-2">{s.student_number}</td>
                                <td className="px-4 py-2">{s.sessions_attended}</td>
                                <td className="px-4 py-2 w-40">
                                  <div className="w-full bg-[var(--table-hover)] h-3 rounded">
                                    <div className="h-3 rounded" style={{ width: `${s.average_percent || 0}%`, background: 'var(--primary)' }} />
                                  </div>
                                  <div className="text-sm text-secondary">{s.average_percent ?? '-'}%</div>
                                </td>
                                <td className="px-4 py-2">{s.mark ?? '-'}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-1 rounded text-sm" style={s.status === 'Good' ? { background: 'var(--success-bg)', color: 'var(--success)' } : s.status === 'Warning' ? { background: 'var(--warning-bg)', color: 'var(--warning)' } : s.status === 'At Risk' ? { background: 'var(--at-risk-light)', color: 'var(--at-risk)' } : { background: 'var(--danger-bg)', color: 'var(--danger)' }}>{s.status}</span>
                                </td>
                                <td className="px-4 py-2">
                                  {s.trend === 'up' ? <span style={{ color: 'var(--success)' }}>↑</span> : s.trend === 'down' ? <span style={{ color: 'var(--danger)' }}>↓</span> : '-' }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex items-center justify-between mt-3">
                          <div>{t('page')} {page} {t('of')} {pageCount}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded text-secondary" style={{ border: '1px solid var(--border)' }}>{t('prev')}</button>
                            <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-2 py-1 rounded text-secondary" style={{ border: '1px solid var(--border)' }}>{t('next')}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
