import { useState } from "react";
import {
  ChevronRight, Settings as SettingsIcon, Palette, Eye,
  Languages, RotateCcw, ChevronDown,
  Bell, BellOff, Clock, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, X
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "@/lib/notifications";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { ColorTheme } from "@/contexts/SettingsContext";

//  Confirmation Modal 

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
}: ConfirmationModalProps) {
  const { settings } = useSettings();

  useState(() => {
    if (isOpen) {
      if (settings.soundNotifications) {
        const audio = new Audio("/sounds/wepisia_sound0.mp3");
        audio.play().catch(() => {});
      }
      if (settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl max-w-md w-full border border-border animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl transition-colors"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold rounded-xl transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Settings Page 

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting, resetToDefault } = useSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const positionLabels = {
    "top-left":     t("settings.topLeft"),
    "top-right":    t("settings.topRight"),
    "bottom-left":  t("settings.bottomLeft"),
    "bottom-right": t("settings.bottomRight"),
  };

  const colorThemes: { id: ColorTheme; label: string; primary: string; accent: string }[] = [
    { id: "default",     label: t("settings.themeDefault"),     primary: "#2563eb", accent: "#93c5fd" },
    { id: "sahara",      label: t("settings.themeSahara"),      primary: "#b45309", accent: "#fcd34d" },
    { id: "kilimanjaro", label: t("settings.themeKilimanjaro"), primary: "#1e5e3a", accent: "#c2410c" },
    { id: "yennenga",    label: t("settings.themeYennenga"),    primary: "#b45309", accent: "#3730a3" },
    { id: "behanzin",    label: t("settings.themeBehanzin"),    primary: "#92400e", accent: "#d97706" },
  ];

  const handleReset = () => {
    resetToDefault();
    toast.success(t("settings.settingsReset"));
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                {t("settings.breadcrumbHome")}
              </Link>
            </li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li>
              <span className="text-foreground px-2 py-1 rounded-md">
                {t("settings.title")}
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-card rounded-2xl shadow-sm flex items-center justify-center border border-border shrink-0">
              <SettingsIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {t("settings.title")}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("settings.customizeApp")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center px-5 py-3 text-sm font-semibold text-muted-foreground bg-card border border-border rounded-xl hover:bg-muted transition-all shadow-sm gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t("settings.reset")}
          </button>
        </div>

        {/* Cards */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/*  Appearance  */}
          <div className="bg-card text-card-foreground rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("settings.appearance")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.appearanceDescription")}</p>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8 space-y-6">

              {/* Light / Dark / System */}
              <div className="space-y-2">
                <FieldLabel>{t("settings.interfaceTheme")}</FieldLabel>
                <div className="relative">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full px-5 py-4 bg-muted border-none rounded-2xl text-foreground appearance-none focus:ring-2 focus:ring-ring/30 transition-all text-base font-medium cursor-pointer"
                  >
                    <option value="light">{t("settings.light")}</option>
                    <option value="dark">{t("settings.dark")}</option>
                    <option value="system">{t("settings.system")}</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <Separator />

              {/* Color theme swatches */}
              <div className="space-y-3">
                <FieldLabel>{t("settings.colorTheme")}</FieldLabel>
                <div className="grid grid-cols-5 gap-2">
                  {colorThemes.map((ct) => {
                    const isActive = settings.colorTheme === ct.id;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => updateSetting("colorTheme", ct.id)}
                        title={ct.label}
                        className={`
                          flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-200
                          ${isActive
                            ? "ring-2 ring-offset-2 ring-primary/60 bg-primary/5"
                            : "hover:bg-muted"
                          }
                        `}
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden shadow-sm relative">
                          <div className="absolute inset-0" style={{ backgroundColor: ct.primary }} />
                          <div
                            className="absolute bottom-0 right-0 w-2/5 h-2/5 rounded-tl-lg"
                            style={{ backgroundColor: ct.accent }}
                          />
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white/90 shadow" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold text-center leading-tight truncate w-full ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {ct.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Font size */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <FieldLabel>{t("settings.fontSize")}</FieldLabel>
                  <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {settings.fontSize}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">90%</span>
                  <input
                    type="range"
                    min="90"
                    max="150"
                    step="5"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                    className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">150%</span>
                </div>
              </div>

              <Separator />

              {/* Floating button position */}
              <div className="space-y-3">
                <FieldLabel>{t("settings.mobileMenuButtonPosition")}</FieldLabel>
                <div className="grid grid-cols-2 gap-3 p-2 bg-muted/50 rounded-[2rem] border border-border/50">
                  {[
                    { id: "top-left",     icon: <ArrowUpLeft size={20} /> },
                    { id: "top-right",    icon: <ArrowUpRight size={20} /> },
                    { id: "bottom-left",  icon: <ArrowDownLeft size={20} /> },
                    { id: "bottom-right", icon: <ArrowDownRight size={20} /> },
                  ].map((pos) => {
                    const isActive = settings.floatingButtonPosition === pos.id;
                    return (
                      <button
                        key={pos.id}
                        onClick={() => updateSetting("floatingButtonPosition", pos.id as any)}
                        className={`
                          flex items-center justify-center gap-3 px-4 py-4 rounded-2xl transition-all duration-200
                          ${isActive
                            ? "bg-card text-primary shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }
                        `}
                      >
                        {pos.icon}
                        <span className="text-xs font-semibold">
                          {positionLabels[pos.id as keyof typeof positionLabels]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/*  Accessibility  */}
          <div className="bg-card text-card-foreground rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/30 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("settings.accessibility")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.accessibilityDescription")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              <SwitchRow
                id="reduced-motion"
                label={t("settings.reducedMotion")}
                description={t("settings.reduceAnimationsDescription")}
                checked={settings.reducedMotion}
                onCheckedChange={(v) => updateSetting("reducedMotion", v)}
              />
              <Separator />
              <SwitchRow
                id="high-contrast"
                label={t("settings.highContrast")}
                description={t("settings.highContrastDescription")}
                checked={settings.highContrast}
                onCheckedChange={(v) => updateSetting("highContrast", v)}
              />
              <Separator />
              <SwitchRow
                id="compact-mode"
                label={t("settings.compactMode")}
                description={t("settings.compactModeDescription")}
                checked={settings.compactMode}
                onCheckedChange={(v) => updateSetting("compactMode", v)}
              />
            </div>
          </div>

          {/*  Notifications  */}
          <div className="bg-card text-card-foreground rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  {settings.notificationsEnabled
                    ? <Bell className="w-5 h-5 text-primary" />
                    : <BellOff className="w-5 h-5 text-primary" />
                  }
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("settings.notifications")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.notificationsDescription")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              <SwitchRow
                id="notifications-enabled"
                label={t("settings.notificationsEnabled")}
                description={t("settings.enableNotificationsDescription")}
                checked={settings.notificationsEnabled}
                onCheckedChange={(v) => updateSetting("notificationsEnabled", v)}
              />

              {settings.notificationsEnabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <FieldLabel htmlFor="notification-duration">
                          {t("settings.notificationDuration")}
                        </FieldLabel>
                      </div>
                      <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {settings.notificationDuration} sec
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">2s</span>
                      <input
                        id="notification-duration"
                        type="range"
                        min="2"
                        max="10"
                        step="1"
                        value={settings.notificationDuration}
                        onChange={(e) => updateSetting("notificationDuration", parseInt(e.target.value))}
                        className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">10s</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {t("settings.notificationDurationDescription")}
                    </p>
                  </div>

                  <Separator />
                  <SwitchRow
                    id="sound-notifications"
                    label={t("settings.soundNotifications")}
                    description={t("settings.soundNotificationsDescription")}
                    checked={settings.soundNotifications}
                    onCheckedChange={(v) => updateSetting("soundNotifications", v)}
                  />
                </>
              )}
            </div>
          </div>

          {/*  Language  */}
          <div className="bg-card text-card-foreground rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  <Languages className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("settings.language")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.chooseInterfaceLanguage")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <div className="relative">
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting("language", e.target.value as any)}
                  className="w-full px-5 py-4 bg-muted border-none rounded-2xl text-foreground appearance-none focus:ring-2 focus:ring-ring/30 transition-all text-base font-medium cursor-pointer"
                >
                  <option value="fr">{t("settings.french")}</option>
                  <option value="en">{t("settings.english")}</option>
                  <option value="mos">{t("settings.moore")}</option>
                  <option value="wo">{t("settings.wolof")}</option>
                  <option value="ha">{t("settings.haoussa")}</option>
                  <option value="sw">{t("settings.swahili")}</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>{t("settings.settingsSaved")}</p>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title={t("settings.resetConfirmTitle")}
        message={t("settings.resetConfirmMessage")}
        confirmText={t("settings.resetConfirmYes")}
        cancelText={t("settings.resetConfirmNo")}
      />
    </div>
  );
}

//  Helper components 

function Separator() {
  return <div className="border-t border-border my-4" />;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-1"
    >
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
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-ring/50 shrink-0
          ${checked ? "bg-primary" : "bg-muted-foreground/30"}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
            ${checked ? "translate-x-5" : "translate-x-0.5"}
          `}
        />
      </button>
    </div>
  );
}