import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../../theme';
import { StepIndicator } from '../../../components';
import { useTranslation } from '../../../hooks/useTranslation';

const frameSize = 260;
const animationDuration = 1200;

const CheckInScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const cameraRef = useRef<Camera | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [locationData, setLocationData] = useState<Location.LocationObject | null>(null);
  const [scanned, setScanned] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const session = (route.params as any)?.session;

  useEffect(() => {
    const requestPermissions = async () => {
      const camera = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(camera.status === 'granted');

      const location = await Location.requestForegroundPermissionsAsync();
      if (location.status === 'granted') {
        try {
          const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          setLocationData(coords);
          setLocationStatus('ok');
        } catch {
          setLocationStatus('fail');
        }
      } else {
        setLocationStatus('fail');
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || !session) return;
    setScanned(true);
    Vibration.vibrate();

    if (!locationData) {
      Alert.alert(t('locationRequired'), t('unableToCaptureYourLocationPleaseTryAgain'));
      setScanned(false);
      return;
    }

    navigation.navigate('Face' as never, {
      session,
      qrToken: data,
      latitude: locationData.coords.latitude,
      longitude: locationData.coords.longitude,
    } as never);
  };

  const pulseStyle = {
    transform: [
      {
        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
      },
    ],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
  };

  if (hasCameraPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <Text style={[Typography.body, { color: Colors.textPrimary }]}>{t('cameraPermissionRequiredToScanTheSessionQRCode')}</Text>
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
          <Text style={[Typography.heading3, { color: Colors.white }]}>{t('scanQRCode')}</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>

      <StepIndicator currentStep={1} />

      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {isFocused ? (
          <Camera
            style={{ flex: 1 }}
            ref={(ref) => (cameraRef.current = ref)}
            onBarCodeScanned={handleBarCodeScanned}
            barCodeScannerSettings={{ barCodeTypes: [Camera.Constants.BarCodeType.qr] }}
            ratio="16:9"
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View
                style={[
                  {
                    width: frameSize,
                    height: frameSize,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: Colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  pulseStyle,
                ]}
              >
                <View style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary }} />
                <View style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.primary }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary }} />
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.primary }} />
              </Animated.View>
              <Text style={[Typography.body, { color: Colors.white, marginTop: Spacing.lg }]}>{t('scanQRCode')}</Text>
            </View>
          </Camera>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
    </View>
  );
};

export default CheckInScreen;
