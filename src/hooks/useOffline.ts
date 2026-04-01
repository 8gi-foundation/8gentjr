"use client";

import { useState, useEffect } from "react";

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
}

/**
 * Reactive hook that tracks browser online/offline status.
 * SSR-safe — defaults to online on the server.
 */
export function useOffline(): OfflineState {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
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
