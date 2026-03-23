import { toast as sonnerToast } from "sonner";

let isSoundEnabled = false;

export function setSoundEnabled(enabled: boolean) {
  isSoundEnabled = enabled;
}


function playNotificationSound() {
  if (!isSoundEnabled) return;
  const audio = new Audio("/sounds/wepisia_sound0.mp3"); 
  audio.play().catch(e => console.warn("Impossible de jouer le son :", e));
}

export const toast = {
  success: (message: string, options?: any) => {
    playNotificationSound();
    return sonnerToast.success(message, options);
  },
  error: (message: string, options?: any) => {
    playNotificationSound();
    return sonnerToast.error(message, options);
  },
  info: (message: string, options?: any) => {
    playNotificationSound();
    return sonnerToast.info(message, options);
  },
  warning: (message: string, options?: any) => {
    playNotificationSound();
    return sonnerToast.warning(message, options);
  },
  custom: (message: string, options?: any) => {
    playNotificationSound();
    return sonnerToast(message, options);
  },
};