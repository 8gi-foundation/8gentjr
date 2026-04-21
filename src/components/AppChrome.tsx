'use client';

/**
 * AppChrome — conditional shell that hides Dock + LockScreen during onboarding.
 *
 * During onboarding, we show a clean full-screen experience.
 * After onboarding, the full app shell (lock screen, dock, install prompt) appears.
 */

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import Dock from './Dock';
import { LockScreenGate } from './LockScreenGate';
import { InstallPrompt } from './InstallPrompt';
import { ParentalGate } from './ParentalGate';

const CHROMELESS_ROUTES = ['/onboarding', '/parent-email-verification'];
const UNGATED_ROUTES = ['/privacy', '/terms', '/help'];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_ROUTES.some((r) => pathname?.startsWith(r));
  const isUngated = UNGATED_ROUTES.some((r) => pathname?.startsWith(r));

  // Privacy/terms pages bypass all gates
  if (isUngated) {
    return <main>{children}</main>;
  }

  if (isChromeless) {
    return (
      <ParentalGate>
        <main>{children}</main>
      </ParentalGate>
    );
  }

  return (
    <ParentalGate>
      <LockScreenGate>
        <InstallPrompt />
        <main className="pb-safe-dock">{children}</main>
        <Dock />
      </LockScreenGate>
    </ParentalGate>
  );
}
