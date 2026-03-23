import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // on importe useTranslation

// Type des paramètres
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
};

const DEFAULT_SETTINGS: Settings = {
  fontSize: 100,
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  language: 'fr',
  notificationsEnabled: true,
  notificationDuration: 5,
  soundNotifications: true,
  hapticFeedback: false,
  floatingButtonPosition: 'top-left',
};

const SETTINGS_KEY = 'openepi-user-settings';

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetToDefault: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation(); // on récupère i18n depuis le hook

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Sauvegarde dans localStorage et application des classes CSS globales
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    document.documentElement.style.fontSize = `${settings.fontSize}%`;
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('compact', settings.compactMode);
  }, [settings]);

  // Synchronisation avec i18n lorsque la langue change
  useEffect(() => {
    if (i18n && settings.language) {
      i18n.changeLanguage(settings.language).catch(err => 
        console.error('Erreur lors du changement de langue:', err)
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

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}