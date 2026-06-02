import { configureStore, combineReducers, createListenerMiddleware } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import offlineReducer from './slices/offlineSlice';
import langReducer from './slices/langSlice';
import themeReducer from './slices/themeSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  offline: offlineReducer,
  lang: langReducer,
  theme: themeReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'offline'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const languageListenerMiddleware = createListenerMiddleware();

languageListenerMiddleware.startListening({
  predicate: (_action: unknown, currentState: any, previousState: any) =>
    currentState.lang.lang !== previousState.lang.lang,
  effect: async (_action: unknown, listenerApi: any) => {
    try {
      const lang = listenerApi.getState().lang.lang;
      await AsyncStorage.setItem('sas_lang', lang);
    } catch (error) {
      console.warn('Failed to persist language', error);
    }
  },
});

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).prepend(languageListenerMiddleware.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default { store, persistor };
