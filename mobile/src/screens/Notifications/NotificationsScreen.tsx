import React, { useCallback, useEffect, useMemo } from 'react';
import {
  RefreshControl,
  SectionList,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { notificationApi } from '../../api';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader, EmptyState } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hapticLight } from '../../utils/haptics';

const NotificationsScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const timeAgo = (value: string) => {
    const date = new Date(value);
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}${t('minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${t('hoursAgo')}`;
    const days = Math.floor(hours / 24);
    return `${days}${t('daysAgo')}`;
  };

  const { data, isFetching, refetch } = useQuery(['notifications'], async () => {
    const response = await notificationApi.list();
    return response.data;
  });

  const markReadMutation = useMutation(
    async (id: string) => {
      await notificationApi.markRead(id);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
    }
  );

  const notifications = Array.isArray(data?.notifications ?? data) ? data?.notifications ?? data : [];
  const unreadCount = notifications.filter((item: any) => !item.read).length;

  useEffect(() => {
    try {
      (navigation as any).getParent?.()?.setOptions?.({
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
      });
    } catch (e) {}
  }, [unreadCount]);

  const handleMarkRead = useCallback(
    (item: any) => {
      if (!item.read) {
        hapticLight();
        markReadMutation.mutate(item.id);
      }
    },
    [markReadMutation]
  );

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n: any) => !n.read);
    if (!unread.length) return;
    hapticLight();
    try {
      await Promise.all(unread.map((n: any) => notificationApi.markRead(n.id)));
      queryClient.invalidateQueries(['notifications']);
    } catch (e) {}
  }, [notifications, queryClient]);

  const grouped = useMemo(() => {
    const today: any[] = [];
    const thisWeek: any[] = [];
    const earlier: any[] = [];
    const now = new Date();
    notifications.forEach((n: any) => {
      const d = new Date(n.created_at ?? n.timestamp ?? Date.now());
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) today.push(n);
      else if (diffDays <= 7) thisWeek.push(n);
      else earlier.push(n);
    });
    const sections = [];
    if (today.length) sections.push({ title: t('today'), data: today });
    if (thisWeek.length) sections.push({ title: t('thisWeek'), data: thisWeek });
    if (earlier.length) sections.push({ title: t('earlier'), data: earlier });
    return sections;
  }, [notifications, t]);

  const accentFor = (type: string) =>
    type === 'attendance' ? colors.success : type === 'warning' ? colors.warning : type === 'at_risk' ? colors.danger : colors.primary;
  const tintFor = (type: string) =>
    type === 'attendance' ? colors.successLight : type === 'warning' ? colors.warningLight : type === 'at_risk' ? colors.dangerLight : colors.primaryLight;
  const iconFor = (type: string) =>
    type === 'attendance' ? 'checkmark' : type === 'warning' ? 'warning' : type === 'at_risk' ? 'alert-circle' : 'calendar';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />
      <GradientHeader paddingTop={insets.top + 16}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{t('notifications')}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('markAllRead')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </GradientHeader>

      <SectionList
        style={{ marginTop: -16 }}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '100%' }}
        sections={grouped}
        keyExtractor={(item: any, index) => item.id?.toString() ?? String(index)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="notifications-outline" size={56} color={colors.textMuted} />}
            title={t('noNotificationsYet')}
          />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            {title}
          </Text>
        )}
        renderItem={({ item }) => {
          const accent = accentFor(item.type);
          return (
            <TouchableOpacity activeOpacity={0.85} onPress={() => handleMarkRead(item)}>
              <View style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 4, backgroundColor: accent }} />
                <View style={{ flex: 1, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tintFor(item.type), justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={iconFor(item.type) as any} size={18} color={accent} />
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {timeAgo(item.created_at ?? item.timestamp ?? new Date().toISOString())}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 18 }}>{item.message ?? t('noMessageProvided')}</Text>
                </View>
                {!item.read && (
                  <View style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default NotificationsScreen;
