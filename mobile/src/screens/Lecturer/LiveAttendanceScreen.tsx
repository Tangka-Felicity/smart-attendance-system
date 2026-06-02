import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { sessionApi } from '../../api';
import { Badge, Card } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { useTranslation } from '../../hooks/useTranslation';

const LiveAttendanceScreen = () => {
  const route = useRoute();
  const { t } = useTranslation();
  const { sessionId } = (route.params as any) || {};
  const [search, setSearch] = useState('');

  const { data, refetch, isFetching } = useQuery(
    ['liveAttendance', sessionId],
    async () => {
      const response = await sessionApi.getAttendance(sessionId);
      return response.data;
    },
    {
      enabled: !!sessionId,
      refetchInterval: 30000,
    }
  );

  const records = Array.isArray(data?.records ?? data) ? data?.records ?? data : [];
  const filteredRecords = useMemo(
    () => records.filter((record: any) => {
      const lowerText = search.toLowerCase();
      return !search || record.name?.toLowerCase().includes(lowerText) || record.student_number?.toLowerCase().includes(lowerText);
    }),
    [records, search]
  );

  const presentCount = records.filter((record: any) => record.status === 'PRESENT').length;
  const absentCount = records.filter((record: any) => record.status === 'ABSENT').length;
  const manualCount = records.filter((record: any) => record.method === 'MANUAL').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ backgroundColor: Colors.primary, paddingTop: Spacing.xxl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg }}>
        <Text style={[Typography.heading3, { color: Colors.white }]}>{t('liveAttendance')}</Text>
        <Text style={[Typography.bodySmall, { color: Colors.primaryLight, marginTop: Spacing.sm }]}>{data?.session_name ?? t('currentSession')}</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        data={filteredRecords}
        keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Card elevated style={{ flex: 1, marginRight: Spacing.sm }}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{t('present')}</Text>
                <Text style={[Typography.heading2, { color: Colors.success, marginTop: Spacing.sm }]}>{presentCount}</Text>
              </Card>
              <Card elevated style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{t('absent')}</Text>
                <Text style={[Typography.heading2, { color: Colors.danger, marginTop: Spacing.sm }]}>{absentCount}</Text>
              </Card>
              <Card elevated style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{t('manual')}</Text>
                <Text style={[Typography.heading2, { color: Colors.warning, marginTop: Spacing.sm }]}>{manualCount}</Text>
              </Card>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('searchStudents')}
              placeholderTextColor={Colors.textMuted}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderWidth: 1,
                borderColor: Colors.border,
                color: Colors.textPrimary,
              }}
            />
          </>
        }
        renderItem={({ item }: any) => (
          <Card elevated style={{ marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <View>
                <Text style={[Typography.heading3, { color: Colors.textPrimary }]}>{item.name ?? t('unknownStudent')}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>{item.student_number ?? t('notAvailable')}</Text>
              </View>
              <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
                <Badge label={item.method === 'MANUAL' ? t('manual') : t('auto')} variant={item.method === 'MANUAL' ? 'warning' : 'good'} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{item.arrival_time ?? t('notAvailable')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: item.status === 'PRESENT' ? Colors.success : item.status === 'ABSENT' ? Colors.danger : Colors.warning,
                    marginRight: Spacing.sm,
                  }}
                />
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{item.status ?? t('unknown')}</Text>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
};

export default LiveAttendanceScreen;
