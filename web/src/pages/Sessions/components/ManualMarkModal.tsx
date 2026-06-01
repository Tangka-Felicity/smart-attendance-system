import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi, attendanceApi } from '../../../api/client';
import { useTranslation } from '../../../context/LanguageContext';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualMarkModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [percent, setPercent] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!query) return setResults([]);
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.list({ q: query, limit: 5 });
        setResults(res.data || []);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function submit() {
    if (!selected) {
      toast.error(t('selectStudent'));
      return;
    }
    if (reason.length < 5) {
      toast.error(t('reasonTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await attendanceApi.manual({ student_id: selected.id, reason, attendance_percent: percent });
      onSuccess?.();
      onClose();
      toast.success(t('markedSuccessfully'));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || t('failedToMark'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--overlay)' }}>
      <div className="p-6 w-96" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Manual Mark</h3>

        <div className="mb-2">
          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Search student</label>
          <input className="w-full px-2 py-1 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or number" />
          {results.length > 0 && (
            <div className="mt-1 max-h-40 overflow-auto rounded" style={{ border: '1px solid var(--border)' }}>
              {results.map((r) => (
                <div key={r.id} className="px-2 py-1 cursor-pointer" style={{ color: 'var(--text)' }} onClick={() => { setSelected(r); setResults([]); setQuery(''); }}>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.student_number}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mb-2 p-2 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
            <div className="font-medium" style={{ color: 'var(--text)' }}>{selected.name}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{selected.student_number}</div>
          </div>
        )}

        <div className="mb-2">
          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Reason</label>
          <textarea className="w-full px-2 py-1 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>Attendance %</label>
          <input type="number" className="w-full px-2 py-1 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} value={percent} onChange={(e) => setPercent(Number(e.target.value))} min={0} max={100} />
        </div>


        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--text)' }} onClick={onClose}>Cancel</button>
          <button className="px-3 py-1 rounded" style={{ background: 'var(--primary)', color: '#ffffff' }} onClick={submit} disabled={submitting}>{submitting ? 'Saving...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
};

export default ManualMarkModal;
