import { useState, useEffect } from "react";
import {
  Blocks, ChevronRight, Settings as SettingsIcon, Palette, Eye,
  Volume2, Languages, Sun, Moon, Monitor, RotateCcw, ChevronDown,
  Bell, BellOff, Vibrate, Clock
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// ---------- TYPES ET CONSTANTES ----------
const SETTINGS_KEY = "openepi-user-settings";

type Settings = {
  // Apparence
  fontSize: number;
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  // Langue
  language: "fr" | "en" | "es" | "pt" | "it";
  // Notifications
  notificationsEnabled: boolean;
  notificationDuration: number; // en secondes
  soundNotifications: boolean;
  hapticFeedback: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  fontSize: 100,
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  language: "fr",
  notificationsEnabled: true,
  notificationDuration: 5,
  soundNotifications: true,
  hapticFeedback: false,
};

// ---------- COMPOSANT PRINCIPAL ----------
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Sauvegarde automatique + application des classes globales
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    document.documentElement.style.fontSize = `${settings.fontSize}%`;
    document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion);
    document.documentElement.classList.toggle("high-contrast", settings.highContrast);
    document.documentElement.classList.toggle("compact", settings.compactMode);
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    if (window.confirm("Réinitialiser tous les paramètres ?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(SETTINGS_KEY);
      toast.success("Paramètres réinitialisés");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Fil d'Ariane */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Paramètres</span></li>
          </ol>
        </nav>

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <SettingsIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Paramètres
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Personnalisez l'application selon vos préférences
              </p>
            </div>
          </div>
          <button
            onClick={resetToDefault}
            className="flex items-center px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>

        {/* Grille des cartes */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ---------- CARTE : APPARENCE ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Apparence</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Thème, taille du texte et contraste</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              {/* Thème */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                  Thème de l'interface
                </Label>
                <div className="relative">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all text-base font-medium cursor-pointer"
                  >
                    <option value="light">Clair</option>
                    <option value="dark">Sombre</option>
                    <option value="system">Système</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <Separator />

              {/* Taille du texte */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Taille du texte
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
            </div>
          </div>

          {/* ---------- CARTE : ACCESSIBILITÉ ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Accessibilité</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Confort visuel et réduction des animations</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              <SwitchRow
                id="reduced-motion"
                label="Réduire les animations"
                description="Désactive ou simplifie les transitions et animations"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
              />
              <Separator />
              <SwitchRow
                id="high-contrast"
                label="Mode haut contraste"
                description="Augmente le contraste des couleurs pour une meilleure lisibilité"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting("highContrast", checked)}
              />
              <Separator />
              <SwitchRow
                id="compact-mode"
                label="Mode compact"
                description="Réduit les marges et paddings pour afficher plus de contenu"
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting("compactMode", checked)}
              />
            </div>
          </div>

          {/* ---------- CARTE : NOTIFICATIONS (refondue) ---------- */}
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
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Durée, son et vibration</p>
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              {/* Activation globale */}
              <SwitchRow
                id="notifications-enabled"
                label="Activer les notifications"
                description="Afficher les notifications toast dans l'application"
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => updateSetting("notificationsEnabled", checked)}
              />

              {/* Options conditionnelles (affichées seulement si les notifications sont activées) */}
              {settings.notificationsEnabled && (
                <>
                  <Separator />

                  {/* Durée d'affichage */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <Label htmlFor="notification-duration" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Durée d'affichage
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
                      Temps avant fermeture automatique de la notification.
                    </p>
                  </div>

                  <Separator />

                  {/* Son */}
                  <SwitchRow
                    id="sound-notifications"
                    label="Son des notifications"
                    description="Jouer un son lors de l'apparition d'une notification"
                    checked={settings.soundNotifications}
                    onCheckedChange={(checked) => updateSetting("soundNotifications", checked)}
                  />

                  <Separator />

                  {/* Retour haptique (vibration) */}
                  <SwitchRow
                    id="haptic-feedback"
                    label="Retour haptique (vibration)"
                    description="Faire vibrer l'appareil lors des notifications (si supporté)"
                    checked={settings.hapticFeedback}
                    onCheckedChange={(checked) => updateSetting("hapticFeedback", checked)}
                    icon={<Vibrate className="w-4 h-4 text-slate-500" />}
                  />
                </>
              )}
            </div>
          </div>

          {/* ---------- CARTE : LANGUE ---------- */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Languages className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Langue</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Choisissez la langue de l'interface</p>
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
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="it">Italiano</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>OpenEpi Suite – Version 2.0.0</p>
          <p className="mt-1">Paramètres sauvegardés automatiquement dans votre navigateur.</p>
        </div>
      </div>
    </div>
  );
}

// ---------- COMPOSANTS AIDE (identiques au design précédent) ----------
function Separator() {
  return <div className="border-t border-slate-100 dark:border-slate-700 my-4" />;
}

function Label({ children, className, htmlFor }: { children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 ${className}`}>
      {children}
    </label>
  );
}

// Interrupteur personnalisé (toggle switch) avec option d'icône
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