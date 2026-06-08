import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, persistor } from './src/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage } from './src/store/slices/langSlice';
import { setThemeMode } from './src/store/slices/themeSlice';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/theme';
import { registerForPushNotifications, addNotificationListeners } from './src/services/notificationService';
import { navigate } from './src/navigation/navigationRef';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
    },
  },
});

export default function App() {
  useEffect(() => {
    AsyncStorage.getItem('sas_lang').then((saved) => {
      if (saved === 'en' || saved === 'fr') {
        store.dispatch(setLanguage(saved));
      }
    });
    AsyncStorage.getItem('sas_theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        store.dispatch(setThemeMode(saved));
      }
    });

    // Best-effort push notification setup (never throws)
    registerForPushNotifications();
    const unsubscribe = addNotificationListeners(
      () => {},
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.action === 'checkin') {
          navigate('StudentTabs', {
            screen: 'HomeTab',
            params: {
              screen: 'CheckIn',
              params: {
                session_id: data.session_id,
                course_name: data.course_name,
                venue: data.venue,
              },
            },
          });
        }
      }
    );
    return unsubscribe;
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
          <RootNavigator />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
