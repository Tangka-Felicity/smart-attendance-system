import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { authApi, studentApi } from '../../api';
import { setAuthData } from '../../store/slices/authSlice';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';

type AppColors = ReturnType<typeof useTheme>['colors'];
type Step = 1 | 2;
type LoadingStage = 'creatingAccount' | 'registeringFace' | 'allDone' | null;

const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

const strengthForPassword = (password: string, colors: AppColors) => {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length < 8 || score <= 1) {
    return { key: 'weak' as const, width: '25%', color: colors.danger };
  }
  if (score === 2) {
    return { key: 'fair' as const, width: '50%', color: colors.warning };
  }
  if (score === 3) {
    return { key: 'strong' as const, width: '75%', color: colors.success };
  }
  return { key: 'veryStrong' as const, width: '100%', color: colors.success };
};

const RegisterScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<Step>(1);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [capturedFace, setCapturedFace] = useState<{ uri: string; base64: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [values, setValues] = useState({
    fullName: '',
    matricule: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const requestPermission = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === 'granted');
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (showToast) {
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showToast, toastAnim]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fieldWrap: {
          marginBottom: 16,
        },
        fieldLabel: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 6,
        },
        inputRow: {
          height: 52,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 12,
        },
        inputRowFocused: {
          borderColor: colors.primary,
        },
        input: {
          flex: 1,
          color: colors.text,
          fontSize: 15,
          paddingVertical: 0,
        },
        helper: {
          marginTop: 6,
          color: colors.danger,
          fontSize: 12,
        },
        muted: {
          color: colors.textSecondary,
          fontSize: 13,
          lineHeight: 18,
        },
        overlayCard: {
          width: '100%',
          maxWidth: 320,
          borderRadius: 24,
          backgroundColor: colors.card,
          padding: 24,
          alignItems: 'center',
          ...colors.shadowLg,
        },
      }),
    [colors]
  );

  const validation = useMemo(() => {
    const fullName = values.fullName.trim();
    const matricule = values.matricule.trim();
    const email = values.email.trim();
    const password = values.password;
    const confirmPassword = values.confirmPassword;

    return {
      fullName: fullName.length >= 2,
      matricule: matricule.length >= 4,
      email: isEmail(email),
      password: password.length >= 8,
      confirmPassword: password.length >= 8 && password === confirmPassword,
    };
  }, [values]);

  const passwordStrength = useMemo(
    () => strengthForPassword(values.password, colors),
    [values.password, colors]
  );

  const canProceedStep1 =
    validation.fullName &&
    validation.matricule &&
    validation.email &&
    validation.password &&
    validation.confirmPassword;

  const setField = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (error) {
      setError('');
    }
  };

  const touchField = (key: keyof typeof values) => {
    setFocusedField(null);
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const getFieldError = (key: keyof typeof values) => {
    if (!touched[key]) {
      return '';
    }

    switch (key) {
      case 'fullName':
        return validation.fullName ? '' : t('nameTooShort');
      case 'matricule':
        return validation.matricule ? '' : t('matriculeTooShort');
      case 'email':
        return validation.email ? '' : t('invalidEmail');
      case 'password':
        return validation.password ? '' : t('passwordTooShort');
      case 'confirmPassword':
        return validation.confirmPassword ? '' : t('passwordMismatch');
      default:
        return '';
    }
  };

  const extractStudentId = (data: any) =>
    data?.student_id ||
    data?.student?.student_id ||
    data?.student?.id ||
    data?.user?.user_id ||
    data?.user_id ||
    data?.id ||
    null;

  const handleNextStep = () => {
    hapticLight();
    setTouched({
      fullName: true,
      matricule: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!canProceedStep1) {
      hapticError();
      return;
    }

    setError('');
    handleSubmit(true);
  };

  const handleCapture = async () => {
    hapticLight();
    if (!cameraRef.current) {
      return;
    }

    if (hasCameraPermission === false) {
      hapticError();
      setError(t('cameraAccessIsRequiredForFaceCapture'));
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: true,
    });

    if (photo.base64) {
      hapticSuccess();
      setCapturedFace({ uri: photo.uri, base64: photo.base64 });
    }
  };

  const handleSubmit = async (skipFace = false) => {
    hapticLight();

    const trimmedName = values.fullName.trim();
    const trimmedEmail = values.email.trim().toLowerCase();
    const trimmedMatricule = values.matricule.trim();
    const trimmedPhone = values.phone.trim();

    try {
      setError('');
      setLoadingStage('creatingAccount');

      const registerResponse = await authApi.register({
        name: trimmedName,
        student_number: trimmedMatricule,
        email: trimmedEmail,
        password: values.password,
      });

      const studentId = extractStudentId(registerResponse.data);
      if (!studentId) {
        throw new Error(t('somethingWentWrong'));
      }
      const studentIdValue = String(studentId);

      if (!skipFace && capturedFace?.base64) {
        setLoadingStage('registeringFace');
        await studentApi.faceRegister({
          student_id: studentIdValue,
          face_image: capturedFace.base64,
        });
      }

      const loginResponse = await authApi.login(trimmedEmail, values.password);
      const { access_token, refresh_token, user } = loginResponse.data ?? {};

      if (access_token) {
        await SecureStore.setItemAsync('access_token', access_token);
      }
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      setLoadingStage('allDone');
      hapticSuccess();
      setToastMessage(t('welcomeAccountReady').replace('{name}', trimmedName));
      setShowToast(true);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const authenticatedUser = {
        ...(user ?? {}),
        user_id: user?.user_id ?? studentIdValue,
        name: user?.name ?? trimmedName,
        email: user?.email ?? trimmedEmail,
        role: user?.role ?? 'STUDENT',
        first_login: false,
      };

      dispatch(
        setAuthData({
          user: authenticatedUser,
          access_token: access_token ?? null,
        })
      );
    } catch (submitError: any) {
      const detail =
        submitError?.response?.data?.detail ||
        submitError?.message ||
        t('somethingWentWrong');
      setLoadingStage(null);
      hapticError();
      setShowToast(false);
      setToastMessage('');
      setError(detail);
    }
  };

  const renderField = (
    key: keyof typeof values,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    options?: {
      placeholder?: string;
      secureTextEntry?: boolean;
      keyboardType?: any;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      rightAction?: React.ReactNode;
    }
  ) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focusedField === key && styles.inputRowFocused]}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          value={values[key]}
          onChangeText={(text) => setField(key, text)}
          onFocus={() => setFocusedField(key)}
          onBlur={() => touchField(key)}
          placeholder={options?.placeholder ?? label}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          secureTextEntry={options?.secureTextEntry}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize ?? 'sentences'}
          returnKeyType="next"
        />
        {options?.rightAction}
      </View>
      {getFieldError(key) ? <Text style={styles.helper}>{getFieldError(key)}</Text> : null}
    </View>
  );

  const eyeToggle = (visible: boolean, toggle: () => void) => (
    <TouchableOpacity
      onPress={() => {
        hapticLight();
        toggle();
      }}
    >
      <Ionicons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ minHeight: height, backgroundColor: colors.card }}>
            <LinearGradient
              colors={colors.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: height * 0.32,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingTop: insets.top,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...colors.shadowLg,
                }}
              >
                <Image
                  source={require('../../../assets/full-logo.jpeg')}
                  style={{ width: 56, height: 56, resizeMode: 'contain', borderRadius: 16 }}
                />
              </View>
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {t('appName')}
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'center',
                }}
              >
                {t('tagline')}
              </Text>
            </LinearGradient>

            <View
              style={{
                flex: 1,
                marginTop: -32,
                backgroundColor: colors.card,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                padding: 32,
                paddingBottom: 32 + insets.bottom,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: step === 1 ? colors.primary : colors.success,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {step === 2 ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>1</Text>
                    )}
                  </View>
                  <Text style={{ marginTop: 6, color: colors.text, fontSize: 12, fontWeight: '600' }}>
                    {t('details')}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: step === 2 ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: step === 2 ? '#FFFFFF' : colors.textMuted, fontWeight: '700' }}>2</Text>
                  </View>
                  <Text style={{ marginTop: 6, color: colors.text, fontSize: 12, fontWeight: '600' }}>
                    {t('faceSetup')}
                  </Text>
                </View>
              </View>

              {step === 1 ? (
                <>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
                    {t('register')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 6,
                      marginBottom: 28,
                    }}
                  >
                    {t('setUpYourStudentAccount')}
                  </Text>

                  {renderField('fullName', t('fullName'), 'person-outline')}
                  {renderField('matricule', t('matriculeNumber'), 'card-outline', {
                    placeholder: t('matriculeExample'),
                  })}
                  {renderField('email', t('emailAddress'), 'mail-outline', {
                    keyboardType: 'email-address',
                    autoCapitalize: 'none',
                  })}
                  {renderField('phone', t('phoneNumber'), 'call-outline', {
                    placeholder: '',
                    keyboardType: 'phone-pad',
                    autoCapitalize: 'none',
                  })}
                  {renderField('password', t('password'), 'lock-closed-outline', {
                    secureTextEntry: !showPassword,
                    autoCapitalize: 'none',
                    rightAction: eyeToggle(showPassword, () => setShowPassword((c) => !c)),
                  })}

                  <View
                    style={{
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: colors.border,
                      overflow: 'hidden',
                      marginTop: -4,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: passwordStrength.width as any,
                        height: '100%',
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </View>
                  <Text style={{ color: passwordStrength.color, fontSize: 12, marginBottom: 8 }}>
                    {t(passwordStrength.key)}
                  </Text>

                  {renderField('confirmPassword', t('confirmPassword'), 'lock-closed-outline', {
                    secureTextEntry: !showConfirmPassword,
                    autoCapitalize: 'none',
                    rightAction: eyeToggle(showConfirmPassword, () => setShowConfirmPassword((c) => !c)),
                  })}

                  {error ? (
                    <View
                      style={{
                        backgroundColor: colors.dangerLight,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="warning-outline" size={20} color={colors.danger} />
                      <Text style={{ flex: 1, color: colors.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleNextStep}
                    disabled={!canProceedStep1}
                    activeOpacity={0.85}
                    style={{ marginTop: 8 }}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        height: 54,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: canProceedStep1 ? 1 : 0.5,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                        {t('nextStep')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      navigation.navigate('Login' as never);
                    }}
                    style={{ alignItems: 'center', marginTop: 20 }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                      {t('alreadyHaveAccount')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
                    {t('faceRegistration')}
                  </Text>
                  <View
                    style={{
                      marginTop: 16,
                      marginBottom: 20,
                      backgroundColor: colors.primaryLight,
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <Text style={[styles.muted, { color: colors.text }]}>
                      {'•'} {t('lookDirectlyAtCamera')}
                    </Text>
                    <Text style={[styles.muted, { color: colors.text, marginTop: 4 }]}>
                      {'•'} {t('goodLighting')}
                    </Text>
                    <Text style={[styles.muted, { color: colors.text, marginTop: 4 }]}>
                      {'•'} {t('noSunglasses')}
                    </Text>
                    <Text style={[styles.muted, { color: colors.text, marginTop: 4 }]}>
                      {'•'} {t('onlyYourFace')}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View
                      style={{
                        width: 240,
                        height: 240,
                        borderRadius: 120,
                        overflow: 'hidden',
                        backgroundColor: colors.background,
                        borderWidth: 6,
                        borderColor: colors.primaryLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {capturedFace ? (
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${capturedFace.base64}` }}
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : hasCameraPermission === false ? (
                        <Text
                          style={{
                            color: colors.textSecondary,
                            textAlign: 'center',
                            paddingHorizontal: 24,
                          }}
                        >
                          {t('cameraAccessIsRequiredForFaceCapture')}
                        </Text>
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}>
                          <Camera
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            type={(Camera.Constants.Type as any).front}
                          />
                        </View>
                      )}
                    </View>

                    {capturedFace ? (
                      <TouchableOpacity
                        onPress={() => {
                          hapticLight();
                          setCapturedFace(null);
                        }}
                        style={{
                          height: 48,
                          paddingHorizontal: 18,
                          borderRadius: 14,
                          backgroundColor: colors.inputBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: colors.border,
                          marginTop: 16,
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('retake')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {!capturedFace ? (
                    <TouchableOpacity
                      onPress={handleCapture}
                      activeOpacity={0.85}
                      style={{ marginBottom: 12 }}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          height: 54,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                          {t('takePhoto')}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}

                  {error ? (
                    <View
                      style={{
                        backgroundColor: colors.dangerLight,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="warning-outline" size={20} color={colors.danger} />
                      <Text style={{ flex: 1, color: colors.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => handleSubmit(false)}
                    disabled={false}
                    activeOpacity={0.85}
                    style={{ marginBottom: 12 }}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        height: 54,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 1,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                        {t('completeRegistration')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSubmit(true)}
                    activeOpacity={0.85}
                    style={{
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                      {t('skipForNow')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setStep(1);
                    }}
                    style={{ alignItems: 'center', marginTop: 20 }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                      {t('back')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loadingStage ? (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
              }}
            >
              {t(loadingStage)}
            </Text>
          </View>
        </View>
      ) : null}

      {showToast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              backgroundColor: colors.success,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              ...colors.shadowLg,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default RegisterScreen;
