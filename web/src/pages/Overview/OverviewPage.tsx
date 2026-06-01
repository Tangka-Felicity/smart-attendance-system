import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BookOpen, CalendarCheck, AlertTriangle, ShieldAlert, Clock, Play, Eye, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { Card, CardHeader, CardBody, Badge, StatCard } from '../../components/ui';

interface Session {
  id: string;
  course_name: string;
  start_time: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
}

interface AtRiskStudent {
  id: string;
  name: string;
  course: string;
  attendance: number;
}

interface Analytics {
  active_courses: number;
  sessions_today: number;
  at_risk_students: number;
  open_anomalies: number;
}

const fetchAnalytics = async (): Promise<Analytics> => ({
  active_courses: 12,
  sessions_today: 8,
  at_risk_students: 7,
  open_anomalies: 3,
});

const fetchTodaysSessions = async (): Promise<Session[]> => [
  { id: '1', course_name: 'Advanced Mathematics', start_time: '09:00 AM', status: 'OPEN' },
  { id: '2', course_name: 'Physics 101', start_time: '10:30 AM', status: 'PENDING' },
  { id: '3', course_name: 'Chemistry Lab', start_time: '01:00 PM', status: 'OPEN' },
  { id: '4', course_name: 'Biology Basics', start_time: '03:00 PM', status: 'CLOSED' },
];

const fetchAtRiskStudents = async (): Promise<AtRiskStudent[]> => [
  { id: '1', name: 'John Doe', course: 'Physics 101', attendance: 45 },
  { id: '2', name: 'Jane Smith', course: 'Chemistry Lab', attendance: 52 },
  { id: '3', name: 'Bob Johnson', course: 'Advanced Math', attendance: 35 },
];

const statusDotColor: Record<Session['status'], string> = {
  OPEN: 'var(--success)',
  PENDING: 'var(--warning)',
  CLOSED: 'var(--text-muted)',
};

const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const OverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics, refetchInterval: 60000 });
  const { data: sessions, isLoading: sessionsLoading } = useQuery({ queryKey: ['sessions-today'], queryFn: fetchTodaysSessions, refetchInterval: 60000 });
  const { data: atRiskStudents, isLoading: atRiskLoading } = useQuery({ queryKey: ['at-risk-students'], queryFn: fetchAtRiskStudents, refetchInterval: 60000 });

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const firstName = user?.name?.split(' ')[0] || '';

  const trendData = useMemo(() => {
    const days = 30;
    const today = new Date();
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const base = 78 + Math.sin(i / 3) * 8 + (i % 5 === 0 ? -6 : 0);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(Math.max(55, Math.min(98, base))),
      };
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1A56DB 0%, #1E40AF 50%, #312E81 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {dateString} • {t('springSemester2024')}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/sessions')}
              style={{ background: '#fff', color: '#1A56DB', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Play size={15} /> {t('newSession')}
            </button>
            <button
              onClick={() => navigate('/reports')}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <FileText size={15} /> {t('viewReports')}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {currentTime.toLocaleTimeString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{t('currentTime')}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="responsive-stat-grid">
        <StatCard value={analytics?.active_courses ?? 0} label={t('activeCourses')} icon={<BookOpen size={18} />} status="primary" />
        <StatCard value={analytics?.sessions_today ?? 0} label={t('sessionsToday')} icon={<CalendarCheck size={18} />} status="good" />
        <StatCard value={analytics?.at_risk_students ?? 0} label={t('atRiskStudents')} icon={<AlertTriangle size={18} />} status="warning" trend={{ value: 2, isPositive: false }} trendLabel={t('fromLastMonth')} />
        <StatCard value={analytics?.open_anomalies ?? 0} label={t('openAnomalies')} icon={<ShieldAlert size={18} />} status="critical" trend={{ value: 1, isPositive: false }} trendLabel={t('fromLastMonth')} />
      </div>

      {/* Content grid */}
      <div className="overview-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Today's sessions */}
          <Card>
            <CardHeader action={<a href="/sessions" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>{t('viewAll')}</a>}>
              {t('todaysSessions')}
            </CardHeader>
            <CardBody style={{ padding: '8px 24px' }}>
              {sessionsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
                </div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session, idx) => (
                  <div
                    key={session.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 0',
                      borderBottom: idx === sessions.length - 1 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusDotColor[session.status], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{session.course_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Clock size={13} /> {session.start_time}
                      </div>
                    </div>
                    <Badge dot variant={session.status === 'OPEN' ? 'good' : session.status === 'PENDING' ? 'warning' : 'neutral'}>
                      {t(session.status.toLowerCase() as 'open' | 'pending' | 'closed')}
                    </Badge>
                    {session.status === 'PENDING' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/sessions')}>
                        <Play size={13} /> {t('open')}
                      </button>
                    ) : session.status === 'OPEN' ? (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/sessions')}>
                        <Eye size={13} /> {t('view')}
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>
                        {t('results')}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>{t('noSessionsToday')}</p>
              )}
            </CardBody>
          </Card>

          {/* Attendance trend */}
          <Card>
            <CardHeader>{t('attendanceTrend30')}</CardHeader>
            <CardBody>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1A56DB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#1A56DB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={5} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text)', boxShadow: 'var(--shadow-md)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(v) => [`${v}%`, t('attendance')]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#1A56DB" strokeWidth={2.5} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* At risk students */}
          <Card>
            <CardHeader>
              <div>
                <div>{t('atRiskStudents')}</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>{t('belowAttendanceThreshold')}</div>
              </div>
            </CardHeader>
            <CardBody style={{ padding: '8px 24px 16px' }}>
              {atRiskLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
                </div>
              ) : atRiskStudents && atRiskStudents.length > 0 ? (
                <>
                  {atRiskStudents.map((student, idx) => (
                    <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: idx === atRiskStudents.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1A56DB, #3B82F6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials(student.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{student.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.course}</div>
                      </div>
                      <Badge variant={student.attendance < 40 ? 'critical' : 'atRisk'}>{student.attendance}%</Badge>
                    </div>
                  ))}
                  <a href="/reports" style={{ display: 'block', textAlign: 'center', color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>
                    {t('seeAllAtRisk')}
                  </a>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>{t('noAtRiskStudents')}</p>
              )}
            </CardBody>
          </Card>

          {/* This week quick stats */}
          <Card>
            <CardHeader>{t('thisWeek')}</CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: t('sessionsCreated'), value: 24 },
                  { label: t('checkInsToday'), value: 312 },
                  { label: t('manualMarks'), value: 8 },
                  { label: t('anomaliesFlagged'), value: 3 },
                ].map((s) => (
                  <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
