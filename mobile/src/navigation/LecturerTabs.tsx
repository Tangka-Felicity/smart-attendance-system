import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import CustomTabBar from '../components/CustomTabBar';
import QRDisplayScreen from '../screens/Lecturer/QRDisplayScreen';
import LiveAttendanceScreen from '../screens/Lecturer/LiveAttendanceScreen';
import ManualMarkScreen from '../screens/Lecturer/ManualMarkScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const LecturerHomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="QRDisplay" component={QRDisplayScreen} />
    <Stack.Screen name="LiveAttendance" component={LiveAttendanceScreen} />
    <Stack.Screen name="ManualMark" component={ManualMarkScreen} />
  </Stack.Navigator>
);

const AttendanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LiveAttendanceMain" component={LiveAttendanceScreen} />
    <Stack.Screen name="ManualMark" component={ManualMarkScreen} />
  </Stack.Navigator>
);

const LecturerTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="LecturerSessions"
        component={LecturerHomeStack}
        options={{
          tabBarLabel: t('qr'),
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="LecturerAttendance"
        component={AttendanceStack}
        options={{
          tabBarLabel: t('liveAttendance'),
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="LecturerNotifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t('notifications'),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="LecturerProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default LecturerTabs;
