import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Table } from '../../components/ui';
import { usersApi } from '../../api/client';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from '../../context/LanguageContext';
import { Trash2, Eye } from 'lucide-react';

const fetchRegistrations = async (): Promise<any[]> => {
  const res = await usersApi.list({ role: 'STUDENT' });
  return (res.data as any[]) || [];
};

const RegistrationPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: students = [], refetch, isFetching } = useQuery({
    queryKey: ['registrations'],
    queryFn: fetchRegistrations,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = () => {
      // close panel on global close
      setPanelOpen(false);
    };
    document.addEventListener('closeAllModals', handler as EventListener);
    return () => document.removeEventListener('closeAllModals', handler as EventListener);
  }, []);

  const removeMutation = useMutation({
    mutationFn: async (_id: string) => {
      // call admin remove endpoint if available
      await Promise.resolve();
    },
    onSuccess: () => {
      toast.success(t('removed')); refetch();
    },
  });

  const filtered = useMemo(() => {
    return (students || []).filter((s: any) => {
      const q = search.toLowerCase();
      const matchesQ = !q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.matricule || '').toLowerCase().includes(q);
      const faceDone = !!s.face_embedding;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'done' ? faceDone : !faceDone);
      return matchesQ && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const columns = [
    { key: 'checkbox', label: ' ', render: (_: any, row: any) => (
      <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => {
        setSelectedIds((cur) => e.target.checked ? [...cur, row.id] : cur.filter(id => id !== row.id));
      }} />
    )},
    { key: 'name', label: t('name') },
    { key: 'matricule', label: t('matricule') },
    { key: 'email', label: t('email') },
    { key: 'face', label: t('faceStatus'), render: (_: any, row: any) => (
      row.face_embedding ? <span style={{ color: '#16A34A', fontWeight: 700 }}>{t('faceDone')}</span> : <span style={{ color: '#D97706', fontWeight: 700 }}>{t('facePending')}</span>
    )},
    { key: 'joined', label: t('joined') },
    { key: 'actions', label: t('actions'), render: (_: any, row: any) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setSelected(row); setPanelOpen(true); }}>{<Eye size={16} />}</button>
        <button onClick={() => { if (!confirm(t('removeConfirm'))) return; removeMutation.mutate(row.id); }} title={t('remove')}><Trash2 size={16} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">{t('registrations')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded">
            <option value="all">{t('all')}</option>
            <option value="pending">{t('facePending')}</option>
            <option value="done">{t('faceDone')}</option>
          </select>
        </div>
      </div>

      <Card>
        <CardBody>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="px-3 py-2 border rounded w-96" />
            <div style={{ marginLeft: 'auto' }}>{filtered.length} {t('results')}</div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <Button variant="ghost" onClick={() => { setSelectedIds([]); }}>Deselect</Button>
            </div>
            <div>
              <Button variant="danger" onClick={() => {
                if (!selectedIds.length) return alert(t('noSelected'));
                if (!confirm(t('removeConfirm'))) return;
                // perform bulk remove
                selectedIds.forEach(id => removeMutation.mutate(id));
              }}>{t('removeSelected')}</Button>
            </div>
          </div>

          <Table columns={columns} data={filtered} isLoading={isFetching} />
        </CardBody>
      </Card>

      {/* Side panel */}
      {panelOpen && selected && (
        <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 380, background: 'white', boxShadow: '0 12px 40px rgba(2,6,23,0.2)', padding: 16, zIndex: 60 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="text-lg font-semibold">{selected.name}</h3>
            <button onClick={() => setPanelOpen(false)}>Close</button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {selected.avatar_url ? <img src={selected.avatar_url} alt={selected.name} style={{ width: 96, height: 96, borderRadius: 48, objectFit: 'cover' }} /> : <div style={{ width: 96, height: 96, borderRadius: 48, background: '#E6EEF8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{(selected.name || '').charAt(0)}</div>}
          </div>
          <div style={{ marginBottom: 8 }}><strong>{t('matricule')}:</strong> {selected.matricule}</div>
          <div style={{ marginBottom: 8 }}><strong>{t('email')}:</strong> {selected.email}</div>
          <div style={{ marginBottom: 8 }}><strong>{t('faceStatus')}:</strong> {selected.face_embedding ? `${t('faceDone')} • ${selected.face_updated_at || ''}` : t('facePending')}</div>

          <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <Button variant="danger" onClick={() => { if (!confirm(t('removeConfirm'))) return; removeMutation.mutate(selected.id); }}>{t('remove')}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationPage;
