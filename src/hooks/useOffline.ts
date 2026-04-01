"use client";

import { useState, useEffect } from "react";

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
}

/**
 * Reactive hook that tracks browser online/offline status.
 * SSR-safe — defaults to **online** so the banner never flashes on load.
 * Only transitions to offline after the browser fires the "offline" event.
 */
export function useOffline(): OfflineState {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Sync with real browser state once mounted
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { isOnline: online, isOffline: !online };
}
