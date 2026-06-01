import { useQuery } from '@tanstack/react-query';
import {
  sessionsApi,
  coursesApi,
  anomaliesApi,
  auditApi,
} from '../api/client';

// Sessions Query
export const useSessions = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionsApi.list(params),
  });
};

// Courses Query
export const useCourses = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => coursesApi.list(params),
  });
};

// Session Attendance Query with 30 second refetch interval
export const useSessionAttendance = (sessionId: string) => {
  return useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: () => sessionsApi.attendance(sessionId),
    refetchInterval: 30000,
  });
};

// Anomalies Query
export const useAnomalies = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['anomalies', params],
    queryFn: () => anomaliesApi.list(params),
  });
};

// Audit Log Query
export const useAuditLog = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => auditApi.list(params),
  });
};
