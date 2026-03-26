import { useState, useEffect } from "react";
import {
  Blocks, ChevronRight, Settings as SettingsIcon, Palette, Eye,
  Volume2, Languages, Sun, Moon, Monitor, RotateCcw, ChevronDown,
  Bell, BellOff, Vibrate, Clock, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";

// ---------- MAIN COMPONANT ----------
export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting, resetToDefault } = useSettings();

  // Mapping for the labels of the floating button's positions
  const positionLabels = {
    'top-left': t('settings.topLeft'),
    'top-right': t('settings.topRight'),
    'bottom-left': t('settings.bottomLeft'),
    'bottom-right': t('settings.bottomRight'),
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb trail */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('settings.breadcrumbHome')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('settings.title')}</span></li>
          </ol>
        </nav>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <SettingsIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('settings.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('settings.customizeApp')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm(t('settings.resetConfirm'))) {
                resetToDefault();
                toast.success(t('settings.settingsReset'));
              }
            }}
            className="flex items-center px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t('settings.reset')}
          </button>
        </div>

        {/* Map grid */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* ---------- APPEARENCE ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.appearance')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.appearanceDescription')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              {/* Theme */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase ml-1">
                  {t('settings.interfaceTheme')}
                </Label>
                <div className="relative">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all text-base font-medium cursor-pointer"
                  >
                    <option value="light">{t('settings.light')}</option>
                    <option value="dark">{t('settings.dark')}</option>
                    <option value="system">{t('settings.system')}</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <Separator />

              {/* Text size*/}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('settings.fontSize')}
                  </Label>
                  <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                    {settings.fontSize}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">90%</span>
                  <input
                    type="range"
                    min="90"
                    max="150"
                    step="5"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400"
                  />
                  <span className="text-xs text-slate-400">150%</span>
                </div>
              </div>

              {/* Position of the floating button (mobile menu) */}
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase ml-1">
                  {t('settings.mobileMenuButtonPosition')}
                </Label>
                <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200/50 dark:border-white/5">
                  {[
                    { id: 'top-left', icon: <ArrowUpLeft size={20} /> },
                    { id: 'top-right', icon: <ArrowUpRight size={20} /> },
                    { id: 'bottom-left', icon: <ArrowDownLeft size={20} /> },
                    { id: 'bottom-right', icon: <ArrowDownRight size={20} /> },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => updateSetting("floatingButtonPosition", pos.id)}
                      className={`
                        flex items-center justify-center gap-3 px-4 py-4 rounded-2xl transition-all duration-200
                        ${settings.floatingButtonPosition === pos.id 
                          ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-blue-500" 
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200"
                        }
                      `}
                    >
                      {pos.icon}
                      <span className="text-xs font-semibold">{positionLabels[pos.id]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---------- CARTE : ACCESSIBILITY ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.accessibility')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.accessibilityDescription')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              <SwitchRow
                id="reduced-motion"
                label={t('settings.reducedMotion')}
                description={t('settings.reduceAnimationsDescription')}
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
              />
              <Separator />
              <SwitchRow
                id="high-contrast"
                label={t('settings.highContrast')}
                description={t('settings.highContrastDescription')}
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting("highContrast", checked)}
              />
              <Separator />
              <SwitchRow
                id="compact-mode"
                label={t('settings.compactMode')}
                description={t('settings.compactModeDescription')}
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting("compactMode", checked)}
              />
            </div>
          </div>

          {/* ---------- CARD : NOTIFICATIONS ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  {settings.notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <BellOff className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.notifications')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.notificationsDescription')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              {/* Global activation */}
              <SwitchRow
                id="notifications-enabled"
                label={t('settings.notificationsEnabled')}
                description={t('settings.enableNotificationsDescription')}
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => updateSetting("notificationsEnabled", checked)}
              />

              {/* Conditional options */}
              {settings.notificationsEnabled && (
                <>
                  <Separator />

                  {/* Display duration */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <Label htmlFor="notification-duration" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {t('settings.notificationDuration')}
                        </Label>
                      </div>
                      <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                        {settings.notificationDuration} sec
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">2s</span>
                      <input
                        id="notification-duration"
                        type="range"
                        min="2"
                        max="10"
                        step="1"
                        value={settings.notificationDuration}
                        onChange={(e) => updateSetting("notificationDuration", parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-400"
                      />
                      <span className="text-xs text-slate-400">10s</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {t('settings.notificationDurationDescription')}
                    </p>
                  </div>

                  <Separator />

                  {/* Sound */}
                  <SwitchRow
                    id="sound-notifications"
                    label={t('settings.soundNotifications')}
                    description={t('settings.soundNotificationsDescription')}
                    checked={settings.soundNotifications}
                    onCheckedChange={(checked) => updateSetting("soundNotifications", checked)}
                  />

                </>
              )}
            </div>
          </div>

          {/* ---------- MAP: LANGUAGE ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Languages className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.language')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.chooseInterfaceLanguage')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-4">
              <div className="relative">
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting("language", e.target.value as any)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all text-base font-medium cursor-pointer"
                >
                  <option value="fr">{t('settings.french')}</option>
                  <option value="en">{t('settings.english')}</option>
                  <option value="mos">{t('settings.moore')}</option>
                  <option value="wo">{t('settings.wolof')}</option>
                  <option value="ha">{t('settings.haoussa')}</option>
                  <option value="sw">{t('settings.swahili')}</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500">
          <p className="mt-1">{t('settings.settingsSaved')}</p>
        </div>
      </div>
    </div>
  );
}

// ---------- HELP COMPONENTS ----------
function Separator() {
  return <div className="border-t border-slate-100 dark:border-slate-700 my-4" />;
}

function Label({ children, className, htmlFor }: { children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 ${className || ''}`}>
      {children}
    </label>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
            {label}
          </Label>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0
          ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}