import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../api';
import { useTranslation } from '../../hooks/useTranslation';
import { RootState } from '../../store';
import { setLanguage } from '../../store/slices/langSlice';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';

type ThemeColors = ReturnType<typeof useTheme>['colors'] & Record<string, string>;
type ThemeMode = 'light' | 'dark';
type CameraMode = 'face' | null;

const strengthForPassword = (password: string) => {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length < 8 || score <= 1) {
    return { key: 'weak' as const, width: '25%', color: '#DC2626' };
  }
  if (score === 2) {
    return { key: 'fair' as const, width: '50%', color: '#D97706' };
  }
  if (score === 3) {
    return { key: 'strong' as const, width: '75%', color: '#16A34A' };
  }
  return { key: 'veryStrong' as const, width: '100%', color: '#166534' };
};

const SettingsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme() as { colors: ThemeColors };
  const { t, lang } = useTranslation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const cameraRef = useRef<Camera | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    master: true,
    sessionAnnouncements: true,
    attendanceWarnings: true,
    checkinConfirmations: true,
    weeklySummary: false,
  });
  const [notificationLoaded, setNotificationLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const localeLabel = lang === 'fr' ? 'Français' : 'English';
  const strength = useMemo(
    () => strengthForPassword(passwordValues.newPassword),
    [passwordValues.newPassword]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToastVisible(false), 1800);
  };

  useEffect(() => {
    if (toastVisible) {
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [toastVisible, toastAnim]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadPermission = async () => {
      const permission = await Camera.requestCameraPermissionsAsync();
      if (active) {
        setCameraPermission(permission.status === 'granted');
      }
    };

    const loadNotificationPrefs = async () => {
      try {
        setNotificationLoaded(false);
        setNotificationPrefs((current) => ({ ...current }));
      } finally {
        if (active) {
          setNotificationLoaded(true);
        }
      }
    };

    loadPermission();
    loadNotificationPrefs();

    return () => {
      active = false;
    };
  }, []);

  const handleThemeToggle = async () => {
    dispatch(toggleTheme());
    try {
      await AsyncStorage.setItem('sas_theme', themeMode === 'light' ? 'dark' : 'light');
    } catch {
      // listener persists as fallback
    }
  };

  const handleLanguageSelect = async (value: 'en' | 'fr') => {
    dispatch(setLanguage(value));
    await AsyncStorage.setItem('sas_lang', value);
    setLanguageModalOpen(false);
  };

  const handleSaveNotificationPrefs = async () => {
    try {
      setNotificationSaving(true);
      await usersApi.updateNotificationPreferences(notificationPrefs);
      showToast(t('success'));
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setNotificationSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const currentPassword = passwordValues.currentPassword.trim();
    const newPassword = passwordValues.newPassword;
    const confirmPassword = passwordValues.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('required'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }

    try {
      setPasswordError('');
      setPasswordSaving(true);
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordSheetOpen(false);
      setPasswordValues({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showToast(t('passwordUpdatedSuccessfully'));
    } catch (error: any) {
      setPasswordError(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleFaceCapture = async (base64: string) => {
    if (!base64) {
      return;
    }

    setCameraBusy(true);
    try {
      await usersApi.updateFace({ face_image_base64: base64 });
      showToast(t('faceUpdatedSuccessfully'));
      setCameraMode(null);
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setCameraBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          await dispatch(logout() as any);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const openAboutLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast(t('somethingWentWrong'));
    }
  };

  const renderSection = (title: string, children: React.ReactNode, danger = false) => (
    <View
      style={{
        backgroundColor: danger ? colors.dangerBg : colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: danger ? colors.danger : colors.border,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          color: danger ? colors.danger : colors.text,
          fontSize: 17,
          fontWeight: '800',
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const toggleRow = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    value: boolean,
    onValueChange: (nextValue: boolean) => void,
    disabled = false
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: 12 }}>
          {label}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 18,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800' }}>{t('settings')}</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {renderSection(
          t('appearance'),
          <>
            <TouchableOpacity
              onPress={handleThemeToggle}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="moon-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: 12 }}>
                  {t('darkMode')}
                </Text>
              </View>
              <Ionicons
                name={themeMode === 'dark' ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={themeMode === 'dark' ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguageModalOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="globe-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: 12 }}>
                  {t('language')}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '700' }}>{localeLabel}</Text>
            </TouchableOpacity>
          </>
        )}

        {renderSection(
          t('pushNotifications'),
          <>
            {toggleRow(t('pushNotifications'), 'notifications-outline', notificationPrefs.master, (next) =>
              setNotificationPrefs((current) => ({ ...current, master: next }))
            )}
            {toggleRow(t('sessionAnnouncements'), 'megaphone-outline', notificationPrefs.sessionAnnouncements, (next) =>
              setNotificationPrefs((current) => ({ ...current, sessionAnnouncements: next }))
            )}
            {toggleRow(t('attendanceWarnings'), 'alert-circle-outline', notificationPrefs.attendanceWarnings, (next) =>
              setNotificationPrefs((current) => ({ ...current, attendanceWarnings: next }))
            )}
            {toggleRow(t('checkinConfirmations'), 'checkmark-circle-outline', notificationPrefs.checkinConfirmations, (next) =>
              setNotificationPrefs((current) => ({ ...current, checkinConfirmations: next }))
            )}
            {toggleRow(t('weeklySummary'), 'calendar-outline', notificationPrefs.weeklySummary, (next) =>
              setNotificationPrefs((current) => ({ ...current, weeklySummary: next }))
            )}
            <TouchableOpacity
              onPress={handleSaveNotificationPrefs}
              disabled={notificationSaving || !notificationLoaded}
              style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 12,
                opacity: notificationLoaded ? 1 : 0.7,
              }}
            >
              {notificationSaving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '800' }}>
                  {t('save')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {renderSection(
          t('account'),
          <>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  currentUser?.role === 'LECTURER' ? 'LecturerTabs' : 'StudentTabs',
                  {
                    screen: currentUser?.role === 'LECTURER' ? 'LecturerProfile' : 'ProfileTab',
                  } as never
                )
              }
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                {t('editProfile')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPasswordSheetOpen(true)}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                {t('changePassword')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCameraMode('face')}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                {t('updateFace')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {renderSection(
          t('about'),
          <>
            <View style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{t('appVersion')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>1.0.0</Text>
            </View>
            <TouchableOpacity
              onPress={() => openAboutLink('https://example.com/privacy')}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{t('privacyPolicy')}</Text>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openAboutLink('https://example.com/terms')}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{t('termsOfService')}</Text>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:support@example.com')}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{t('sendFeedback')}</Text>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {renderSection(
          'Danger Zone',
          <>
            <TouchableOpacity onPress={handleSignOut} style={{ paddingVertical: 12 }}>
              <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '800' }}>{t('signOut')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteAccount} style={{ paddingVertical: 12 }}>
              <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '800' }}>
                {t('deleteAccount')}
              </Text>
            </TouchableOpacity>
          </>,
          true
        )}
      </ScrollView>

      <Modal
        visible={languageModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 44, height: 5, borderRadius: 99, backgroundColor: colors.border }} />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 }}>
              {t('selectLanguage')}
            </Text>
            {[
              { value: 'en', label: 'English', flag: '🇬🇧' },
              { value: 'fr', label: 'Français', flag: '🇫🇷' },
            ].map((item) => {
              const selected = lang === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => handleLanguageSelect(item.value as 'en' | 'fr')}
                  style={{
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: 12 }}>
                      {item.label}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordSheetOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                maxHeight: '88%',
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <View style={{ width: 44, height: 5, borderRadius: 99, backgroundColor: colors.border }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
                  {t('changePassword')}
                </Text>
                <TouchableOpacity onPress={() => setPasswordSheetOpen(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {passwordError ? (
                <View
                  style={{
                    backgroundColor: colors.dangerBg,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.danger,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>{passwordError}</Text>
                </View>
              ) : null}

              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  {t('currentPassword')}
                </Text>
                <TextInput
                  value={passwordValues.currentPassword}
                  onChangeText={(text) =>
                    setPasswordValues((current) => ({ ...current, currentPassword: text }))
                  }
                  placeholder={t('currentPassword')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={{
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontSize: 15,
                    paddingHorizontal: 14,
                  }}
                />
              </View>

              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  {t('newPassword')}
                </Text>
                <View
                  style={{
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                  }}
                >
                  <TextInput
                    value={passwordValues.newPassword}
                    onChangeText={(text) => {
                      setPasswordValues((current) => ({ ...current, newPassword: text }));
                      if (passwordError) {
                        setPasswordError('');
                      }
                    }}
                    placeholder={t('newPassword')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    style={{ flex: 1, color: colors.text, fontSize: 15 }}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword((current) => !current)}>
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: colors.border,
                    overflow: 'hidden',
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: strength.width as any,
                      height: '100%',
                      backgroundColor: strength.color,
                    }}
                  />
                </View>
                <Text style={{ color: strength.color, fontSize: 12, marginTop: 6 }}>
                  {t(strength.key)}
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  {t('confirmPassword')}
                </Text>
                <View
                  style={{
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                  }}
                >
                  <TextInput
                    value={passwordValues.confirmPassword}
                    onChangeText={(text) =>
                      setPasswordValues((current) => ({ ...current, confirmPassword: text }))
                    }
                    placeholder={t('confirmPassword')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    style={{ flex: 1, color: colors.text, fontSize: 15 }}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((current) => !current)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handlePasswordUpdate}
                disabled={passwordSaving}
                style={{
                  height: 54,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: passwordSaving ? 0.85 : 1,
                }}
              >
                {passwordSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 16, fontWeight: '800' }}>
                    {t('updatePassword')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={cameraMode !== null} animationType="slide" onRequestClose={() => setCameraMode(null)}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: '800' }}>
              {t('updateFace')}
            </Text>
            <TouchableOpacity onPress={() => setCameraMode(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            {cameraPermission === false ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ color: colors.white, textAlign: 'center' }}>
                  {t('cameraAccessIsRequiredForFaceCapture')}
                </Text>
              </View>
            ) : (
              <Camera
                ref={cameraRef}
                style={{ flex: 1 }}
                type={'front' as any}
                onCameraReady={() => setCameraBusy(false)}
              />
            )}
          </View>
          <View style={{ padding: 16, backgroundColor: '#000000' }}>
            <TouchableOpacity
              onPress={async () => {
                if (!cameraRef.current || cameraPermission !== true) {
                  return;
                }
                setCameraBusy(true);
                try {
                  const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
                  if (photo.base64) {
                    await handleFaceCapture(photo.base64);
                  }
                } finally {
                  setCameraBusy(false);
                }
              }}
              style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cameraBusy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '800' }}>
                  {t('capture')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toastVisible ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 20,
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <View style={{ backgroundColor: colors.success, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.white, textAlign: 'center', fontWeight: '700' }}>{toastMessage}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default SettingsScreen;
