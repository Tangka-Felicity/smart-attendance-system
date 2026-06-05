import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi, courseApi, sessionApi, usersApi } from '../../api';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Divider } from '../../components';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';
import { RootState } from '../../store';
import { setAuthData } from '../../store/slices/authSlice';

type ProfileStats = {
  courses: number;
  sessions: number;
  attendance: number;
  mark: number;
  students: number;
  week: number;
};

type CameraMode = 'avatar' | 'face' | null;

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

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

const isThisWeek = (value?: string | Date | null) => {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
};

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.access_token);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarCameraRef = useRef<Camera | null>(null);
  const faceCameraRef = useRef<Camera | null>(null);

  const [profile, setProfile] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    role: currentUser?.role ?? 'STUDENT',
    avatar_base64: currentUser?.avatar_base64 ?? null,
    phone: currentUser?.phone ?? '',
    department: currentUser?.department ?? '',
    bio: currentUser?.bio ?? '',
    matricule: currentUser?.matricule ?? '',
    staff_id: currentUser?.staff_id ?? '',
    face_registered_at: currentUser?.face_registered_at ?? null,
    member_since: currentUser?.member_since ?? null,
  });
  const [stats, setStats] = useState<ProfileStats>({
    courses: 0,
    sessions: 0,
    attendance: 0,
    mark: 0,
    students: 0,
    week: 0,
  });
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: currentUser?.phone ?? '',
    department: currentUser?.department ?? '',
    bio: currentUser?.bio ?? '',
  });
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const isStudent = profile.role === 'STUDENT';
  const roleLabel = useMemo(() => {
    switch (profile.role) {
      case 'STUDENT':
        return t('student');
      case 'LECTURER':
        return t('lecturer');
      case 'COORDINATOR':
        return t('coordinator');
      case 'SUPER_ADMIN':
        return t('superAdmin');
      default:
        return profile.role;
    }
  }, [profile.role, t]);

  const passwordStrength = useMemo(
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
    if (!currentUser) {
      return;
    }

    setProfile({
      name: currentUser.name ?? '',
      email: currentUser.email ?? '',
      role: currentUser.role ?? 'STUDENT',
      avatar_base64: currentUser.avatar_base64 ?? null,
      phone: currentUser.phone ?? '',
      department: currentUser.department ?? '',
      bio: currentUser.bio ?? '',
      matricule: currentUser.matricule ?? '',
      staff_id: currentUser.staff_id ?? '',
      face_registered_at: currentUser.face_registered_at ?? null,
      member_since: currentUser.member_since ?? null,
    });
    setProfileForm({
      phone: currentUser.phone ?? '',
      department: currentUser.department ?? '',
      bio: currentUser.bio ?? '',
    });
  }, [currentUser]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!currentUser?.user_id) {
        return;
      }

      try {
        const response = await usersApi.me();
        const data = response.data ?? {};
        if (!active) {
          return;
        }

        const mergedUser = {
          ...currentUser,
          name: data.name ?? currentUser.name,
          email: data.email ?? currentUser.email,
          role: data.role ?? currentUser.role,
          avatar_base64: data.avatar_base64 ?? currentUser.avatar_base64 ?? null,
          phone: data.phone ?? currentUser.phone ?? '',
          department: data.department ?? currentUser.department ?? '',
          bio: data.bio ?? currentUser.bio ?? '',
          matricule: data.matricule ?? currentUser.matricule ?? '',
          staff_id: data.staff_id ?? currentUser.staff_id ?? '',
          face_registered_at: data.face_registered_at ?? currentUser.face_registered_at ?? null,
          member_since: data.member_since ?? currentUser.member_since ?? null,
        };

        setProfile(mergedUser);
        setProfileForm({
          phone: mergedUser.phone ?? '',
          department: mergedUser.department ?? '',
          bio: mergedUser.bio ?? '',
        });
        dispatch(
          setAuthData({
            user: mergedUser,
            access_token: accessToken,
          })
        );
      } catch {
        if (!active) {
          return;
        }
        setProfile((current) => ({ ...current }));
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [accessToken, currentUser, dispatch]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      if (!currentUser?.user_id) {
        return;
      }

      try {
        if (currentUser.role === 'STUDENT') {
          const [analyticsResponse, coursesResponse] = await Promise.allSettled([
            analyticsApi.studentDashboard(currentUser.user_id),
            courseApi.list(),
          ]);

          if (!active) {
            return;
          }

          const analytics =
            analyticsResponse.status === 'fulfilled' ? analyticsResponse.value.data ?? {} : {};
          const courses =
            coursesResponse.status === 'fulfilled' ? coursesResponse.value.data ?? [] : [];

          setStats({
            courses: Array.isArray(courses) ? courses.length : 0,
            sessions: Number(analytics.sessions_attended ?? analytics.sessions ?? 0) || 0,
            attendance: Math.round(Number(analytics.cumulative_pct ?? 0) || 0),
            mark: Number((Number(analytics.cumulative_mark ?? 0) || 0).toFixed(1)),
            students: 0,
            week: 0,
          });
          return;
        }

        const [coursesResponse, sessionsResponse] = await Promise.allSettled([
          courseApi.list(),
          sessionApi.list(),
        ]);

        if (!active) {
          return;
        }

        const courses = coursesResponse.status === 'fulfilled' ? coursesResponse.value.data ?? [] : [];
        const sessions =
          sessionsResponse.status === 'fulfilled' ? sessionsResponse.value.data ?? [] : [];

        const studentBuckets = await Promise.all(
          (Array.isArray(courses) ? courses : []).map(async (course: any) => {
            try {
              const response = await courseApi.getStudents(
                String(course.course_id ?? course.id ?? course.courseId ?? '')
              );
              return response.data ?? [];
            } catch {
              return [];
            }
          })
        );

        const uniqueStudents = new Set<string>();
        studentBuckets.flat().forEach((entry: any) => {
          const studentId = entry?.student?.student_id ?? entry?.student_id ?? entry?.id;
          if (studentId) {
            uniqueStudents.add(String(studentId));
          }
        });

        setStats({
          courses: Array.isArray(courses) ? courses.length : 0,
          sessions: Array.isArray(sessions) ? sessions.length : 0,
          attendance: 0,
          mark: 0,
          students: uniqueStudents.size,
          week: Array.isArray(sessions)
            ? sessions.filter((session: any) =>
                isThisWeek(session.start_time ?? session.startTime ?? session.created_at)
              ).length
            : 0,
        });
      } catch {
        if (!active) {
          return;
        }
        setStats({
          courses: 0,
          sessions: 0,
          attendance: 0,
          mark: 0,
          students: 0,
          week: 0,
        });
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, [currentUser?.role, currentUser?.user_id]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!currentUser) {
      return;
    }

    try {
      setProfileError('');
      setSavingProfile(true);
      const response = await usersApi.updateMe({
        phone: profileForm.phone.trim() || undefined,
        department: profileForm.department.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
      });
      const data = response.data ?? {};

      const updatedUser = {
        ...currentUser,
        name: data.name ?? profile.name,
        email: data.email ?? profile.email,
        role: data.role ?? profile.role,
        avatar_base64: data.avatar_base64 ?? profile.avatar_base64 ?? null,
        phone: data.phone ?? profileForm.phone.trim(),
        department: data.department ?? profileForm.department.trim(),
        bio: data.bio ?? profileForm.bio.trim(),
        matricule: data.matricule ?? profile.matricule,
        staff_id: data.staff_id ?? profile.staff_id,
        face_registered_at: data.face_registered_at ?? profile.face_registered_at,
        member_since: data.member_since ?? profile.member_since,
      };

      setProfile((current) => ({
        ...current,
        ...updatedUser,
      }));
      dispatch(
        setAuthData({
          user: updatedUser,
          access_token: accessToken,
        })
      );
      setEditMode(false);
      hapticSuccess();
      showToast(t('profileUpdatedSuccessfully'));
    } catch (error: any) {
      hapticError();
      setProfileError(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setSavingProfile(false);
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
      hapticSuccess();
      showToast(t('passwordUpdatedSuccessfully'));
    } catch (error: any) {
      hapticError();
      setPasswordError(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarCapture = async (base64: string) => {
    if (!base64) {
      return;
    }

    setCameraMode(null);
    setAvatarSaving(true);
    setProfile((current) => ({ ...current, avatar_base64: base64 }));
    if (currentUser) {
      dispatch(
        setAuthData({
          user: { ...currentUser, avatar_base64: base64 },
          access_token: accessToken,
        })
      );
    }

    try {
      await usersApi.updateAvatar({ avatar_base64: base64 });
      hapticSuccess();
      showToast(t('avatarUpdatedSuccessfully'));
    } catch (error: any) {
      hapticError();
      showToast(error?.response?.data?.detail || error?.message || t('somethingWentWrong'));
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleFaceCapture = async (base64: string) => {
    if (!base64) {
      return;
    }

    setCameraLoading(true);
    try {
      await usersApi.updateFace({ face_image_base64: base64 });
      setCameraMode(null);
      setProfile((current) => ({
        ...current,
        face_registered_at: new Date().toISOString(),
      }));
      hapticSuccess();
      showToast(t('faceUpdatedSuccessfully'));
    } catch (error: any) {
      hapticError();
      const detail = error?.response?.data?.detail || error?.message || t('somethingWentWrong');
      showToast(detail);
    } finally {
      setCameraLoading(false);
    }
  };

  const infoRow = (label: string, value: string, isLast = false) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text
        style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 }}
        numberOfLines={2}
      >
        {value || t('notAvailable')}
      </Text>
    </View>
  );

  const editableField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      multiline?: boolean;
      height?: number;
    }
  ) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.placeholder}
        multiline={options?.multiline}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          color: colors.text,
          fontSize: 15,
          paddingHorizontal: 14,
          paddingVertical: options?.multiline ? 12 : 0,
          minHeight: options?.height ?? 52,
          textAlignVertical: options?.multiline ? 'top' : 'center',
        }}
      />
    </View>
  );

  const statLabels = isStudent
    ? [t('courses'), t('sessions'), `${t('attendancePercent')}%`, t('markOutOf10')]
    : [t('courses'), t('sessions'), t('students'), t('week')];

  const statValues = isStudent
    ? [stats.courses, stats.sessions, `${stats.attendance}%`, stats.mark]
    : [stats.courses, stats.sessions, stats.students, stats.week];

  const memberSinceLabel = profile.member_since ? formatDate(profile.member_since, locale) : '';
  const faceDateLabel = profile.face_registered_at ? formatDate(profile.face_registered_at, locale) : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={colors.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 36,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              navigation.navigate('SettingsScreen' as never);
            }}
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="settings-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                ...colors.shadowLg,
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 42,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {profile.avatar_base64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${profile.avatar_base64}` }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <LinearGradient
                    colors={colors.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800' }}>
                      {getInitials(profile.name)}
                    </Text>
                  </LinearGradient>
                )}

                {avatarSaving ? (
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: 'rgba(15,23,42,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setCameraMode('avatar');
                }}
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}
              >
                <Ionicons name="camera" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                marginTop: 14,
                fontSize: 20,
                fontWeight: '700',
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              {profile.name || t('unknown')}
            </Text>

            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{roleLabel}</Text>
            </View>

            <Text
              style={{
                marginTop: 8,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
              }}
            >
              {profile.email}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.15)',
              marginTop: 16,
              borderRadius: 16,
              padding: 16,
            }}
          >
            {statLabels.map((label, index) => (
              <React.Fragment key={label}>
                {index > 0 ? (
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                ) : null}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
                    {statValues[index]}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      marginTop: 4,
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -20,
            paddingHorizontal: 16,
            paddingTop: 20,
          }}
        >
          <View
            style={{
              borderRadius: 16,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{t('personalInfo')}</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setEditMode((current) => !current);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Divider style={{ marginTop: 12 }} />

            {profileError ? (
              <View
                style={{
                  backgroundColor: colors.dangerLight,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.danger,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 14,
                }}
              >
                <Text style={{ color: colors.danger, fontWeight: '700' }}>{profileError}</Text>
              </View>
            ) : null}

            {infoRow(t('fullName'), profile.name)}
            {infoRow(isStudent ? t('matricule') : t('staffId'), profile.matricule || profile.staff_id || '')}
            {infoRow(t('email'), profile.email)}

            {editMode ? (
              <View style={{ marginTop: 14 }}>
                {editableField(t('phone'), profileForm.phone, (text) =>
                  setProfileForm((current) => ({ ...current, phone: text }))
                )}
                {editableField(t('department'), profileForm.department, (text) =>
                  setProfileForm((current) => ({ ...current, department: text }))
                )}
                {editableField(
                  t('bio'),
                  profileForm.bio,
                  (text) => setProfileForm((current) => ({ ...current, bio: text })),
                  { multiline: true, height: 92 }
                )}
              </View>
            ) : (
              <>
                {infoRow(t('phone'), profile.phone || '')}
                {infoRow(t('department'), profile.department || '')}
                {infoRow(t('bio'), profile.bio || '', !memberSinceLabel)}
              </>
            )}

            {!editMode && memberSinceLabel ? infoRow(t('memberSince'), memberSinceLabel, true) : null}

            {editMode ? (
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    opacity: savingProfile ? 0.8 : 1,
                  }}
                >
                  {savingProfile ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {t('save')}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setEditMode(false);
                    setProfileForm({
                      phone: profile.phone ?? '',
                      department: profile.department ?? '',
                      bio: profile.bio ?? '',
                    });
                    setProfileError('');
                  }}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View
            style={{
              borderRadius: 16,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                {t('faceRegistration')}
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: profile.face_registered_at ? colors.successLight : colors.dangerLight,
                }}
              >
                <Text
                  style={{
                    color: profile.face_registered_at ? colors.success : colors.danger,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {profile.face_registered_at ? t('faceRegistered') : t('faceNotRegistered')}
                </Text>
              </View>
            </View>

            <Divider style={{ marginTop: 12, marginBottom: 14 }} />

            {faceDateLabel ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 14 }}>
                {t('registeredOn')}: {faceDateLabel}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setCameraMode('face');
              }}
              style={{
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                {t('updateFace')}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              borderRadius: 16,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setPasswordSheetOpen(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 12 }}>
                  {t('changePassword')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              navigation.navigate('SettingsScreen' as never);
            }}
            style={{
              borderRadius: 16,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 12 }}>
                  {t('settings')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={cameraMode !== null} animationType="slide" onRequestClose={() => setCameraMode(null)}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#000000',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
              {cameraMode === 'avatar' ? t('updateAvatar') : t('updateFace')}
            </Text>
            <TouchableOpacity onPress={() => setCameraMode(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            {cameraMode ? (
              <ProfileCameraPreview
                mode={cameraMode}
                avatarCameraRef={avatarCameraRef}
                faceCameraRef={faceCameraRef}
                onCapture={cameraMode === 'avatar' ? handleAvatarCapture : handleFaceCapture}
                onBusyChange={setCameraLoading}
              />
            ) : null}
          </View>

          <View style={{ padding: 16, backgroundColor: '#000000' }}>
            {cameraLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const cameraRef = cameraMode === 'avatar' ? avatarCameraRef : faceCameraRef;
                  if (!cameraRef.current) {
                    return;
                  }

                  setCameraLoading(true);
                  cameraRef.current
                    .takePictureAsync({ quality: 0.8, base64: true })
                    .then((photo) => {
                      if (photo.base64) {
                        return cameraMode === 'avatar'
                          ? handleAvatarCapture(photo.base64)
                          : handleFaceCapture(photo.base64);
                      }
                      setCameraLoading(false);
                      return undefined;
                    })
                    .catch(() => {
                      setCameraLoading(false);
                    })
                    .finally(() => {
                      setCameraLoading(false);
                    });
                }}
                style={{
                  height: 54,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  {t('capture')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordSheetOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
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
                <View
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 99,
                    backgroundColor: colors.border,
                  }}
                />
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
                    backgroundColor: colors.dangerLight,
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
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
                  {t('currentPassword')}
                </Text>
                <TextInput
                  value={passwordValues.currentPassword}
                  onChangeText={(text) =>
                    setPasswordValues((current) => ({ ...current, currentPassword: text }))
                  }
                  placeholder={t('currentPassword')}
                  placeholderTextColor={colors.placeholder}
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
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
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
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 15,
                    }}
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
                      width: passwordStrength.width as any,
                      height: '100%',
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </View>
                <Text style={{ color: passwordStrength.color, fontSize: 12, marginTop: 6 }}>
                  {t(passwordStrength.key)}
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
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
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 15,
                    }}
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
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                    {t('updatePassword')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
          <View
            style={{
              backgroundColor: colors.success,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

type ProfileCameraPreviewProps = {
  mode: 'avatar' | 'face';
  avatarCameraRef: React.MutableRefObject<Camera | null>;
  faceCameraRef: React.MutableRefObject<Camera | null>;
  onCapture: (base64: string) => Promise<void> | void;
  onBusyChange: (busy: boolean) => void;
};

const ProfileCameraPreview = ({
  mode,
  avatarCameraRef,
  faceCameraRef,
  onBusyChange,
}: ProfileCameraPreviewProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const cameraRef = mode === 'avatar' ? avatarCameraRef : faceCameraRef;
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const requestPermission = async () => {
      const permission = await Camera.requestCameraPermissionsAsync();
      if (active) {
        setPermissionGranted(permission.status === 'granted');
      }
    };

    requestPermission();

    return () => {
      active = false;
    };
  }, [mode]);

  if (permissionGranted === false) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FFFFFF', textAlign: 'center', marginBottom: 16 }}>
          {t('cameraAccessIsRequiredForFaceCapture')}
        </Text>
      </View>
    );
  }

  if (permissionGranted !== true) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Camera
      ref={cameraRef}
      style={{ flex: 1 }}
      type={'front' as any}
      onCameraReady={() => onBusyChange(false)}
    />
  );
};

export default ProfileScreen;
