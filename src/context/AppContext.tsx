'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AccountType } from '@/lib/account';

/**
 * 8gent Jr App Context
 *
 * Manages personalization settings and user preferences.
 * Persists to localStorage.
 */

export interface AppSettings {
  childName: string;
  primaryColor: string;
  selectedVoiceId: string | null;
  ttsRate: number;
  ttsVolume: number;
  gridColumns: number;
  hasCompletedOnboarding: boolean;
  glpStage: number;
  /**
   * DPIA age gate (issue #116).
   * accountType + birthYear are captured BEFORE account creation.
   * Birth YEAR only (never full DOB) - band captured for compliance.
   */
  accountType: AccountType | null;
  birthYear: number | null;
  isChild: boolean;
  carerRelationship: string | null;
  guardianConfirmed: boolean;
  /** Set once both consent emails are confirmed in the VPC flow. */
  parentEmailConfirmed: boolean;
  gatedAt: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  childName: '',
  primaryColor: '#4CAF50',
  selectedVoiceId: null,
  ttsRate: 1.0,
  ttsVolume: 1.0,
  gridColumns: 3,
  hasCompletedOnboarding: false,
  glpStage: 3,
  accountType: null,
  birthYear: null,
  isChild: false,
  carerRelationship: null,
  guardianConfirmed: false,
  parentEmailConfirmed: false,
  gatedAt: null,
};

const STORAGE_KEY = '8gentjr-app-settings';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // Use defaults
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Update settings and persist
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
