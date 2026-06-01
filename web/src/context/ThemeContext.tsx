import { createContext, useContext,
  useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>(
  {} as ThemeContextType
);
export const ThemeProvider = (
  { children }: { children: ReactNode }
) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sas_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Light is the default theme; system preference is no longer auto-applied.
    return 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme', theme
    );
    localStorage.setItem('sas_theme', theme);
  }, [theme]);
  const toggleTheme = () =>
    setTheme(p => p === 'light' ? 'dark' : 'light');
  return (
    <ThemeContext.Provider value={{theme,toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = () => useContext(ThemeContext);
