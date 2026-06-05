import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardBody,
  Table,
  Modal,
  ProgressBar,
  Badge,
} from '../../components/ui';
import { Search, Plus, Eye, Edit2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, sessionsApi, usersApi } from '../../api/client';
import { useTranslation } from '../../context/LanguageContext';

interface Course {
  id: string;
  code: string;
  name: string;
  lecturer?: string;
  students_count?: number;
  sessions_count?: number;
  avg_attendance?: number; // 0-100
  semester?: string;
  academic_year?: string;
}

interface Student {
  id: string;
  student_number: string;
  name: string;
  email: string;
  face_registered?: boolean;
}

interface Coordinator {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 8;

const fetchCourses = async (params?: Record<string, string>) => {
  const res = await coursesApi.list(params);
  return res.data as Course[];
};

const fetchCourseStudents = async (courseId: string) => {
  const res = await coursesApi.students(courseId);
  return res.data as Student[];
};

const fetchSessionsForCourse = async (courseId: string) => {
  const res = await sessionsApi.list({ course_id: courseId });
  return res.data as unknown[];
};

const fetchStudentsSearch = async (q: string) => {
  const res = await usersApi.list({ role: 'STUDENT', q });
  return res.data as Student[];
};

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [semester, setSemester] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isManagePanelOpen, setIsManagePanelOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState<'overview' | 'sessions' | 'students'>('overview');

  // New Course form
  const [newCourseForm, setNewCourseForm] = useState({
    name: '',
    code: '',
    semester: 'Semester 1',
    academic_year: '2025/2026',
    lecturer: '',
  });

  // New Session form
  const [newSessionForm, setNewSessionForm] = useState({
    start_time: '',
    end_time: '',
    venue: '',
    latitude: '',
    longitude: '',
    geofence_radius: '50',
    grace_period: '15',
    category: 'regular',
    coordinator_id: '',
  });

