'use client';

/**
 * AppChrome — conditional shell that hides Dock + LockScreen during onboarding.
 *
 * During onboarding, we show a clean full-screen experience.
 * After onboarding, the full app shell (lock screen, dock, install prompt) appears.
 */

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { OfflineBanner } from './OfflineBanner';
import Dock from './Dock';
import { LockScreenGate } from './LockScreenGate';
import { InstallPrompt } from './InstallPrompt';

const CHROMELESS_ROUTES = ['/onboarding'];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_ROUTES.some((r) => pathname?.startsWith(r));

  if (isChromeless) {
    return (
      <>
        <OfflineBanner />
        <main>{children}</main>
      </>
    );
  }

  return (
    <LockScreenGate>
      <OfflineBanner />
      <InstallPrompt />
      <main className="pb-safe-dock">{children}</main>
      <Dock />
    </LockScreenGate>
  );
}
