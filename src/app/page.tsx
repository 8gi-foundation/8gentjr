'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

/**
 * Root route — redirects based on onboarding state.
 *
 * First visit → /onboarding (problem-first flow)
 * Returning  → /talk (main AAC experience)
 */
export default function Home() {
  const { settings, isLoaded } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (settings.hasCompletedOnboarding) {
      router.replace('/talk');
    } else {
      router.replace('/onboarding');
    }
  }, [isLoaded, settings.hasCompletedOnboarding, router]);

  // Brief blank screen while settings load (< 50ms on device)
  return null;
}
