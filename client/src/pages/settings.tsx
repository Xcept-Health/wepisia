import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext"; // ton contexte existant

// Pour stocker les prefs (localStorage)
const SETTINGS_KEY = "openepi-user-settings";

type Settings = {
  fontSize: number;           // 90–150% par ex.
  reducedMotion: boolean;     // réduit les animations
  soundNotifications: boolean;
  language: "fr" | "en" | "es" | "pt" | "it";
  compactMode: boolean;
  highContrast: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  fontSize: 100,
  reducedMotion: false,
  soundNotifications: true,
  language: "fr",
  compactMode: false,
  highContrast: false,
};

export default function Settings() {
  const { theme, setTheme } = useTheme(); // light/dark/system
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Appliquer les changements globaux
    document.documentElement.style.fontSize = `${settings.fontSize}%`;
    document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion);
    document.documentElement.classList.toggle("high-contrast", settings.highContrast);
    document.documentElement.classList.toggle("compact", settings.compactMode);
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
      <p className="text-muted-foreground mb-8">
        Personnalisez l'apparence, les notifications et le comportement de l'application.
      </p>

      <div className="space-y-6">

        {/* Thème */}
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Choisissez le thème et la taille du texte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="space-y-2">
              <Label>Thème</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Thème" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Taille du texte ({settings.fontSize}%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={([val]) => updateSetting("fontSize", val)}
                  min={90}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">{settings.fontSize}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste la taille de base du texte dans toute l'application.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accessibilité */}
        <Card>
          <CardHeader>
            <CardTitle>Accessibilité</CardTitle>
            <CardDescription>Options pour réduire les mouvements et améliorer le contraste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduced-motion">Réduire les animations</Label>
                <p className="text-sm text-muted-foreground">
                  Désactive ou simplifie les transitions et animations
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-contrast">Mode haut contraste</Label>
                <p className="text-sm text-muted-foreground">
                  Augmente le contraste des couleurs pour une meilleure lisibilité
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting("highContrast", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact">Mode compact</Label>
                <p className="text-sm text-muted-foreground">
                  Réduit les marges et paddings pour afficher plus de contenu
                </p>
              </div>
              <Switch
                id="compact"
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting("compactMode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Gérer les sons et effets visuels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound">Son des notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Jouer un son quand un calcul est terminé ou une erreur apparaît
                </p>
              </div>
              <Switch
                id="sound"
                checked={settings.soundNotifications}
                onCheckedChange={(checked) => updateSetting("soundNotifications", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Langue */}
        <Card>
          <CardHeader>
            <CardTitle>Langue</CardTitle>
            <CardDescription>Choisissez la langue de l'interface</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.language}
              onValueChange={(v) => updateSetting("language", v as any)}
            >
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Langue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
              </SelectContent>
            </Select>

            <p className="mt-3 text-sm text-muted-foreground">
              Note : Certaines traductions peuvent être partielles pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reset */}
      <div className="mt-10">
        <button
          onClick={() => {
            if (window.confirm("Réinitialiser tous les paramètres ?")) {
              setSettings(DEFAULT_SETTINGS);
              localStorage.removeItem(SETTINGS_KEY);
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
        >
          Réinitialiser tous les paramètres
        </button>
      </div>
    </div>
  );
}