import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../hooks/useTheme';
import type { AppColors } from '../theme/colors';

/* ----------------------------------------------------------------
   Button
-----------------------------------------------------------------*/
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  gradient = false,
  style,
}) => {
  const { colors } = useTheme();
  const base: ViewStyle = {
    height: 54,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: fullWidth ? '100%' : 'auto',
  };

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'outline' || variant === 'ghost'
      ? colors.primary
      : colors.text;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <>
          {icon && <View style={{ marginRight: Spacing.sm }}>{icon}</View>}
          <Text style={{ ...Typography.button, fontSize: 16, fontWeight: '700', color: textColor }}>{title}</Text>
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={[{ width: fullWidth ? '100%' : 'auto' }, style]}>
        <LinearGradient
          colors={[colors.primary, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={base}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const bg =
    variant === 'primary'
      ? disabled ? colors.border : colors.primary
      : variant === 'danger'
      ? disabled ? colors.border : colors.danger
      : 'transparent';

  return (
    <TouchableOpacity
      style={[
        base,
        { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1.5, borderColor: disabled ? colors.border : colors.primary },
        (disabled || loading) && { opacity: 0.7 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {content}
    </TouchableOpacity>
  );
};

/* ----------------------------------------------------------------
   Input
-----------------------------------------------------------------*/
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  style?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  style,
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View>
      {label && <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          borderWidth: 1.5,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          gap: 12,
          backgroundColor: colors.inputBg,
          height: multiline ? undefined : 52,
          paddingVertical: multiline ? 12 : 0,
          ...(focused ? { shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 1 } : {}),
        }}
      >
        {leftIcon}
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.placeholder}
          style={[{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: multiline ? 0 : 14 }, style]}
        />
        {rightIcon}
      </View>
      {error && <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{error}</Text>}
    </View>
  );
};

/* ----------------------------------------------------------------
   Card
-----------------------------------------------------------------*/
interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, elevated = false, onPress, style }) => {
  const { colors } = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.lg,
    ...(elevated ? colors.shadow : {}),
  };
  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
};

/* ----------------------------------------------------------------
   Badge
-----------------------------------------------------------------*/
interface BadgeProps {
  label: string;
  variant?: 'good' | 'warning' | 'atRisk' | 'critical' | 'primary' | 'purple' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style }) => {
  const { colors } = useTheme();
  const map: Record<string, { bg: string; text: string }> = {
    good: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    atRisk: { bg: colors.atRiskLight, text: colors.atRisk },
    critical: { bg: colors.dangerLight, text: colors.danger },
    primary: { bg: colors.primaryLight, text: colors.primary },
    purple: { bg: colors.purpleLight, text: colors.purple },
    neutral: { bg: colors.cardSecondary, text: colors.textSecondary },
  };
  const { bg, text } = map[variant] || map.primary;
  return (
    <View style={[{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>{label}</Text>
    </View>
  );
};

/* ----------------------------------------------------------------
   GradientHeader — premium curved gradient header used app-wide
-----------------------------------------------------------------*/
interface GradientHeaderProps {
  children: React.ReactNode;
  paddingTop?: number;
  style?: ViewStyle;
  rounded?: boolean;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({ children, paddingTop = 16, style, rounded = false }) => {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={colors.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          paddingTop,
          paddingBottom: 28,
          paddingHorizontal: 20,
          ...(rounded ? { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 } : {}),
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
};

/* ----------------------------------------------------------------
   ThemedScreen — SafeAreaView + themed StatusBar
-----------------------------------------------------------------*/
interface ThemedScreenProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  background?: string;
  style?: ViewStyle;
}

export const ThemedScreen: React.FC<ThemedScreenProps> = ({ children, edges, background, style }) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: background ?? colors.background }, style]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />
      {children}
    </SafeAreaView>
  );
};

