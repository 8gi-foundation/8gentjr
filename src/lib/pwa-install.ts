/**
 * Shared PWA install state.
 *
 * The browser fires `beforeinstallprompt` exactly once, early, and only on
 * Chromium (Android/desktop). Whoever calls `preventDefault()` owns the only
 * reference to that event. This module captures it app-wide so BOTH the
 * transient InstallPrompt banner AND the always-available Settings entry can
 * trigger the native install dialog at any time.
 *
 * iOS/Safari has no `beforeinstallprompt`; installs are manual
 * (Share → Add to Home Screen), handled by the consuming components.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "ios" | "android" | "other";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let initialized = false;

function notify() {
  for (const l of listeners) l();
}

/**
 * Begin capturing the deferred install prompt. Idempotent — safe to call from
 * multiple components; only the first call wires the window listeners.
 */
export function initPwaInstall(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  // Once installed, drop the stale prompt so UI can flip to "Installed".
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** Subscribe to deferred-prompt availability changes. Returns an unsubscribe fn. */
export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a native (one-tap) install prompt is currently available. */
export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Trigger the native install dialog if available.
 * Returns the user's choice, or `null` if no deferred prompt exists.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  if (!deferredPrompt) return null;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  // A prompt can only be used once.
  deferredPrompt = null;
  notify();
  return outcome;
}

/** True when the app is already running as an installed standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Best-effort platform detection for install-instruction copy. */
export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|iphone|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}
