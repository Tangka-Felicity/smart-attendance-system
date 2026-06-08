import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
  TextInput,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../../theme';
import { Button, ThemedScreen, GradientHeader } from '../../../components';
import { useTranslation } from '../../../hooks/useTranslation';
import { attendanceApi } from '../../../api';
import { hapticLight, hapticSuccess, hapticError } from '../../../utils/haptics';

const { width } = Dimensions.get('window');

type CheckInStep = 'location' | 'face' | 'verifying' | 'success' | 'manual' | 'code_entry';

const CheckInScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const cameraRef = useRef<Camera | null>(null);

  const [step, setStep] = useState<CheckInStep>('location');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(2);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const session = (route.params as any)?.session;
  const sessionId = (route.params as any)?.session_id || session?.session_id || session?.id;
  const courseName = (route.params as any)?.course_name || session?.course_name || session?.name;
  const venueName = (route.params as any)?.venue_name || (route.params as any)?.venue || session?.venue_name || session?.venue;

  useEffect(() => {
    const init = async () => {
      const { status: cStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cStatus === 'granted');

      const { status: lStatus } = await Location.requestForegroundPermissionsAsync();
      if (lStatus !== 'granted') {
        setErrorMsg(t('locationRequired'));
        return;
      }

      try {
        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(currentLoc);
        setStep('face');
      } catch (err) {
        setErrorMsg(t('unableToCaptureYourLocationPleaseTryAgain'));
      }
    };

    if (isFocused) {
      init();
    }
  }, [isFocused]);

  useEffect(() => {
    if (step === 'face' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 'face' && countdown === 0 && !faceImage) {
      captureFace();
    }
  }, [step, countdown]);

  const captureFace = async () => {
    if (!cameraRef.current) return;
    try {
      hapticLight();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setFaceImage(photo.base64 || null);
      setStep('verifying');
      performCheckIn(photo.base64);
    } catch (err) {
      console.error(err);
      setErrorMsg(t('somethingWentWrong'));
    }
  };

  const performCheckIn = async (b64: string | undefined | null, code?: string) => {
    if ((!sessionId && !code) || !location || !b64) return;

    setLoading(true);
    try {
      const payload: any = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        face_image: b64,
      };
      if (code) {
        payload.session_code = code;
      } else {
        payload.session_id = sessionId;
      }

      const response = await attendanceApi.checkin(payload);

      hapticSuccess();
      setResultData(response.data);
      setStep('success');

      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } catch (err: any) {
      hapticError();
      const detail = err?.response?.data?.detail || t('somethingWentWrong');
      setErrorMsg(detail);
      setStep('manual');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (errorMsg && step !== 'manual' && step !== 'code_entry') {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle" size={80} color={Colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Button title={t('retry')} onPress={() => { setErrorMsg(null); setStep('location'); }} style={{ marginTop: 20 }} />
        </View>
      );
    }

    switch (step) {
      case 'location':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusText}>{t('verifying')} {t('location')}</Text>
          </View>
        );

      case 'face':
        return (
          <View style={styles.cameraContainer}>
            {isFocused && (
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                type={'front' as any}
              />
            )}
            <View style={styles.overlay}>
              <View style={styles.faceFrame} />
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
              <Text style={styles.instructionText}>{t('lookDirectlyAtTheCameraAndKeepYourFaceWithinTheOval')}</Text>
            </View>
          </View>
        );

      case 'verifying':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusText}>{t('verifying')}</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stateContainer}>
            <Ionicons name="checkmark-circle" size={100} color={Colors.success} />
            <Text style={styles.successTitle}>{t('checkedInSuccessfully')}</Text>
            <Text style={styles.attendancePct}>
              {t('attendancePercent')}: {Math.round(resultData?.attendance_pct || 0)}%
            </Text>
          </View>
        );

      case 'manual':
        return (
          <View style={styles.stateContainer}>
            <Ionicons name="camera-reverse-outline" size={80} color={Colors.textMuted} />
            <Text style={styles.errorText}>{errorMsg || t('somethingWentWrong')}</Text>
            <Button title={t('tryAgain')} onPress={() => { setErrorMsg(null); setCountdown(2); setStep('location'); }} style={{ width: '100%', marginTop: 20 }} />
            <Button
                title={t('manualMark')}
                onPress={() => setStep('code_entry')}
                variant="outline"
                style={{ width: '100%', marginTop: 12 }}
            />
            <TouchableOpacity style={styles.manualBtn} onPress={() => navigation.goBack()}>
               <Text style={{ color: Colors.primary, fontWeight: '600' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        );

      case 'code_entry':
        return (
          <View style={styles.stateContainer}>
            <Text style={[styles.statusText, { marginBottom: 20 }]}>{t('enterSessionCode') || 'Enter Session Code'}</Text>
            <View style={styles.inputContainer}>
               <TextInput
                 style={styles.codeInput}
                 placeholder="e.g. SE3-4829"
                 placeholderTextColor={Colors.textMuted}
                 value={manualCode}
                 onChangeText={setManualCode}
                 autoCapitalize="characters"
               />
            </View>
            <Button
              title={t('submit')}
              onPress={() => performCheckIn(faceImage || "MANUAL_PLACEHOLDER", manualCode)}
              isLoading={loading}
              fullWidth
              style={{ marginTop: 20 }}
            />
            <TouchableOpacity style={styles.manualBtn} onPress={() => setStep('manual')}>
               <Text style={{ color: Colors.primary, fontWeight: '600' }}>{t('back')}</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <ThemedScreen edges={['top']}>
      <GradientHeader>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('checkIn')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.sessionCard}>
          <Text style={styles.courseName}>{courseName || t('session')}</Text>
          <View style={styles.venueRow}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.venueText}>{venueName || t('toBeAnnounced')}</Text>
          </View>
        </View>
      </GradientHeader>

      <View style={styles.content}>
        {renderContent()}
      </View>

      {step === 'manual' && (
        <View style={styles.footer}>
           <Text style={styles.footerMuted}>{t('manualMark')}</Text>
        </View>
      )}
    </ThemedScreen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  sessionCard: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  venueText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
    marginTop: -20,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  faceFrame: {
    width: width * 0.7,
    height: width * 0.9,
    borderRadius: width * 0.45,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  countdownContainer: {
    position: 'absolute',
    top: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  instructionText: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 24,
  },
  attendancePct: {
    fontSize: 18,
    color: Colors.success,
    fontWeight: '700',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  manualBtn: {
    marginTop: 16,
    padding: 12,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerMuted: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  codeInput: {
    height: 54,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  }
});

export default CheckInScreen;
