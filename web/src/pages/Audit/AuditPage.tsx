import React, { useEffect, useState } from 'react';
import { auditApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { useTranslation } from '../../context/LanguageContext';

export default function AuditPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await auditApi.list(filters);
      setLogs(res.data || []);
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(logs.length / perPage));
  const pageData = logs.slice((page - 1) * perPage, page * perPage);

  function toggleExpand(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function exportCSV() {
    // reuse analytics export endpoint if available, otherwise mirror API
    window.open('/v1/audit/export', '_blank');
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-primary">{t('auditLog')}</h1>
        <div className="text-sm px-3 py-1 rounded" style={{ color: 'var(--warning)', background: 'var(--warning-bg)' }}>{t('auditLogNotice')}</div>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-4 gap-3">
            <input placeholder={t('actor')} className="field-input" onChange={(e) => setFilters({ ...filters, actor: e.target.value })} />
            <select className="field-input" onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
              <option value="">{t('allActions')}</option>
              <option value="MANUAL_MARK">{t('manualMark')}</option>
              <option value="SESSION_OPEN">{t('sessionOpen')}</option>
              <option value="SESSION_CLOSE">{t('sessionClose')}</option>
              <option value="CREATE_USER">{t('createUser')}</option>
              <option value="UPDATE_USER">{t('updateUser')}</option>
              <option value="FACE_REGISTER">{t('faceRegister')}</option>
              <option value="FACE_DELETE">{t('faceDelete')}</option>
              <option value="EXPORT_CSV">{t('exportCsv')}</option>
            </select>
            <input type="date" className="field-input" onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <input type="date" className="field-input" onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            <div className="col-span-4 flex justify-end gap-2">
              <button className="btn btn-primary btn-sm" onClick={fetchLogs}>{t('applyFilters')}</button>
              <button className="btn btn-outline btn-sm" onClick={exportCSV}>{t('exportFullLogCsv')}</button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {loading ? (
            <div className="text-secondary">{t('loading')}</div>
          ) : (
            <div>
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead>
                  <tr className="text-secondary">
                    <th className="px-4 py-2 text-left">{t('timestamp')}</th>
                    <th className="px-4 py-2 text-left">{t('actor')}</th>
                    <th className="px-4 py-2 text-left">{t('role')}</th>
                    <th className="px-4 py-2 text-left">{t('action')}</th>
                    <th className="px-4 py-2 text-left">{t('entityType')}</th>
                    <th className="px-4 py-2 text-left">{t('entityId')}</th>
                    <th className="px-4 py-2 text-left">{t('details')}</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-[var(--border)]">
                  {pageData.map((r) => (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`${r.action === 'MANUAL_MARK' || r.action === 'SESSION_OPEN' || r.action === 'SESSION_CLOSE' ? 'border-l-4' : ''}`}
                        style={
                          r.action === 'MANUAL_MARK'
                            ? { borderLeftColor: 'var(--warning)' }
                            : r.action === 'SESSION_OPEN'
                            ? { borderLeftColor: 'var(--success)' }
                            : r.action === 'SESSION_CLOSE'
                            ? { borderLeftColor: 'var(--border)' }
                            : undefined
                        }
                        onClick={() => toggleExpand(r.id)}
                      >
                        <td className="px-4 py-2">{new Date(r.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-2">{r.actor_name}</td>
                        <td className="px-4 py-2"><span className="px-2 py-1 bg-[var(--table-hover)] rounded text-sm">{r.role}</span></td>
                        <td className="px-4 py-2 font-mono">{r.action}</td>
                        <td className="px-4 py-2">{r.entity_type}</td>
                        <td className="px-4 py-2">{r.entity_id?.toString().slice(0,8)} <button className="ml-2 px-1 py-0.5 border border-default rounded" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(r.entity_id?.toString() || ''); }}>{t('copy')}</button></td>
                        <td className="px-4 py-2">{r.summary || '-'}</td>
                      </tr>
                      {expanded[r.id] && (
                        <tr>
                          <td colSpan={7} className="px-4 py-2 bg-[var(--table-hover)]">
                            <pre className="whitespace-pre-wrap text-sm"><code>{JSON.stringify(r.details_json, null, 2)}</code></pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between mt-3">
                <div className="text-secondary">{t('page')} {page} {t('of')} {pageCount}</div>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn-outline btn-sm">{t('prev')}</button>
                  <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="btn btn-outline btn-sm">{t('next')}</button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
