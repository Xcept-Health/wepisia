import React, { createContext, useContext, useEffect, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  // Resolved value — never 'system', always 'light' or 'dark'
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  switchable = true,
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  switchable?: boolean;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as ThemeMode) || defaultTheme;
  });

  // Resolve 'system' to actual OS preference
  const getSystemTheme = (): 'light' | 'dark' =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const actualTheme: 'light' | 'dark' = theme === 'system' ? getSystemTheme() : theme;

  // Apply dark class and persist choice
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', actualTheme === 'dark');
    localStorage.setItem('theme', theme);
  }, [actualTheme, theme]);

  // Re-render when OS preference changes while mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setThemeState((prev) => prev); // trigger re-render
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    if (!switchable) return;
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}