import { toast as sonnerToast } from "sonner";

// ---------- TYPES ----------
type Settings = {
  notificationsEnabled: boolean;
  notificationDuration: number;
  soundNotifications: boolean;
  hapticFeedback: boolean;
  // autres paramètres ignorés ici
};

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  notificationDuration: 5,
  soundNotifications: true,
  hapticFeedback: false,
};

// ---------- UTILITAIRES ----------
function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem("openepi-user-settings");
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved);
    // Extraction des clés
    return {
      notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
      notificationDuration: parsed.notificationDuration ?? DEFAULT_SETTINGS.notificationDuration,
      soundNotifications: parsed.soundNotifications ?? DEFAULT_SETTINGS.soundNotifications,
      hapticFeedback: parsed.hapticFeedback ?? DEFAULT_SETTINGS.hapticFeedback,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Son simple (beep discret) via Web Audio API
let audioContext: AudioContext | null = null;
function playNotificationSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume(); // nécessaire pour certains navigateurs
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // ignore silencieusement les erreurs audio
  }
}

// Vibration courte (50ms)
function triggerHapticFeedback() {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(50);
  }
}

// ---------- WRAPPER PERSONNALISÉ ----------
export const toast = {
  // Messages standards
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.success(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.error(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.info(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.warning(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  // Message générique (toast simple)
  message: (message: string, options?: Parameters<typeof sonnerToast.message>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.message(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  // Promise – utile pour les opérations asynchrones
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    data: Parameters<typeof sonnerToast.promise>[1],
    options?: Parameters<typeof sonnerToast.promise>[2]
  ) => {
    const settings = getSettings();
    // On ne vérifie pas `notificationsEnabled` car les toasts de promise sont souvent critiques
    // et l'utilisateur s'attend à voir le chargement/résultat. On peut toutefois appliquer
    // la durée préférée.
    return sonnerToast.promise(promise, data, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  // Chargement (toast persistant jusqu'à dismiss)
  loading: (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.loading(message, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },

  // Dissimulation programmée
  dismiss: (id?: string | number) => {
    return sonnerToast.dismiss(id);
  },

  // Personnalisation avancée (permet de passer n'importe quel type)
  custom: (jsx: React.ReactNode, options?: Parameters<typeof sonnerToast.custom>[1]) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.soundNotifications) playNotificationSound();
    if (settings.hapticFeedback) triggerHapticFeedback();

    return sonnerToast.custom(jsx, {
      duration: settings.notificationDuration * 1000,
      ...options,
    });
  },
};

// Exporter également le toast original si besoin
export { sonnerToast };