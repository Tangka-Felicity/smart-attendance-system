import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Button,
  Card,
  CardBody,
  Badge,
  Table,
  Modal,
  ProgressBar,
} from '../../components/ui';
import toast from 'react-hot-toast';
import { ArrowLeft, Bell, Play, XCircle, Download, Search, Plus } from 'lucide-react';
import { attendanceApi, sessionsApi, usersApi } from '../../api/client';
import { useTranslation } from '../../context/LanguageContext';

interface SessionDetail {
  id: string;
  course_name?: string;
  course?: { code?: string; name?: string };
  venue?: string;
  venue_name?: string;
  course_id?: string;
  start_time?: string;
  end_time?: string;
  status?: 'OPEN' | 'PENDING' | 'CLOSED';
  geofence_radius?: number;
  grace_period?: number;
  category?: string;
  total_students?: number;
}

interface AttendanceRecord {
  id: string;
  student_name?: string;
  student_number?: string;
  arrival_time?: string;
  departure_time?: string;
  time_present?: number;
  attendance_percent?: number;
  mark_out_of_10?: number;
  method?: 'AUTO' | 'MANUAL';
  manual_reason?: string;
}

const ATTENDANCE_TABS = ['All', 'Present', 'Absent', 'Manual'] as const;

type AttendanceTab = (typeof ATTENDANCE_TABS)[number];