  // Student search for enrolment
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);

  // Queries
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', semester],
    queryFn: () => fetchCourses(semester === 'All' ? {} : { semester }),
  });

  const courseStudentsQuery = useQuery({
    queryKey: ['courseStudents', selectedCourse?.id],
    queryFn: () => (selectedCourse ? fetchCourseStudents(selectedCourse.id) : []),
    enabled: !!selectedCourse,
  });

  const sessionsQuery = useQuery({
    queryKey: ['courseSessions', expandedCourseId],
    queryFn: () => (expandedCourseId ? fetchSessionsForCourse(expandedCourseId) : []),
    enabled: !!expandedCourseId,
  });

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => coursesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setIsNewCourseOpen(false);
      toast.success(t('courseCreatedSuccess'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t('failedToCreateCourse') + message);
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => sessionsApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseSessions'] });
      setIsNewSessionOpen(false);
      toast.success(t('sessionCreatedSuccess'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t('failedToCreateSession') + message);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: ({ courseId, studentIds }: { courseId: string; studentIds: string[] }) => coursesApi.enroll(courseId, studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(t('studentsEnrolled'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t('failedToEnroll') + message);
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) => coursesApi.unenroll(courseId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(t('studentRemoved'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t('failedToRemoveStudent') + message);
    },
  });

  // Coordinator list
  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ['coordinators'],
    queryFn: async () => {
      const res = await usersApi.list({ role: 'COORDINATOR' });
      return res.data as Coordinator[];
    },
  });

  // Student search effect
  useEffect(() => {
    let mounted = true;
    const doSearch = async () => {
      if (!studentSearch) {
        setStudentResults([]);
        return;
      }
      try {
        const res = await fetchStudentsSearch(studentSearch);
        if (mounted) setStudentResults(res);
      } catch  {
        // ignore
      }
    };
    const timer = setTimeout(doSearch, 400);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [studentSearch]);

  // Filters and pagination
  const filtered = useMemo(() => {
    return courses.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Table columns
  const columns = [
    { key: 'code', label: t('code') },
    { key: 'name', label: t('courseName') },
    { key: 'lecturer', label: t('lecturer') },
    { key: 'students_count', label: t('students') },
    { key: 'sessions_count', label: t('sessions') },
    {
      key: 'avg_attendance',
      label: t('averageAttendance'),
      render: (value: number) => (
        <div className="w-48">
          <ProgressBar percentage={value ?? 0} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_value: unknown, course: Course) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setExpandedCourseId(expandedCourseId === course.id ? null : course.id);
            }}
            title={t('view')}
            className="p-1 hover:bg-[var(--table-hover)] rounded"
          >
            <Eye size={16} className="text-primary" />
          </button>
          <button
            onClick={() => {
              setSelectedCourse(course);
              setIsNewSessionOpen(false);
              setIsManagePanelOpen(true);
            }}
            title={t('manageStudents')}
            className="p-1 hover:bg-[var(--table-hover)] rounded"
          >
            <Users size={16} className="text-secondary" />
          </button>
          <button
            onClick={() => {
              setSelectedCourse(course);
              setIsNewCourseOpen(true);
              setNewCourseForm({
                name: course.name,
                code: course.code,
                semester: course.semester || 'Semester 1',
                academic_year: course.academic_year || '2025/2026',
                lecturer: course.lecturer || '',
              });
            }}
            title={t('edit')}
            className="p-1 hover:bg-[var(--table-hover)] rounded"
          >
            <Edit2 size={16} className="text-primary" />
          </button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleSaveCourse = () => {
    if (!newCourseForm.name || !newCourseForm.code) {
      toast.error(t('fillCourseNameCode'));
      return;
    }

    const payload = {
      name: newCourseForm.name,
      code: newCourseForm.code,
      semester: newCourseForm.semester,
      academic_year: newCourseForm.academic_year,
      lecturer_id: newCourseForm.lecturer, // Backend expects lecturer_id
    };

    if (selectedCourse) {
      updateCourseMutation.mutate({ id: selectedCourse.id, ...payload });
    } else {
      createCourseMutation.mutate(payload);
    }
  };

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => coursesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setIsNewCourseOpen(false);
      setSelectedCourse(null);
      toast.success(t('courseUpdatedSuccess'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t('failedToUpdateCourse') + message);
    },
  });

  const handleEnroll = (studentId: string) => {
    if (!selectedCourse) return;
    enrollMutation.mutate({ courseId: selectedCourse.id, studentIds: [studentId] });
  };

  const handleUnenroll = (studentId: string) => {
    if (!selectedCourse) return;
    if (!confirm(t('removeStudentConfirm'))) return;
    unenrollMutation.mutate({ courseId: selectedCourse.id, studentId });
  };

  const handleCreateSession = () => {
    if (!expandedCourseId) {
      toast.error(t('noCourseSelected'));
      return;
    }
    // Basic validation
    if (!newSessionForm.start_time || !newSessionForm.end_time || !newSessionForm.venue) {
      toast.error(t('fillSessionFields'));
      return;
    }
    createSessionMutation.mutate({
      course_id: expandedCourseId,
      start_time: newSessionForm.start_time,
      end_time: newSessionForm.end_time,
      venue_name: newSessionForm.venue,
      latitude: Number(newSessionForm.latitude) || 0,
      longitude: Number(newSessionForm.longitude) || 0,
      geofence_radius: Number(newSessionForm.geofence_radius || 50),
      grace_period: Number(newSessionForm.grace_period || 15),
      category: newSessionForm.category,
      coordinator_id: newSessionForm.coordinator_id || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">{t('courses')}</h1>
        <Button onClick={() => { setIsNewCourseOpen(true); setSelectedCourse(null); }}>
          <Plus size={16} />
          {t('newCourse')}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('semester')}</label>
              <select
                value={semester}
                onChange={(e) => { setSemester(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">{t('all')}</option>
                <option value="Semester 1">{t('semester1')}</option>
                <option value="Semester 2">{t('semester2')}</option>
                <option value="Semester 3">{`${t('semester')} 3`}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-2">{t('search')}</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={t('searchCoursePlaceholder')}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card shadow>
        <CardBody>
          <Table
            columns={columns}
            data={paginated}
            isLoading={isLoading}
            emptyState={<p className="text-center text-secondary">{t('noCoursesFound')}</p>}
          />

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-secondary">
                {t('showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1} {t('to')} {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} {t('of')} {filtered.length} {t('courses').toLowerCase()}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>{t('previous')}</Button>
                <div className="flex items-center gap-2 px-4 py-2"><span className="text-sm text-secondary">{t('page')} {currentPage} {t('of')} {totalPages}</span></div>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>{t('next')}</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Expanded course panel with tabs */}
      {expandedCourseId && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('courseDetails')}</h2>
              <div className="flex gap-2">
                <Button onClick={() => setIsNewSessionOpen(true)}>{t('newSession')}</Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex gap-4">
                <button onClick={() => setCourseTab('overview')} className={`px-4 py-2 rounded ${courseTab === 'overview' ? 'bg-primary text-white' : 'bg-transparent text-secondary'}`}>{t('overview')}</button>
                <button onClick={() => setCourseTab('sessions')} className={`px-4 py-2 rounded ${courseTab === 'sessions' ? 'bg-primary text-white' : 'bg-transparent text-secondary'}`}>{t('sessions')}</button>
                <button onClick={() => setCourseTab('students')} className={`px-4 py-2 rounded ${courseTab === 'students' ? 'bg-primary text-white' : 'bg-transparent text-secondary'}`}>{t('students')}</button>
              </div>
            </div>

            {courseTab === 'overview' && (
              <div>
                <h3 className="font-semibold">{selectedCourse?.name}</h3>
                <p className="text-sm text-secondary">{selectedCourse?.semester} • {selectedCourse?.academic_year}</p>
              </div>
            )}

            {courseTab === 'sessions' && (
              <Table
                columns={[
                  { key: 'start_time', label: t('start') },
                  { key: 'end_time', label: t('end') },
                  { key: 'venue', label: t('venue') },
                  { key: 'status', label: t('status'), render: (v: string) => <Badge variant={v === 'OPEN' ? 'good' : 'neutral'}>{v}</Badge> },
                  { key: 'attendance_pct', label: t('attendancePercent'), render: (v: number) => <ProgressBar percentage={v ?? 0} /> },
                  { key: 'actions', label: t('actions'), render: () => (<div className="text-sm text-secondary">—</div>) },
                ]}
                data={sessionsQuery.data || []}
                isLoading={sessionsQuery.isLoading}
                emptyState={<p className="text-center text-secondary">{t('noSessions')}</p>}
              />
            )}

            {courseTab === 'students' && (
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <div style={{ flex: 1 }}>
                    <input placeholder={t('searchStudentsPlaceholder')} value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full px-4 py-2 border rounded" />
                  </div>
                </div>

                <Table
                  columns={[
                    { key: 'name', label: t('name') },
                    { key: 'student_number', label: t('matricule') },
                    { key: 'attendance_pct', label: t('attendancePercent'), render: (v: number) => <ProgressBar percentage={v ?? 0} /> },
                    { key: 'mark', label: t('mark'), render: (v: number) => <span>{v ?? '—'}</span> },
                    { key: 'actions', label: t('actions'), render: (_: any, s: Student) => (<div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleUnenroll(s.id)}>{t('remove')}</Button></div>) },
                  ]}
                  data={courseStudentsQuery.data || []}
                  isLoading={courseStudentsQuery.isLoading}
                  emptyState={<p className="text-center text-secondary">{t('noStudents')}</p>}
                />
              </div>
            )}

          </CardBody>
        </Card>
      )}

      {/* New Course Modal */}
      <Modal
        isOpen={isNewCourseOpen}
        onClose={() => { setIsNewCourseOpen(false); setSelectedCourse(null); }}
        title={selectedCourse ? t('editCourse') : t('newCourse')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsNewCourseOpen(false); setSelectedCourse(null); }}>{t('cancel')}</Button>
            <Button onClick={handleSaveCourse} isLoading={createCourseMutation.status === 'pending' || updateCourseMutation.status === 'pending'}>{selectedCourse ? t('save') : t('create')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('courseName')}</label>
            <input value={newCourseForm.name} onChange={(e) => setNewCourseForm({ ...newCourseForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('courseCode')}</label>
            <input value={newCourseForm.code} onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('semester')}</label>
              <select value={newCourseForm.semester} onChange={(e) => setNewCourseForm({ ...newCourseForm, semester: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="Semester 1">{t('semester1')}</option>
                <option value="Semester 2">{t('semester2')}</option>
                <option value="Semester 3">{`${t('semester')} 3`}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('academicYear')}</label>
              <input value={newCourseForm.academic_year} onChange={(e) => setNewCourseForm({ ...newCourseForm, academic_year: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>
      </Modal>

      {/* New Session Modal */}
      <Modal
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        title={t('newSession')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsNewSessionOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateSession} isLoading={createSessionMutation.status === 'pending'}>{t('createSession')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('startTime')}</label>
            <input type="datetime-local" value={newSessionForm.start_time} onChange={(e) => setNewSessionForm({ ...newSessionForm, start_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('endTime')}</label>
            <input type="datetime-local" value={newSessionForm.end_time} onChange={(e) => setNewSessionForm({ ...newSessionForm, end_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('venueName')}</label>
            <input value={newSessionForm.venue} onChange={(e) => setNewSessionForm({ ...newSessionForm, venue: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input placeholder={t('latitude')} value={newSessionForm.latitude} onChange={(e) => setNewSessionForm({ ...newSessionForm, latitude: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <input placeholder={t('longitude')} value={newSessionForm.longitude} onChange={(e) => setNewSessionForm({ ...newSessionForm, longitude: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <input placeholder={t('radiusM')} value={newSessionForm.geofence_radius} onChange={(e) => setNewSessionForm({ ...newSessionForm, geofence_radius: e.target.value })} className="px-3 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder={t('graceMin')} value={newSessionForm.grace_period} onChange={(e) => setNewSessionForm({ ...newSessionForm, grace_period: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <select value={newSessionForm.category} onChange={(e) => setNewSessionForm({ ...newSessionForm, category: e.target.value })} className="px-3 py-2 border rounded-lg">
              <option value="mandatory">{t('mandatory')}</option>
              <option value="regular">{t('regular')}</option>
              <option value="optional">{t('optional')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('coordinatorOptional')}</label>
            <select value={newSessionForm.coordinator_id} onChange={(e) => setNewSessionForm({ ...newSessionForm, coordinator_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
              <option value="">{t('none')}</option>
              {coordinators.map((c: Coordinator) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Manage Students Side Panel */}
      {isManagePanelOpen && selectedCourse && (
        <div className="fixed right-0 top-0 h-full w-96 bg-card shadow-xl z-50 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('manageStudents')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">{t('enrolled')}: {courseStudentsQuery.data?.length ?? 0}</span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-medium">{selectedCourse.name} ({selectedCourse.code})</h3>
            <p className="text-sm text-secondary">{selectedCourse.semester} • {selectedCourse.academic_year}</p>
          </div>

          <div className="space-y-3 mb-6">
            {(courseStudentsQuery.data || []).map((s: Student) => (
              <div key={s.id} className="flex items-center justify-between p-2 border border-default rounded">
                <div>
                  <div className="text-sm font-medium">{s.student_number} — {s.name}</div>
                  <div className="text-xs text-secondary">{s.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-green-600">{s.face_registered ? '✓' : '✕'}</div>
                  <Button variant="ghost" size="sm" onClick={() => handleUnenroll(s.id)}>{t('remove')}</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">{t('addStudents')}</h4>
            <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder={t('searchStudentsPlaceholder')} className="w-full pl-10 pr-3 py-2 bg-input border border-default rounded" />
              {studentResults.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 border border-default rounded">
                  <div>
                    <div className="text-sm font-medium">{s.student_number} — {s.name}</div>
                    <div className="text-xs text-secondary">{s.email}</div>
                  </div>
                  <Button size="sm" onClick={() => handleEnroll(s.id)}>{t('enroll')}</Button>
                </div>
              ))}
              {!studentResults.length && studentSearch && <div className="text-sm text-secondary">{t('noStudentsFound')}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
