import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, type AppColors } from '../theme/colors';
import { setThemeMode, toggleTheme as toggleThemeAction, type ThemeMode } from '../store/slices/themeSlice';

interface UseThemeResult {
  colors: AppColors;
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Central theme hook. All screens must read colors from here so light/dark
 * mode works consistently across the app.
 */
export const useTheme = (): UseThemeResult => {
  const dispatch = useDispatch();
  const mode = useSelector((state: any) => state.theme?.mode ?? 'light') as ThemeMode;
  const colors = themes[mode] ?? themes.light;

  const persist = (next: ThemeMode) => {
    AsyncStorage.setItem('sas_theme', next).catch(() => undefined);
  };

  const setMode = (next: ThemeMode) => {
    dispatch(setThemeMode(next));
    persist(next);
  };

  const toggle = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    dispatch(toggleThemeAction());
    persist(next);
  };

  return { colors, mode, isDark: mode === 'dark', toggle, setMode };
};

export default useTheme;