/* ----------------------------------------------------------------
   ProgressBar
-----------------------------------------------------------------*/
interface ProgressBarProps {
  percentage: number;
  height?: number;
  trackColor?: string;
  fillColors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, height = 8, trackColor, fillColors, style }) => {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, percentage));
  const fill: readonly [string, string, ...string[]] = fillColors ?? [colors.primary, colors.gradientEnd];
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.border, overflow: 'hidden' }, style]}>
      <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${clamped}%`, height: '100%', borderRadius: height / 2 }} />
    </View>
  );
};

/* ----------------------------------------------------------------
   EmptyState
-----------------------------------------------------------------*/
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
      {icon}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>{subtitle}</Text>}
      {action && <View style={{ marginTop: 20 }}>{action}</View>}
    </View>
  );
};

/* ----------------------------------------------------------------
   ScreenHeader (legacy API kept; now theme-aware + gradient option)
-----------------------------------------------------------------*/
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'light' | 'blue';
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, variant = 'light', rightAction, leftAction }) => {
  const { colors } = useTheme();
  const isBlue = variant === 'blue';
  const body = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg }}>
      {leftAction && <View style={{ marginRight: 12 }}>{leftAction}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: isBlue ? '#fff' : colors.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: isBlue ? 'rgba(255,255,255,0.75)' : colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {rightAction && <View>{rightAction}</View>}
    </View>
  );
  if (isBlue) {
    return (
      <LinearGradient colors={colors.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: Platform.OS === 'ios' ? 8 : 16 }}>
        {body}
      </LinearGradient>
    );
  }
  return <View style={{ backgroundColor: colors.card }}>{body}</View>;
};

/* ----------------------------------------------------------------
   Divider / LoadingOverlay
-----------------------------------------------------------------*/
export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
};

export const LoadingOverlay: React.FC<{ visible: boolean; message?: string }> = ({ visible, message = 'Loading...' }) => {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
      <View style={{ backgroundColor: colors.card, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', ...colors.shadowLg }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 15, color: colors.text, marginTop: Spacing.lg }}>{message}</Text>
      </View>
    </View>
  );
};

/* ----------------------------------------------------------------
   StepIndicator (check-in flow) — theme-aware
-----------------------------------------------------------------*/
interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  labels?: [string, string, string];
  onLight?: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, labels = ['QR', 'Face', 'Done'], onLight }) => {
  const { colors } = useTheme();
  const upcomingColor = onLight ? colors.border : 'rgba(255,255,255,0.3)';
  const upcomingText = onLight ? colors.textMuted : 'rgba(255,255,255,0.5)';
  const activeText = onLight ? colors.text : '#fff';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: 8 }}>
      {labels.map((label, index) => {
        const done = index + 1 < currentStep;
        const active = index + 1 === currentStep;
        const circleBg = done ? colors.success : active ? colors.primary : upcomingColor;
        return (
          <React.Fragment key={label}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: circleBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{done ? '✓' : index + 1}</Text>
              </View>
              <Text style={{ fontSize: 10, marginTop: 4, color: active || done ? activeText : upcomingText }}>{label}</Text>
            </View>
            {index < labels.length - 1 && (
              <View style={{ width: 40, height: 1, backgroundColor: done ? colors.success : upcomingColor, marginTop: -12 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

/* ----------------------------------------------------------------
   GateIndicator (legacy, used by check-in) — theme-aware
-----------------------------------------------------------------*/
interface GateIndicatorProps {
  steps: Array<{ label: 'QR' | 'GPS' | 'Face'; status: 'pass' | 'active' | 'fail' | 'pending' }>;
}

export const GateIndicator: React.FC<GateIndicatorProps> = ({ steps }) => {
  const { colors } = useTheme();
  const colorFor = (status: string) =>
    status === 'pass' ? colors.success : status === 'active' ? colors.primary : status === 'fail' ? colors.danger : colors.border;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg }}>
      {steps.map((step, index) => (
        <View key={index} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colorFor(step.status), justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{step.label}</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
};

export type { AppColors };

export default {
  Button,
  Input,
  Card,
  Badge,
  GradientHeader,
  ThemedScreen,
  ProgressBar,
  EmptyState,
  ScreenHeader,
  Divider,
  LoadingOverlay,
  StepIndicator,
  GateIndicator,
};
