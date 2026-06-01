import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationApi, sessionApi } from '../../api';
import { RootState } from '../../store';
import { setLanguage } from '../../store/slices/langSlice';
import { Badge, Button, EmptyState, ProgressBar } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const { data, refetch, isFetching } = useQuery(
    ['sessions'],
    async () => {
      const response = await sessionApi.list();
      return response.data;
    },
    {
      staleTime: 1000 * 30,
    }
  );

  const { data: notificationsData } = useQuery(
    ['notifications', 'unread'],
    async () => {
      const response = await notificationApi.list(true);
      return response.data;
    },
    {
      staleTime: 1000 * 60,
      refetchOnMount: false,
    }
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessions = useMemo(() => {
    const source = data?.sessions ?? data ?? [];
    return Array.isArray(source) ? source : [];
  }, [data]);

  const openSession = useMemo(
    () => sessions.find((session: any) => session.status === 'OPEN'),
    [sessions]
  );

  const todaySessionCount = sessions.length;
  const pendingSessions = useMemo(
    () => sessions.filter((session: any) => session.status === 'PENDING'),
    [sessions]
  );

  const unreadCount = useMemo(() => {
    const source = notificationsData?.notifications ?? notificationsData ?? [];
    const notifications = Array.isArray(source) ? source : [];
    return notifications.filter((item: any) => !item.read).length;
  }, [notificationsData]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  }, [t]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [lang]
  );

  const attendanceRateNum = useMemo(() => {
    if (typeof user?.attendance_rate === 'number') {
      return user.attendance_rate;
    }
    return 96;
  }, [user]);

  const attendanceRate = `${attendanceRateNum}%`;

  const thresholdVariant = useCallback((pct: number) => {
    if (pct >= 80) return 'good' as const;
    if (pct >= 60) return 'warning' as const;
    if (pct >= 40) return 'atRisk' as const;
    return 'critical' as const;
  }, []);

  const overallStatusLabel = useMemo(() => {
    const v = thresholdVariant(attendanceRateNum);
    if (v === 'good') return t('good');
    if (v === 'warning') return t('warning');
    if (v === 'atRisk') return t('atRisk');
    return t('critical');
  }, [attendanceRateNum, t, thresholdVariant]);

  const formatCountdown = useCallback(
    (session: any) => {
      const timestamp = session.end_time ?? session.start_time ?? session.time;
      const target = timestamp ? Date.parse(timestamp.toString()) : NaN;
      const diff = Number.isNaN(target) ? 0 : target - now;
      if (diff <= 0) {
        return { text: t('startingSoon'), urgent: false };
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const parts = [];

      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      return { text: parts.join(' '), urgent: diff < 10 * 60000 };
    },
    [now, t]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSetLanguage = useCallback(
    (locale: 'en' | 'fr') => {
      if (locale === lang) return;
      hapticLight();
      dispatch(setLanguage(locale));
    },
    [dispatch, lang]
  );

  const handleToggleTheme = useCallback(() => {
    hapticLight();
    toggle();
  }, [toggle]);

  const stats = useMemo(
    () => [
      {
        key: 'attendance',
        icon: 'trending-up-outline' as const,
        tint: colors.success,
        tintBg: colors.successLight,
        value: attendanceRate,
        label: t('attendanceRate'),
      },
      {
        key: 'courses',
        icon: 'book-outline' as const,
        tint: colors.primary,
        tintBg: colors.primaryLight,
        value: `${todaySessionCount}`,
        label: t('courses'),
      },
      {
        key: 'sessions',
        icon: 'calendar-outline' as const,
        tint: colors.purple,
        tintBg: colors.purpleLight,
        value: `${todaySessionCount}`,
        label: t('sessionsToday'),
      },
      {
        key: 'streak',
        icon: 'flame-outline' as const,
        tint: colors.atRisk,
        tintBg: colors.atRiskLight,
        value: `${openSession ? 1 : 0}`,
        label: t('activeCheckIns'),
      },
    ],
    [attendanceRate, colors, openSession, t, todaySessionCount]
  );

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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                {greeting},
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                {user?.name ?? t('student')}
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {todayLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Language pills */}
              <View
                style={{
                  flexDirection: 'row',
                  borderRadius: 999,
                  overflow: 'hidden',
                  marginRight: 8,
                }}
              >
                {(['en', 'fr'] as const).map((locale) => {
                  const active = locale === lang;
                  return (
                    <TouchableOpacity
                      key={locale}
                      activeOpacity={0.8}
                      onPress={() => handleSetLanguage(locale)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        backgroundColor: active ? '#FFFFFF' : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? colors.primary : '#FFFFFF',
                        }}
                      >
                        {locale.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Theme toggle */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleTheme}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Bell */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  hapticLight();
                  navigation.navigate('Notifications' as never);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                {unreadCount > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: colors.danger,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.25)',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
                      {unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance overview block */}
          <View
            style={{
              marginTop: 16,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {t('attendanceRate')}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF' }}>
                {attendanceRate}
              </Text>
            </View>
            <ProgressBar
              percentage={attendanceRateNum}
              height={8}
              trackColor="rgba(255,255,255,0.2)"
              fillColors={['#FFFFFF', '#FFFFFF']}
            />
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {overallStatusLabel}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats grid overlapping header */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: -16,
            marginHorizontal: 16,
            gap: 12,
          }}
        >
          {stats.map((item) => (
            <View
              key={item.key}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 12,
                ...colors.shadow,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: item.tintBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Ionicons name={item.icon} size={18} color={item.tint} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {item.value}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: colors.textMuted,
                  marginTop: 2,
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Content area */}
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -20,
            paddingTop: 36,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {t('todaysSessions')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                hapticLight();
                navigation.navigate('Sessions' as never);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                {t('view')}
              </Text>
            </TouchableOpacity>
          </View>

          {sessions.length === 0 ? (
            <View>
              <EmptyState
                icon={<Ionicons name="calendar-outline" size={48} color={colors.textMuted} />}
                title={t('noSessionsToday')}
                subtitle={t('noUpcomingSessionsPending')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                {[
                  { icon: 'qr-code-outline' as const, label: t('scanQRCode'), route: 'CheckIn' },
                  { icon: 'grid-outline' as const, label: t('viewDashboard'), route: 'Dashboard' },
                  { icon: 'book-outline' as const, label: t('myCourses'), route: 'Courses' },
                  { icon: 'notifications-outline' as const, label: t('notifications'), route: 'Notifications' },
                ].map((pill) => (
                  <TouchableOpacity
                    key={pill.label}
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticLight();
                      navigation.navigate(pill.route as never);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 999,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      gap: 8,
                      ...colors.shadow,
                    }}
                  >
                    <Ionicons name={pill.icon} size={16} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            sessions.map((item: any) => {
              const status = item.status ?? 'PENDING';
              const statusKey = (status?.toLowerCase?.() ?? 'pending') as
                | 'open'
                | 'pending'
                | 'closed';
              const isOpen = status === 'OPEN';
              const indicatorColor =
                isOpen ? colors.success : status === 'PENDING' ? colors.warning : colors.border;
              const badgeVariant =
                isOpen ? 'good' : status === 'PENDING' ? 'warning' : 'neutral';
              const countdown = formatCountdown(item);
              const courseName =
                item.course_name ?? item.name ?? item.venue_name ?? item.venue ?? t('session');
              const time = item.start_time ?? item.time ?? t('today');
              const venue = item.venue_name ?? item.venue ?? t('venue');

              return (
                <View
                  key={
                    item.id?.toString() ??
                    item.session_id?.toString() ??
                    Math.random().toString()
                  }
                  style={{
                    flexDirection: 'row',
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    marginBottom: 12,
                    overflow: 'hidden',
                    ...colors.shadow,
                  }}
                >
                  <View style={{ width: 4, backgroundColor: indicatorColor }} />
                  <View style={{ flex: 1, padding: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '700', color: colors.text }}
                          numberOfLines={1}
                        >
                          {courseName}
                        </Text>
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}
                        >
                          <Ionicons name="time-outline" size={14} color={colors.primary} />
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{time}</Text>
                        </View>
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}
                        >
                          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                          <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                            {venue}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Badge label={t(statusKey)} variant={badgeVariant as any} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: countdown.urgent ? colors.danger : colors.textMuted,
                            marginTop: 8,
                          }}
                        >
                          {countdown.text}
                        </Text>
                      </View>
                    </View>

                    {isOpen ? (
                      <Button
                        title={t('checkIn')}
                        onPress={() => {
                          hapticSuccess();
                          navigation.navigate('CheckIn' as never, { session: item } as never);
                        }}
                        style={{ height: 40, marginTop: 12 }}
                        fullWidth
                      />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;
