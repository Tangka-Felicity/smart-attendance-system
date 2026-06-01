import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Divider } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { hapticSuccess, hapticLight } from '../../../utils/haptics';

const ConfirmedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.4)).current;

  const { attendancePercent, mark, status } = (route.params as any) || {};
  const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    hapticSuccess();
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scale]);

  const normalizedPercent = Number(attendancePercent ?? 0);
  const normalizedMark = Number(mark ?? 0).toFixed(1);
  const threshColor = normalizedPercent >= 80 ? colors.success : normalizedPercent >= 60 ? colors.warning : normalizedPercent >= 40 ? colors.atRisk : colors.danger;
  const statusLabel = status
    ? status
    : normalizedPercent >= 80 ? t('good') : normalizedPercent >= 60 ? t('warning') : normalizedPercent >= 40 ? t('atRisk') : t('critical');

  const Row = ({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) => (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
        {children}
      </View>
      {!last && <Divider />}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Animated.View
          style={{
            width: 100, height: 100, borderRadius: 50, backgroundColor: colors.success,
            justifyContent: 'center', alignItems: 'center', transform: [{ scale }],
            shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
          }}
        >
          <Ionicons name="checkmark" size={56} color="#fff" />
        </Animated.View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 24, textAlign: 'center' }}>{t('checkedIn')}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>{dateStr} · {arrivalTime}</Text>

        <View style={{ width: '100%', marginTop: 24, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 24, ...colors.shadowLg }}>
          <Row label={t('arrivalTime')}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{arrivalTime}</Text>
          </Row>
          <Row label={t('attendancePercent')}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: threshColor }}>{normalizedPercent}%</Text>
          </Row>
          <Row label={t('markOutOf10')}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: threshColor }}>
              {normalizedMark}
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}> / 10</Text>
            </Text>
          </Row>
          <Row label={t('status')} last>
            <View style={{ backgroundColor: threshColor + '22', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: threshColor }}>{statusLabel}</Text>
            </View>
          </Row>
        </View>
      </View>

      <View style={{ padding: 20, gap: 12 }}>
        <Button title={t('viewDashboard')} gradient fullWidth onPress={() => { hapticLight(); navigation.navigate('DashboardTab' as never); }} />
        <Button title={t('backToHome')} variant="outline" fullWidth onPress={() => { hapticLight(); navigation.navigate('HomeTab' as never); }} />
      </View>
    </View>
  );
};

export default ConfirmedScreen;
