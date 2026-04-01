"use client";

import { useOffline } from "../hooks/useOffline";

/**
 * Non-intrusive yellow banner shown when the device is offline.
 * Auto-hides when connectivity is restored. Does not block content.
 * Defaults to hidden — only appears after confirming offline status.
 */
export function OfflineBanner() {
  const { isOffline } = useOffline();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed top-0 inset-x-0 z-[9999]
        bg-amber-100 text-amber-800 border-b border-amber-200
        text-center px-4 py-2 text-sm font-semibold
        transition-transform duration-300 ease-out
        ${isOffline ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      You&apos;re offline — AAC still works
    </div>
  );
}
