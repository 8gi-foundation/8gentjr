'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { LockScreen } from './LockScreen';

const STORAGE_KEY = '8gentjr-unlocked';

function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Wraps the app in a lock screen overlay on first visit per session.
 * Once unlocked, stays unlocked until the tab is closed.
 * Uses sessionStorage so route navigations don't re-trigger the lock.
 */
export function LockScreenGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isSessionUnlocked);

  const handleUnlock = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setUnlocked(true);
  }, []);

  return (
    <>
      {!unlocked && <LockScreen onUnlock={handleUnlock} />}
      {children}
    </>
  );
}
