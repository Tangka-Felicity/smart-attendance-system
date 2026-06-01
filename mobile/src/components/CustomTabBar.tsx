import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../hooks/useTheme';
import { hapticLight } from '../utils/haptics';

/**
 * Premium custom bottom tab bar.
 * - Active tab: tinted pill behind the icon, primary-colored icon + label.
 * - Optional center "raised" tab (route name includes "CheckIn").
 * - Per-tab badge via options.tabBarBadge.
 */
export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const isCenter = /checkin/i.test(route.name);

        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        const onPress = () => {
          hapticLight();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const iconColor = focused ? colors.primary : colors.textMuted;
        const icon = options.tabBarIcon
          ? options.tabBarIcon({ focused, color: isCenter ? '#fff' : iconColor, size: focused ? 26 : 22 })
          : null;
        const badge = options.tabBarBadge;

        if (isCenter) {
          return (
            <TouchableOpacity key={route.key} accessibilityRole="button" onPress={onPress} activeOpacity={0.85} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -16,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                {icon}
              </View>
              <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 3, color: iconColor }}>{label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} accessibilityRole="button" onPress={onPress} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12 }}>
            <View
              style={{
                width: 48,
                height: 32,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.primaryLight : 'transparent',
                transform: [{ scale: focused ? 1.05 : 1 }],
              }}
            >
              {icon}
              {badge != null && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: colors.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{String(badge)}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 3, color: focused ? colors.primary : colors.textMuted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default CustomTabBar;
