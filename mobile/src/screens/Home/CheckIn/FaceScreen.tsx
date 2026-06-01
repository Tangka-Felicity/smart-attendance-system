import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';
import { attendanceApi } from '../../../api';
import { addToQueue } from '../../../store/slices/offlineSlice';
import { Colors, Radius, Spacing, Typography } from '../../../theme';
import { StepIndicator } from '../../../components';
import { useTranslation } from '../../../hooks/useTranslation';

const FaceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const cameraRef = useRef<Camera | null>(null);
  const isFocused = useIsFocused();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { session, qrToken, latitude, longitude } = (route.params as any) || {};

  useEffect(() => {
    const requestPermission = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraPermission.status === 'granted');
    };
    requestPermission();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || !session) {
      return;
    }

    setLoading(true);

    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
    const payload = {
      session_id: session.id,
      qr_token: qrToken ?? session.qr_token,
      latitude,
      longitude,
      face_image: photo.base64,
    };

    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && net.isInternetReachable;

    if (!isOnline) {
      dispatch(
        addToQueue({
          id: uuid.v4().toString(),
          type: 'checkin',
          ...payload,
          captured_at: new Date().toISOString(),
        })
      );
      setLoading(false);
      navigation.navigate('Confirmed' as never, {
        session,
        offline: true,
      } as never);
      return;
    }

    try {
      const photoData = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      const payloadWithPhoto = { ...payload, face_image: photoData.base64 };
      const response = await attendanceApi.checkin(payloadWithPhoto);
      setLoading(false);
      navigation.navigate('Confirmed' as never, {
        session,
        offline: false,
        recordId: response.data?.record_id ?? response.data?.id,
        attendancePercent: response.data?.attendance_percent ?? response.data?.attendance ?? 0,
        mark: response.data?.mark ?? response.data?.score ?? 0,
        status: response.data?.status,
      } as never);
    } catch (error: any) {
      setLoading(false);
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      if (nextRetry >= 3) {
        Alert.alert(t('checkInError'), t('unableToCompleteCheckInAfterMultipleAttemptsPleaseTryAgain'));
        navigation.goBack();
        return;
      }
      Alert.alert(t('retryFailed'), error?.response?.data?.detail ?? t('pleaseTryAgain'), [
        { text: t('tryAgain'), onPress: handleCapture },
      ]);
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={[Typography.body, { color: Colors.textPrimary }]}>{t('cameraAccessIsRequiredForFaceCapture')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ backgroundColor: Colors.primary, paddingTop: Spacing.xxl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: Spacing.sm }}>
            <Text style={{ color: Colors.white, fontSize: 16 }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[Typography.heading3, { color: Colors.white }]}>{t('positionYourFace')}</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>

      <StepIndicator currentStep={2} />

      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {isFocused ? (
          <Camera style={{ flex: 1 }} type={Camera.Constants.Type.front} ref={(ref) => (cameraRef.current = ref)}>
            <View style={styles.cameraOverlay}>
              <View style={styles.faceFrame} />
            </View>
          </Camera>
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>

      <View style={{ padding: Spacing.lg, backgroundColor: Colors.white }}>
        <Text style={[Typography.heading3, { marginBottom: Spacing.sm }]}>{t('positionYourFace')}</Text>
        <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>{t('lookDirectlyAtTheCameraAndKeepYourFaceWithinTheOval')}</Text>
        <TouchableOpacity onPress={handleCapture} style={styles.captureButton} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={[Typography.button, { color: Colors.white }]}>{t('capture')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 350,
    borderRadius: 180,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  captureButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FaceScreen;
