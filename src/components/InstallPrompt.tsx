"use client";

import { useState, useEffect, useCallback } from "react";
import {
  initPwaInstall,
  subscribePwaInstall,
  hasInstallPrompt,
  promptInstall,
  isStandalone,
  detectPlatform,
  type InstallPlatform,
} from "@/lib/pwa-install";

/**
 * PWA install prompt with platform-specific handling.
 *
 * Android/Chrome: uses the app-wide deferred `beforeinstallprompt` (captured in
 *   `@/lib/pwa-install`) → one-tap native install.
 * iOS/Safari: shows manual instructions (Share → Add to Home Screen).
 * Hides itself if already running in standalone mode or the user dismissed it.
 *
 * The same install plumbing also powers the always-available entry in Settings,
 * so this banner is just the proactive nudge, not the only way in.
 */

const DISMISS_KEY = "8gentjr_install_dismissed";

export function InstallPrompt() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Start capturing the deferred prompt app-wide (idempotent).
    initPwaInstall();

    // Already installed as standalone - never show the banner.
    if (isStandalone()) return;

    // User previously dismissed.
    if (localStorage.getItem(DISMISS_KEY)) return;

    const detected = detectPlatform();
    setPlatform(detected);

    if (detected === "ios") {
      // iOS has no beforeinstallprompt - show manual steps after a short delay
      // so it doesn't flash on page load.
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    // Android/Chromium: reveal as soon as a native prompt is available.
    if (hasInstallPrompt()) setShow(true);
    const unsub = subscribePwaInstall(() => {
      if (hasInstallPrompt()) setShow(true);
    });
    return unsub;
  }, []);

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") setShow(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install 8gent Jr as an app"
      className="fixed bottom-20 inset-x-0 z-[9990] flex justify-center px-4 animate-slide-up"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#f0e6d6] p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-[#0E0F0F] flex items-center justify-center">
            <span className="text-[#C9A84C] font-extrabold text-lg">8.</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1a1a2e] text-[15px] leading-tight">
              Install 8gent Jr as an app
            </p>
            <p className="text-[#8a7e70] text-xs mt-0.5 leading-snug">
              {platform === "ios"
                ? "Adds 8gent Jr to your Home Screen - opens full screen, no browser bar."
                : "Opens full screen, no browser bar - works offline. This is the app."}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            type="button"
            className="w-7 h-7 shrink-0 rounded-full bg-[#f0e6d6] text-[#8a7e70] flex items-center justify-center text-xs border-none cursor-pointer hover:bg-[#e0d6c6] transition-colors"
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>

        {/* Action */}
        <div className="mt-3">
          {platform === "ios" ? (
            /* iOS: manual instructions */
            <div className="flex items-center gap-2 bg-[#FFF8F0] rounded-xl px-3 py-2.5">
              <span className="text-lg">
                {/* Share icon approximation */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8610A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
              <p className="text-[#1a1a2e] text-xs leading-snug">
                Tap{" "}
                <span className="font-bold text-[#E8610A]">Share</span>
                {" "}then{" "}
                <span className="font-bold text-[#E8610A]">Add to Home Screen</span>
              </p>
            </div>
          ) : (
            /* Android/Chrome/Other: one-tap install */
            <button
              onClick={handleInstall}
              type="button"
              aria-label="Install 8gent Jr as an app"
              className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#E8610A] text-white font-bold text-sm border-none cursor-pointer active:scale-95 transition-transform shadow-md"
            >
              Install app
            </button>
          )}
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
