/**
 * Local profile — UUID-based identity stored in IndexedDB.
 * No login required. Clerk is opt-in cloud sync only.
 */

import { put, get } from './offline';

export interface LocalProfile {
  id: string;
  childName: string;
  createdAt: string;
}

const PROFILE_KEY = 'local-profile';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the existing local profile, or creates a new one on first call.
 * Stored in IndexedDB under the "settings" store, key "local-profile".
 */
export async function getOrCreateLocalProfile(): Promise<LocalProfile> {
  const existing = await get<LocalProfile>('settings', PROFILE_KEY);
  if (existing) return existing;

  const profile: LocalProfile = {
    id: generateId(),
    childName: '',
    createdAt: new Date().toISOString(),
  };

  await put('settings', PROFILE_KEY, profile);
  return profile;
}

/**
 * Merges updates into the existing local profile and persists.
 * Creates a profile first if none exists.
 */
export async function updateLocalProfile(
  updates: Partial<LocalProfile>
): Promise<LocalProfile> {
  const current = await getOrCreateLocalProfile();
  const updated: LocalProfile = { ...current, ...updates, id: current.id };
  await put('settings', PROFILE_KEY, updated);
  return updated;
}
