/**
 * Theme provider.
 *
 * The theme is currently dark-only (see theme.ts for why), so there is nothing
 * to resolve — this provider exists to give components a single `useTheme()`
 * entry point rather than importing tokens directly, which keeps the eventual
 * light-mode pass from having to touch every component.
 *
 * The `preference` props are retained so the persisted UI-store value and the
 * call sites in the root layout stay intact, but they are deliberately not
 * honoured yet. Do not build a Settings theme toggle against them until a light
 * theme exists — a control that silently does nothing is worse than no control.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { theme as appTheme, type AppTheme } from './theme';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextValue {
  readonly theme: AppTheme;
  readonly themePreference: ThemePreference;
  readonly setThemePreference: (pref: ThemePreference) => void;
  /** Always true while the app is dark-only. Kept so components don't need
   *  rewriting when a light theme lands. */
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
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: appTheme,
      themePreference: preference,
      setThemePreference: onPreferenceChange,
      isDark: true,
    }),
    [preference, onPreferenceChange],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Access the current theme.
 *
 * @example
 * const { theme } = useTheme();
 * <View style={{ backgroundColor: theme.colors.surface.base }} />
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
