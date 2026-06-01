import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { sessionApi } from '../../api';
import { Badge, Card, GradientHeader, EmptyState } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

const LiveAttendanceScreen = () => {
  const route = useRoute();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { sessionId } = (route.params as any) || {};
  const [search, setSearch] = useState('');

  const { data, refetch, isFetching } = useQuery(
    ['liveAttendance', sessionId],
    async () => {
      const response = await sessionApi.getAttendance(sessionId);
      return response.data;
    },
    { enabled: !!sessionId, refetchInterval: 30000 }
  );

  const records = Array.isArray(data?.records ?? data) ? data?.records ?? data : [];
  const filteredRecords = useMemo(
    () =>
      records.filter((record: any) => {
        const lowerText = search.toLowerCase();
        return !search || record.name?.toLowerCase().includes(lowerText) || record.student_number?.toLowerCase().includes(lowerText);
      }),
    [records, search]
  );

  const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;
  const manualCount = records.filter((r: any) => r.method === 'MANUAL').length;

  const initials = (name?: string) => (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />
      <GradientHeader paddingTop={insets.top + 16}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{t('liveAttendance')}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{data?.session_name ?? t('currentSession')}</Text>
      </GradientHeader>

      <FlatList
        style={{ marginTop: -20 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '100%' }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        data={filteredRecords}
        keyExtractor={(item: any, index) => item.id?.toString() ?? String(index)}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, paddingTop: 8 }}>
              {[
                { label: t('present'), value: presentCount, color: colors.success },
                { label: t('absent'), value: absentCount, color: colors.danger },
                { label: t('manual'), value: manualCount, color: colors.warning },
              ].map((s) => (
                <Card key={s.label} elevated style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.label}</Text>
                </Card>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, marginBottom: 16 }}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput value={search} onChangeText={setSearch} placeholder={t('searchStudents')} placeholderTextColor={colors.placeholder} style={{ flex: 1, color: colors.text, fontSize: 15 }} />
            </View>
          </>
        }
        ListEmptyComponent={<EmptyState icon={<Ionicons name="people-outline" size={56} color={colors.textMuted} />} title={t('noData') ?? t('present')} />}
        renderItem={({ item }: any) => (
          <Card elevated style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{initials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name ?? t('unknownStudent')}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{item.student_number ?? t('notAvailable')} · {item.arrival_time ?? t('notAvailable')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Badge label={item.method === 'MANUAL' ? t('manual') : t('auto')} variant={item.method === 'MANUAL' ? 'purple' : 'good'} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === 'PRESENT' ? colors.success : item.status === 'ABSENT' ? colors.danger : colors.warning }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.status ?? t('unknown')}</Text>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
};

export default LiveAttendanceScreen;
