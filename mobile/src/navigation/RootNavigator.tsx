import React, { useMemo } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import StudentTabs from './StudentTabs';
import LecturerTabs from './LecturerTabs';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import FirstLoginScreen from '../screens/Auth/FirstLoginScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import { lightColors, darkColors } from '../theme/colors';
import { RootState } from '../store';

// Build a react-navigation theme from the shared design tokens, preserving the
// legacy alias keys that older screens (e.g. SettingsScreen) still reference, so
// navigation-theme screens and useTheme() screens share one palette.
const buildTheme = (mode: 'light' | 'dark') => {
  const c = mode === 'dark' ? darkColors : lightColors;
  return {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.text,
      border: c.border,
      notification: c.primary,
      // aliases used by legacy screens
      white: '#FFFFFF',
      surface: c.card,
      surfaceAlt: c.cardSecondary,
      backgroundAlt: c.backgroundSecondary,
      textPrimary: c.text,
      textSecondary: c.textSecondary,
      textMuted: c.textMuted,
      textOnPrimary: '#FFFFFF',
      inputBg: c.inputBg,
      borderLight: c.border,
      divider: c.border,
      primaryLight: c.primaryLight,
      primaryMid: c.primary,
      primaryDark: c.gradientEnd,
      success: c.success,
      warning: c.warning,
      danger: c.danger,
      atRisk: c.atRisk,
      successBg: c.successLight,
      warningBg: c.warningLight,
      dangerBg: c.dangerLight,
      atRiskBg: c.atRiskLight,
      overlay: c.overlay,
    },
  } as any;
};

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const appTheme = useMemo(() => buildTheme(themeMode), [themeMode]);

  return (
    <NavigationContainer theme={appTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
            <Stack.Screen name="FirstLoginScreen" component={FirstLoginScreen} />
          </>
        ) : user.first_login && user.role === 'LECTURER' ? (
          <Stack.Screen name="FirstLoginScreen" component={FirstLoginScreen} />
        ) : user.role === 'STUDENT' ? (
          <>
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
            <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="LecturerTabs" component={LecturerTabs} />
            <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
