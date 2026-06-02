import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, login } from '../../store/slices/authSlice';
import { RootState } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';

type AppColors = ReturnType<typeof useTheme>['colors'];

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
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
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
    },
    logoBox: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      ...colors.shadowLg,
    },
  });

const LoginScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const auth = useSelector((state: RootState) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    return () => {
      if (auth.error) {
        dispatch(clearError());
      }
    };
  }, [auth.error, dispatch]);

  const handleSubmit = async () => {
    hapticLight();
    if (!email.trim() || !password) {
      hapticError();
      Alert.alert(t('required'), t('enterEmailAndPassword'));
      return;
    }

    try {
      const result = await (dispatch as any)(login({ email, password })).unwrap();
      hapticSuccess();
      if (result.user?.first_login && result.user?.role === 'LECTURER') {
        navigation.navigate('FirstLoginScreen' as never);
      }
    } catch {
      hapticError();
      // Redux state already carries the error message for the red card.
    }
  };

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
                height: height * 0.55,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingTop: insets.top,
              }}
            >
              <View style={styles.logoBox}>
                <Image
                  source={require('../../../assets/full-logo.jpeg')}
                  style={{ width: 56, height: 56, resizeMode: 'contain', borderRadius: 16 }}
                />
              </View>
              <Text
                style={{
                  marginTop: 20,
                  fontSize: 26,
                  fontWeight: '800',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {t('appName')}
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
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
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
                {t('welcomeBack')}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 6,
                  marginBottom: 28,
                }}
              >
                {t('signInToContinue')}
              </Text>

              {auth.error ? (
                <View
                  style={{
                    backgroundColor: colors.dangerLight,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Ionicons name="warning-outline" size={20} color={colors.danger} />
                  <Text style={{ flex: 1, color: colors.danger, fontSize: 13, fontWeight: '600' }}>
                    {auth.error}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>{t('email')}</Text>
                <View
                  style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('email')}
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={styles.label}>{t('password')}</Text>
                <View
                  style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('password')}
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setShowPassword((current) => !current);
                    }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={auth.loading}
                activeOpacity={0.85}
                style={{ marginTop: 24 }}
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
                    opacity: auth.loading ? 0.85 : 1,
                  }}
                >
                  {auth.loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {t('signIn')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  navigation.navigate('RegisterScreen' as never);
                }}
                style={{ alignItems: 'center', marginTop: 24 }}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                  {t('register')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
