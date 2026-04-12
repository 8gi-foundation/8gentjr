'use client';

/**
 * ProfileContext — local-first identity layer.
 *
 * Works 100% offline with no Clerk configured.
 * When Clerk IS configured, isSignedIn reflects Clerk auth state.
 * Local profile is always available as the source of truth for child settings.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  getOrCreateLocalProfile,
  updateLocalProfile,
  type LocalProfile,
} from '@/lib/local-profile';

interface ProfileContextValue {
  profile: LocalProfile | null;
  isLoaded: boolean;
  /** Always true once local profile is loaded — no login gate */
  isSignedIn: boolean;
  updateProfile: (updates: Partial<LocalProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getOrCreateLocalProfile()
      .then((p) => {
        setProfile(p);
      })
      .catch(() => {
        // IndexedDB unavailable (SSR or private mode) — use in-memory fallback
        setProfile({ id: 'local', childName: '', createdAt: new Date().toISOString() });
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  async function updateProfile(updates: Partial<LocalProfile>) {
    const updated = await updateLocalProfile(updates);
    setProfile(updated);
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoaded,
        isSignedIn: isLoaded, // local profile = signed in
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
