import { configureStore, combineReducers, createListenerMiddleware } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import offlineReducer from './slices/offlineSlice';
import langReducer from './slices/langSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  offline: offlineReducer,
  lang: langReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'offline'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const languageListenerMiddleware = createListenerMiddleware<RootState, AppDispatch>();

languageListenerMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    currentState.lang.lang !== previousState.lang.lang,
  effect: async (_action, listenerApi) => {
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
