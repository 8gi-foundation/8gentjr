'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AccountType } from '@/lib/account';
import type { CardSize, LayoutDensity, LayoutPresetId } from '@/lib/layout-presets';
import type { LayoutPrimitiveId } from '@/lib/layout-primitives';

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
  /**
   * Browser-side AI (SmolLM2) opt-in. Off by default — user must explicitly
   * enable and accept the one-time download. All inference runs on-device.
   */
  smartSuggestionsEnabled: boolean;
  /** True once the model weights are cached in the browser (Cache API). */
  smollmDownloaded: boolean;
  /**
   * GLP Tier 2.5 - "Your Words" pinned row at the top of /talk Core.
   * On by default. Hides the row when the child has no qualifying words yet,
   * regardless of this flag.
   */
  showPersonalVocab: boolean;
  /**
   * Layout preset system. cardSize + showPredictions are layout knobs bundled
   * by presets (see src/lib/layout-presets.ts). activeLayoutPreset records the
   * currently selected preset, or 'custom' when the user has hand-tuned any
   * layout setting. density is advisory metadata carried alongside the bundle.
   */
  cardSize: CardSize;
  showPredictions: boolean;
  density: LayoutDensity;
  activeLayoutPreset: LayoutPresetId;
  /**
   * Layout primitives (structural layout dimension, see
   * src/lib/layout-primitives.ts). Records which structural surface the Talk
   * Core renders. Presentation-only and gated behind the layoutPrimitives
   * feature flag - when the flag is off this value is ignored and the surface
   * always resolves to 'alpha' (the current fixed grid). Default 'alpha'.
   */
  activeLayoutPrimitive: LayoutPrimitiveId;
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
  smartSuggestionsEnabled: false,
  smollmDownloaded: false,
  showPersonalVocab: true,
  // Layout preset defaults match the "Big & Simple" preset (3 columns, large
  // cards, predictions off) - the safest starting point for new communicators.
  cardSize: 'large',
  showPredictions: false,
  density: 'relaxed',
  activeLayoutPreset: 'big-simple',
  // Structural layout primitive. 'alpha' = the current fixed grid. Only has an
  // effect when the layoutPrimitives feature flag is enabled.
  activeLayoutPrimitive: 'alpha',
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
