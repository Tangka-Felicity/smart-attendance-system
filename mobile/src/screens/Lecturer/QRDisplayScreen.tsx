import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '../../components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sessionApi } from '../../api';
import { Badge, Card } from '../../components';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../theme';
import { useTranslation } from '../../hooks/useTranslation';

const QRDisplayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { sessionId } = (route.params as any) || {};
  const TOTAL = 30;
  const [counter, setCounter] = useState(TOTAL);
  const qrOpacity = useRef(new Animated.Value(1)).current;

  const { data: sessionData, refetch: refetchSession } = useQuery(
    ['session', sessionId],
    async () => {
      const response = await sessionApi.get(sessionId);
      return response.data;
    },
    { enabled: !!sessionId }
  );

  const { data: qrData, refetch: refetchQR } = useQuery(
    ['sessionQr', sessionId],
    async () => {
      const response = await sessionApi.getQR(sessionId);
      return response.data;
    },
    {
      enabled: !!sessionId && sessionData?.status === 'OPEN',
      // we control refresh via timer, keep a safety refetch
      refetchInterval: 60000,
    }
  );

  const { data: attendanceData, refetch: refetchAttendance } = useQuery(
    ['attendance', sessionId],
    async () => {
      const response = await sessionApi.getAttendance(sessionId);
      return response.data;
    },
    {
      enabled: !!sessionId && sessionData?.status === 'OPEN',
      refetchInterval: 30000,
    }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prev) => (prev === 0 ? TOTAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (counter === 0 && sessionData?.status === 'OPEN') {
      // Fade out old QR, refetch, then fade in
      Animated.timing(qrOpacity, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start(async () => {
        await refetchQR();
        qrOpacity.setValue(0);
        Animated.timing(qrOpacity, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.quad) }).start();
      });
      setCounter(TOTAL);
    }
  }, [counter, refetchQR, sessionData?.status, qrOpacity]);

  const openMutation = useMutation(() => sessionApi.open(sessionId), {
    onSuccess: () => refetchSession(),
    onError: () => Alert.alert(t('unableToOpenSession'), t('pleaseTryAgain')),
  });

  const closeMutation = useMutation(() => sessionApi.close(sessionId), {
    onSuccess: () => refetchSession(),
    onError: () => Alert.alert(t('unableToCloseSession'), t('pleaseTryAgain')),
  });

  const attendanceCount = attendanceData?.count ?? (Array.isArray(attendanceData?.records) ? attendanceData.records.length : 0);
  const status = sessionData?.status ?? 'PENDING';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}>
        {/* Session Info */}
        <View style={{ marginBottom: Spacing.lg }}>
          <Text style={[{ fontSize: 20, fontWeight: '700', color: Colors.text }]}>{sessionData?.course_name ?? sessionData?.title ?? t('session')}</Text>
          <Text style={[{ fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs }]}>{sessionData?.starts_at && sessionData?.ends_at ? `${sessionData.starts_at} — ${sessionData.ends_at}` : sessionData?.time_range}</Text>
          <Text style={[{ fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xs }]}>{sessionData?.venue_name}</Text>
        </View>
        <Card elevated style={{ marginBottom: Spacing.lg }}>
          <Text style={[Typography.label, { color: Colors.textSecondary }]}>{t('attendanceCount')}</Text>
          <Text style={[Typography.heading2, { color: Colors.primary, marginTop: Spacing.sm }]}>{attendanceCount} {t('studentsCheckedIn')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LiveAttendance' as never, { sessionId } as never)} style={{ marginTop: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.full, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary }}>
            <Text style={[Typography.button, { color: Colors.primary }]}>{t('viewLive')}</Text>
          </TouchableOpacity>
        </Card>
        {status === 'PENDING' ? (
          <Card elevated style={{ alignItems: 'center', padding: Spacing.lg, marginBottom: Spacing.lg }}>
            <Text style={[Typography.heading3, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>{t('sessionIsPending')}</Text>
            <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>{t('openTheSessionToGenerateQRCodeForStudentCheckIn')}</Text>
            <Button title={t('openSession')} onPress={() => openMutation.mutate()} fullWidth={false} />
          </Card>
        ) : status === 'OPEN' ? (
          <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
            <View style={{ width: 280, height: 280, justifyContent: 'center', alignItems: 'center' }}>
              <Svg width={280} height={280} viewBox="0 0 280 280" style={{ position: 'absolute' }}>
                <Circle cx={140} cy={140} r={128} stroke={Colors.surfaceAlt} strokeWidth={8} fill="transparent" />
                {/* progress stroke */}
                {(() => {
                  const radius = 128;
                  const circumference = 2 * Math.PI * radius;
                  const progress = Math.max(0, Math.min(1, counter / TOTAL));
                  const strokeDashoffset = circumference * (1 - progress);
                  let strokeColor = '#16A34A';
                  if (counter <= 10) strokeColor = '#DC2626';
                  else if (counter <= 20) strokeColor = '#D97706';
                  return (
                    <Circle
                      cx={140}
                      cy={140}
                      r={radius}
                      stroke={strokeColor}
                      strokeWidth={10}
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      transform={`rotate(-90 140 140)`}
                    />
                  );
                })()}
              </Svg>

              <Animated.View style={[styles.qrBox, { opacity: qrOpacity }]}>
                <View style={styles.qrInner}>
                  <QRCode value={qrData?.token ?? 'SESSION_TOKEN'} size={240} backgroundColor={Colors.white} color={Colors.primary} />
                </View>
              </Animated.View>

              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={[Typography.heading2, { color: Colors.textPrimary }]}>{counter}s</Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{t('expiresIn')}</Text>
              </View>
            </View>

            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: Spacing.md }]}>{attendanceCount} {t('studentsCheckedIn')}</Text>
          </View>
        ) : (
          <Card elevated style={{ padding: Spacing.lg, marginBottom: Spacing.lg }}>
            <Text style={[Typography.heading3, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>{t('sessionClosed')}</Text>
            <Text style={[Typography.body, { color: Colors.textSecondary }]}>{t('theSessionHasBeenClosedReviewTheSummaryOrReopenIfNeeded')}</Text>
          </Card>
        )}
        {/* manual mark action */}
        <View style={{ marginTop: Spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.navigate('ManualMark' as never, { sessionId } as never)} style={{ backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm }}>
            <Text style={[Typography.button, { color: Colors.primary, textAlign: 'center' }]}>{t('manualMark')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {status === 'OPEN' && (
        <View style={{ padding: Spacing.lg, backgroundColor: 'transparent' }}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(t('closeSession'), t('areYouSureYouWantToCloseThisSession') ?? t('closeSession'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('closeSession'), style: 'destructive', onPress: () => closeMutation.mutate() },
              ]);
            }}
            style={{ backgroundColor: Colors.danger, borderRadius: Radius.full, paddingVertical: Spacing.lg, alignItems: 'center' }}
          >
            <Text style={[Typography.button, { color: Colors.white }]}>{t('closeSession')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default QRDisplayScreen;

const styles = StyleSheet.create({
  qrBox: {
    width: 280,
    height: 280,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrInner: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
