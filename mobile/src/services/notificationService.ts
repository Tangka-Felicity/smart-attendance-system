import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

// Foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const FCM_TOKEN_KEY = 'fcm_token';

/**
 * Request permission, create the Android channel, obtain an Expo push token,
 * persist it locally and best-effort sync it to the backend. Fully guarded so a
 * failure here never crashes the app.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A56DB',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

    try {
      await client.patch('/users/me', { fcm_token: token });
    } catch (err) {
      console.log('Could not save FCM token to backend');
    }

    return token;
  } catch (error) {
    console.log('Push notification setup failed:', error);
    return null;
  }
};

export const addNotificationListeners = (
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void
) => {
  const notifListener = Notifications.addNotificationReceivedListener(onNotification);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => {
    notifListener.remove();
    responseListener.remove();
  };
};
