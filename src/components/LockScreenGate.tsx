'use client';

import { useState, type ReactNode } from 'react';
import { LockScreen } from './LockScreen';

/**
 * Wraps the app in a lock screen overlay on first visit per session.
 * Once unlocked, stays unlocked until the tab is closed.
 */
export function LockScreenGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <>
      {!unlocked && <LockScreen onUnlock={() => setUnlocked(true)} />}
      {children}
    </>
  );
}
