"use client";

import { useServiceWorker } from "../hooks/useServiceWorker";

/**
 * Invisible client component — its only job is to mount useServiceWorker,
 * which registers sw.js and wires up online/offline + install prompt tracking.
 * Renders nothing. Drop it into the root layout once.
 */
export function ServiceWorkerRegistration() {
  useServiceWorker();
  return null;
}
