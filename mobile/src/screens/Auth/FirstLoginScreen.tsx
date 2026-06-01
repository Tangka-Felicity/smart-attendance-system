import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../../api';
import { RootState } from '../../store';
import { setAuthData } from '../../store/slices/authSlice';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';

type AppColors = ReturnType<typeof useTheme>['colors'];

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

const FirstLoginScreen = () => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const currentAccessToken = useSelector((state: RootState) => state.auth.access_token);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [focusedField, setFocusedField] = useState<'new' | 'confirm' | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inputWrap: {
          marginBottom: 16,
        },
        label: {
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
      }),
    [colors]
  );

  const strength = useMemo(() => strengthForPassword(newPassword, colors), [newPassword, colors]);
  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword && !loading;

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

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    hapticLight();
    if (!newPassword || !confirmPassword) {
      hapticError();
      setError(t('required'));
      return;
    }
    if (newPassword.length < 8) {
      hapticError();
      setError(t('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      hapticError();
      setError(t('passwordMismatch'));
      return;
    }

    try {
      setError('');
      setLoading(true);

      await authApi.firstLoginChangePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setLoading(false);
      hapticSuccess();
      setToastMessage(t('passwordUpdatedSuccessfully'));
      setShowToast(true);

      toastTimer.current = setTimeout(() => {
        const nextUser = currentUser ? { ...currentUser, first_login: false } : currentUser;
        if (nextUser) {
          dispatch(setAuthData({ user: nextUser, access_token: currentAccessToken }));
        }
      }, 900);
    } catch (submitError: any) {
      setLoading(false);
      hapticError();
      setShowToast(false);
      setToastMessage('');
      setError(submitError?.response?.data?.detail || submitError?.message || t('somethingWentWrong'));
    }
  };

  const userName = currentUser?.name || '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 32,
                ...colors.shadowLg,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="key-outline" size={40} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                  {t('welcomeWithName').replace('{name}', userName)}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  {t('firstLoginMessage')}
                </Text>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>{t('newPassword')}</Text>
                <View style={[styles.inputRow, focusedField === 'new' && styles.inputRowFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder={t('newPassword')}
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('new')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setShowNewPassword((current) => !current);
                    }}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: colors.border,
                    overflow: 'hidden',
                    marginTop: 10,
                  }}
                >
                  <View style={{ width: strength.width, height: '100%', backgroundColor: strength.color }} />
                </View>
                <Text style={{ color: strength.color, fontSize: 12, marginTop: 6 }}>{t(strength.key)}</Text>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>{t('confirmPassword')}</Text>
                <View style={[styles.inputRow, focusedField === 'confirm' && styles.inputRowFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder={t('confirmPassword')}
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setShowConfirmPassword((current) => !current);
                    }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

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
                onPress={handleSubmit}
                disabled={!canSubmit || showToast}
                activeOpacity={0.85}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 54,
                    width: '100%',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: canSubmit && !showToast ? 1 : 0.6,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {t('setPassword')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

export default FirstLoginScreen;
