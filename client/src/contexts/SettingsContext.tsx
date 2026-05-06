import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ColorTheme = 'default' | 'sahara' | 'kilimanjaro' | 'yennenga' | 'behanzin';

export type Settings = {
  fontSize: number;
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  language: 'fr' | 'en' | 'mos' | 'wo' | 'ha' | 'sw';
  notificationsEnabled: boolean;
  notificationDuration: number;
  soundNotifications: boolean;
  hapticFeedback: boolean;
  floatingButtonPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  // African color theme — 'default' keeps existing light/dark behavior untouched
  colorTheme: ColorTheme;
};

const DEFAULT_SETTINGS: Settings = {
  fontSize: 100,
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  language: 'fr',
  notificationsEnabled: true,
  notificationDuration: 5,
  soundNotifications: false,
  hapticFeedback: false,
  floatingButtonPosition: 'top-left',
  colorTheme: 'default',
};

const SETTINGS_KEY = 'wepisia-user-settings';

// ─── Context ─────────────────────────────────────────────────────────────────

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetToDefault: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persist settings and apply DOM-level side effects
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    document.documentElement.style.fontSize = `${settings.fontSize}%`;
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('compact', settings.compactMode);

    // Apply the African color theme via data-color-theme attribute.
    // ThemeContext still manages the dark/light class independently — no conflict.
    if (settings.colorTheme === 'default') {
      document.documentElement.removeAttribute('data-color-theme');
    } else {
      document.documentElement.setAttribute('data-color-theme', settings.colorTheme);
    }
  }, [settings]);

  // Sync i18n language
  useEffect(() => {
    if (i18n && settings.language) {
      i18n.changeLanguage(settings.language).catch((err) =>
        console.error('Language change failed:', err)
      );
    }
  }, [i18n, settings.language]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetToDefault }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 