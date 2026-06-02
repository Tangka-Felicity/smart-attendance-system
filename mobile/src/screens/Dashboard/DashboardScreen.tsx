import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { analyticsApi, courseApi } from '../../api';
import { RootState } from '../../store';
import { Badge, Button, EmptyState, ProgressBar } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

type ThresholdKey = 'good' | 'warning' | 'atRisk' | 'critical';

const DashboardScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isFetching } = useQuery(
    ['studentDashboard', user?.user_id],
    async () => {
      const response = await analyticsApi.studentDashboard(user?.user_id ?? '');
      return response.data;
    },
    {
      enabled: !!user?.user_id,
      staleTime: 1000 * 30,
    }
  );

  const { data: coursesData } = useQuery(['studentCourses'], async () => {
    const response = await courseApi.list();
    return response.data;
  });

  const courses = useMemo(() => {
    const source = coursesData ?? [];
    return Array.isArray(source) ? source : [];
  }, [coursesData]);

  const percentage = useMemo(() => Number(data?.percentage ?? 0), [data]);

  const thresholdKey = useCallback((pct: number): ThresholdKey => {
    if (pct >= 80) return 'good';
    if (pct >= 60) return 'warning';
    if (pct >= 40) return 'atRisk';
    return 'critical';
  }, []);

  const thresholdColor = useCallback(
    (pct: number) => {
      const key = thresholdKey(pct);
      if (key === 'good') return colors.success;
      if (key === 'warning') return colors.warning;
      if (key === 'atRisk') return colors.atRisk;
      return colors.danger;
    },
    [colors, thresholdKey]
  );

  const thresholdFill = useCallback(
    (pct: number): readonly [string, string] => {
      const key = thresholdKey(pct);
      if (key === 'good') return ['#16A34A', '#22C55E'];
      if (key === 'warning') return ['#D97706', '#F59E0B'];
      if (key === 'atRisk') return ['#EA580C', '#F97316'];
      return ['#DC2626', '#EF4444'];
    },
    [thresholdKey]
  );

  const ringColor = thresholdColor(percentage);
  const ringStatus = t(thresholdKey(percentage));

  const strokeWidth = 10;
  const size = 180;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.max(0, Math.min(100, percentage)) / 100) * circumference;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const statusChips: Array<{ key: ThresholdKey; variant: ThresholdKey; range: string }> = [
    { key: 'good', variant: 'good', range: '80%+' },
    { key: 'warning', variant: 'warning', range: '60%+' },
    { key: 'atRisk', variant: 'atRisk', range: '40%+' },
    { key: 'critical', variant: 'critical', range: '<40%' },
  ];

  const renderCourse = (item: any, index: number) => {
    const progress = Number(item.progress ?? item.percentage ?? 0);
    const code = item.code ?? item.course_code ?? item.courseId ?? item.id ?? '';
    const name = item.name ?? item.course_name ?? t('courses');
    const lecturer = item.lecturer_name ?? item.lecturer ?? t('lecturer');
    const sessionsCompleted = item.sessions_completed ?? item.completed_sessions ?? 0;
    const sessionsTotal = item.sessions_total ?? item.total_sessions ?? 0;
    const mark = Number(item.mark ?? item.grade ?? item.average_mark ?? 0).toFixed(1);
    const markColor = thresholdColor(progress);

    return (
      <View
        key={item.id?.toString() ?? item.course_id?.toString() ?? String(index)}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          marginBottom: 12,
          ...colors.shadow,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Badge label={String(code)} variant="primary" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: markColor }}>{`${mark}/10`}</Text>
        </View>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{name}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {t('lecturer')}: {lecturer}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {`${sessionsCompleted} ${t('of')} ${sessionsTotal} ${t('sessions').toLowerCase()}`}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: markColor }}>{`${progress}%`}</Text>
        </View>

        <ProgressBar percentage={progress} height={8} fillColors={[...thresholdFill(progress)]} />

        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
          {`${Math.max(0, sessionsTotal - sessionsCompleted)} ${t('sessionsRemaining')}`}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Gradient header */}
        <LinearGradient
          colors={colors.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 28,
            paddingHorizontal: 20,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>{t('dashboard')}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {t('dashboardSubtitle')}
          </Text>
        </LinearGradient>

        {/* Circular progress card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 28,
            marginHorizontal: 16,
            marginTop: -20,
            alignItems: 'center',
            ...colors.shadowLg,
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={size} height={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.border}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text }}>
                {percentage}%
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: ringColor, marginTop: 4 }}>
                {ringStatus}
              </Text>
            </View>
          </View>

          {/* Status chips */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              marginTop: 20,
            }}
          >
            {statusChips.map((chip) => (
              <Badge
                key={chip.key}
                variant={chip.variant}
                label={`${t(chip.key)} ${chip.range}`}
              />
            ))}
          </View>
        </View>

        {/* Course list */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            {t('myCourses')}
          </Text>

          {courses.length === 0 ? (
            <EmptyState
              title={t('noCoursesEnrolled')}
              subtitle={t('browseCourses')}
              action={<Button title={t('browseToEnroll')} onPress={() => {}} fullWidth />}
            />
          ) : (
            courses.map((course: any, index: number) => renderCourse(course, index))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;
