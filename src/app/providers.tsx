'use client';

import { type ReactNode } from 'react';
import { AppProvider } from '@/context/AppContext';
import { ProfileProvider } from '@/context/ProfileContext';

/**
 * Providers wrapper — centralizes all context providers.
 *
 * ClerkProvider is conditionally mounted only when
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set (cloud sync opt-in).
 * The app works fully offline/local without Clerk configured.
 */

// Lazy-load ClerkProvider so the bundle is clean when Clerk is not configured.
// We use a dynamic require inside the render to avoid a top-level import error
// when @clerk/nextjs is present but no key is set.
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MaybeClerkProvider({ children }: { children: ReactNode }) {
  if (!CLERK_KEY) return <>{children}</>;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ClerkProvider } = require('@clerk/nextjs') as typeof import('@clerk/nextjs');
  return <ClerkProvider publishableKey={CLERK_KEY}>{children}</ClerkProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MaybeClerkProvider>
      <ProfileProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </ProfileProvider>
    </MaybeClerkProvider>
  );
}
