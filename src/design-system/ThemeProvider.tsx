/**
 * FinTrack Theme Provider
 *
 * Detects system theme preference and allows user override.
 * User preference persisted in Zustand ui.store (non-sensitive, okay for MMKV).
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type FinTrackTheme } from './theme';

type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextValue {
  readonly theme: FinTrackTheme;
  readonly themePreference: ThemePreference;
  readonly setThemePreference: (pref: ThemePreference) => void;
  readonly isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly preference: ThemePreference;
  readonly onPreferenceChange: (pref: ThemePreference) => void;
}

export function ThemeProvider({
  children,
  preference,
  onPreferenceChange,
}: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();

  const resolvedTheme = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'light' ? lightTheme : darkTheme;
    }
    return preference === 'light' ? lightTheme : darkTheme;
  }, [preference, systemScheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      themePreference: preference,
      setThemePreference: onPreferenceChange,
      isDark: resolvedTheme.dark,
    }),
    [resolvedTheme, preference, onPreferenceChange],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme.
 *
 * @example
 * const { theme, isDark } = useTheme();
 * <View style={{ backgroundColor: theme.colors.bg.primary }} />
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