const statusBadge = (status?: string) => {
  if (status === 'OPEN') {
    return <Badge variant="good">OPEN</Badge>;
  }
  if (status === 'PENDING') {
    return <Badge variant="neutral">PENDING</Badge>;
  }
  return <Badge variant="critical">CLOSED</Badge>;
};

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [qrImage, setQrImage] = useState('');
  const [refreshCountdown, setRefreshCountdown] = useState(25);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceTab>('All');
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [manualReason, setManualReason] = useState('Manual attendance update');
  const [manualPercent, setManualPercent] = useState('100');

  const sessionQuery = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await sessionsApi.get(id || '');
      const data = res.data || {};
      // Normalize backend fields: session_id -> id, venue_name -> venue_name
      const normalized: any = {
        ...data,
        id: data.id || data.session_id || data.sessionId,
        venue_name: data.venue_name || data.venue || undefined,
        course_id: data.course_id || data.courseId || undefined,
      };
      return normalized as SessionDetail;
    },
    enabled: !!id,
  });

  const session = sessionQuery.data;

  const courseQuery = useQuery({
    queryKey: ['course', session?.course_id],
    queryFn: async () => {
      if (!session?.course_id) return null;
      const res = await (await import('../../api/client')).coursesApi.get(session.course_id);
      return res.data;
    },
    enabled: !!session?.course_id && !session?.course_name,
  });

  const attendanceQuery = useQuery({
    queryKey: ['sessionAttendance', id],
    queryFn: async () => {
      const res = await sessionsApi.attendance(id || '');
      return res.data as AttendanceRecord[];
    },
    enabled: !!id,
  });

  const openMutation = useMutation({
    mutationFn: async () => sessionsApi.open(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['sessionAttendance', id] });
      toast.success(t('sessionOpenedSuccess'));
    },
    onError: (err: any) => toast.error(t('failedToOpenSession') + ': ' + String(err)),
  });

  const closeMutation = useMutation({
    mutationFn: async () => sessionsApi.close(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      toast.success(t('success'));
    },
    onError: (err: any) => toast.error(t('failedToOpenSession') + ': ' + String(err)),
  });

  const announceMutation = useMutation({
    mutationFn: async () => sessionsApi.announce(id || ''),
    onSuccess: () => {
      toast.success(t('announcementSent'));
    },
    onError: (err: any) => toast.error(t('failedToSendAnnouncement') + ': ' + String(err)),
  });

  const manualMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => attendanceApi.manual(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionAttendance', id] });
      setIsManualOpen(false);
      setSelectedStudent(null);
      setManualSearch('');
      setManualPercent('100');
      toast.success(t('markedSuccessfully'));
    },
    onError: (err: any) => toast.error(t('failedToMark') + ': ' + String(err)),
  });

  const studentSearchQuery = useQuery({
    queryKey: ['manualStudentSearch', manualSearch],
    queryFn: async () => {
      if (!manualSearch.trim()) return [];
      const res = await usersApi.list({ role: 'STUDENT', q: manualSearch.trim() });
      return res.data as any[];
    },
    enabled: manualSearch.trim().length > 0,
  });

  // prefer course_name from session, fall back to fetched course
  const courseName = session?.course_name || courseQuery.data?.name || session?.course?.name;
  const attendanceRecords = attendanceQuery.data || [];

  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'Present') {
      return attendanceRecords.filter((record) => record.arrival_time || (record.attendance_percent ?? 0) > 0);
    }
    if (attendanceFilter === 'Absent') {
      return attendanceRecords.filter((record) => !record.arrival_time && (record.attendance_percent ?? 0) === 0);
    }
    if (attendanceFilter === 'Manual') {
      return attendanceRecords.filter((record) => record.method === 'MANUAL');
    }
    return attendanceRecords;
  }, [attendanceFilter, attendanceRecords]);

  const totalPresented = attendanceRecords.filter((record) => record.arrival_time || (record.attendance_percent ?? 0) > 0).length;
  const totalExpected = session?.total_students ?? attendanceRecords.length;

  const refreshQr = async () => {
    if (!id || session?.status !== 'OPEN') return;
    try {
      const qrRes = await sessionsApi.getQR(id);
      const raw = qrRes.data?.qr_code || qrRes.data?.qr || qrRes.data || '';
      if (raw) {
        setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(raw)}`);
      }
    } catch (e) {
      console.error('Failed to refresh QR', e);
    }
  };

  useEffect(() => {
    if (session?.status === 'OPEN' && id) {
      refreshQr();
      setRefreshCountdown(25);
      const refreshInterval = window.setInterval(() => {
        refreshQr();
        setRefreshCountdown(25);
      }, 25000);
      return () => window.clearInterval(refreshInterval);
    }
  }, [id, session?.status]);

  useEffect(() => {
    if (session?.status !== 'OPEN') return;
    const countdownInterval = window.setInterval(() => {
      setRefreshCountdown((value) => (value > 0 ? value - 1 : 25));
    }, 1000);
    return () => window.clearInterval(countdownInterval);
  }, [session?.status]);

  useEffect(() => {
    if (studentSearchQuery.data) {
      setManualResults(studentSearchQuery.data);
    }
  }, [studentSearchQuery.data]);

  const exportAttendance = () => {
    const csvRows = [
      ['Student Name', 'Student Number', 'Arrival Time', 'Departure Time', 'Time Present', 'Attendance %', 'Mark / 10', 'Method', 'Manual Reason'],
      ...attendanceRecords.map((record) => [
        record.student_name || '',
        record.student_number || '',
        record.arrival_time || '',
        record.departure_time || '',
        record.time_present?.toString() || '',
        record.attendance_percent?.toString() || '',
        record.mark_out_of_10?.toString() || '',
        record.method || '',
        record.manual_reason || '',
      ]),
    ];

    const csvContent = csvRows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${id}-attendance.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const manualEntriesWarning = Number(manualPercent) < 60 ? 'Manual marks below 60% may require coordinator approval.' : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sessions')}
            className="p-2 rounded-lg transition"
            style={{ background: 'var(--bg-hover)' }}
          >
            <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Session Detail</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage live attendance, session status, and manual marks.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportAttendance}>
            <Download size={16} />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsManualOpen(true)}>
            <Plus size={16} />
            Manual Mark
          </Button>
          {session?.status === 'PENDING' && (
            <Button variant="outline" size="sm" onClick={() => announceMutation.mutate()}>
              <Bell size={16} />
              Announce
            </Button>
          )}
          {session?.status === 'PENDING' && (
            <Button size="sm" onClick={() => openMutation.mutate()}>
              <Play size={16} />
              Open Session
            </Button>
          )}
          {session?.status === 'OPEN' && (
            <Button variant="danger" size="sm" onClick={() => closeMutation.mutate()}>
              <XCircle size={16} />
              Close Session
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Course</p>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{courseName || 'Course not available'}</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{session?.course?.code || courseQuery.data?.code || ''}</p>
                  </div>
                  {statusBadge(session?.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Venue</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.venue_name || session?.venue || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Category</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.category || 'Regular'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Date</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.start_time ? format(new Date(session.start_time), 'PPP') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Time</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.start_time && session?.end_time ? `${format(new Date(session.start_time), 'p')} - ${format(new Date(session.end_time), 'p')}` : '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Geofence Radius</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.geofence_radius ?? 50} m</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Grace Period</p>
                    <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{session?.grace_period ?? 15} min</p>
                  </div>
                </div>
              </div>

              {session?.status === 'OPEN' && (
                <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Live QR Display</p>
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
                        LIVE
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Checked in</p>
                      <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{totalPresented} / {totalExpected}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {qrImage ? (
                      <img src={qrImage} alt="Session QR" className="h-72 w-72 rounded-xl" style={{ border: '1px solid var(--border)', background: '#ffffff' }} />
                    ) : (
                      <div className="flex h-72 w-72 items-center justify-center rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)' }}>QR loading...</div>
                    )}
                    <div className="w-full">
                      <ProgressBar percentage={(refreshCountdown / 25) * 100} label="Refreshes in" showLabel={true} />
                      <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Refreshes in {refreshCountdown}s</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Attendance Records</h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Filter and review every entry.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsManualOpen(true)}>
                  <Plus size={16} />
                  Manual Mark
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {ATTENDANCE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAttendanceFilter(tab)}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition"
                    style={
                      attendanceFilter === tab
                        ? { background: 'var(--primary)', color: '#ffffff' }
                        : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <Table
                columns={[
                  { key: 'student_name', label: 'Student Name' },
                  { key: 'student_number', label: 'Student Number' },
                  { key: 'arrival_time', label: 'Arrival Time' },
                  { key: 'departure_time', label: 'Departure Time' },
                  {
                    key: 'time_present',
                    label: 'Time Present',
                    render: (value: number) => (value != null ? `${value} mins` : '—'),
                  },
                  {
                    key: 'attendance_percent',
                    label: 'Attendance %',
                    render: (value: number) => `${value ?? 0}%`,
                  },
                  {
                    key: 'mark_out_of_10',
                    label: 'Mark / 10',
                    render: (value: number) => (value != null ? value : '—'),
                  },
                  {
                    key: 'method',
                    label: 'Method',
                    render: (value: string) => (
                      <Badge variant={value === 'MANUAL' ? 'warning' : 'primary'}>{value || 'AUTO'}</Badge>
                    ),
                  },
                  {
                    key: 'manual_reason',
                    label: 'Reason',
                    render: (value: string) => (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }} title={value || ''}>
                        {value ? 'View' : '—'}
                      </span>
                    ),
                  },
                ]}
                data={filteredAttendance.map((record) => ({
                  ...record,
                  student_name: record.student_name || '—',
                  student_number: record.student_number || '—',
                }))}
                isLoading={attendanceQuery.isLoading}
                emptyState={<p className="text-center" style={{ color: 'var(--text-muted)' }}>No attendance records found</p>}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        title="Manual Attendance Mark"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsManualOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedStudent) {
                  toast.error(t('selectStudent'));
                  return;
                }
                manualMutation.mutate({
                  session_id: id,
                  student_id: selectedStudent.id,
                  attendance_percent: Number(manualPercent),
                  reason: manualReason,
                  method: 'MANUAL',
                });
              }}
              isLoading={manualMutation.status === 'pending'}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Search Student</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Name or student number"
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            {manualResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {manualResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className="w-full text-left px-4 py-3"
                    style={selectedStudent?.id === student.id ? { background: 'var(--primary-light)' } : undefined}
                  >
                    <div className="font-medium" style={{ color: 'var(--text)' }}>{student.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{student.student_number}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="rounded-lg p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Selected student</p>
              <p className="font-medium" style={{ color: 'var(--text)' }}>{selectedStudent.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedStudent.student_number}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Reason</label>
            <textarea
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Attendance %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={manualPercent}
              onChange={(e) => setManualPercent(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {manualEntriesWarning && (
            <p className="text-sm" style={{ color: 'var(--warning)' }}>{manualEntriesWarning}</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SessionDetailPage;

