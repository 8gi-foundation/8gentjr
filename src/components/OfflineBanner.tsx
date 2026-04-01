"use client";

import { useOffline } from "../hooks/useOffline";

/**
 * Non-intrusive yellow banner shown when the device is offline.
 * Auto-hides when connectivity is restored. Does not block content.
 */
export function OfflineBanner() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#FFF3CD",
        color: "#856404",
        textAlign: "center",
        padding: "8px 16px",
        fontSize: "0.875rem",
        fontWeight: 600,
        borderBottom: "1px solid #FFEEBA",
      }}
    >
      You&apos;re offline — AAC still works
    </div>
  );
}
