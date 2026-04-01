'use client';

import { type ReactNode } from 'react';
import { AppProvider } from '@/context/AppContext';

/**
 * Providers wrapper — centralizes all context providers.
 * Add new providers here as needed (auth, theme, etc).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
