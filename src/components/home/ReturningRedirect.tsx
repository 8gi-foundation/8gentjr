'use client';

/**
 * Returning users skip the parent landing and go straight to Talk, exactly as
 * the root route did before. First-time visitors stay and read the page.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function ReturningRedirect() {
  const { settings, isLoaded } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && settings.hasCompletedOnboarding) router.replace('/talk');
  }, [isLoaded, settings.hasCompletedOnboarding, router]);

  return null;
}
