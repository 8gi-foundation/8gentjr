/**
 * User-created phrase folders (topic categories).
 *
 * Phrases store their folder in `category`. Folders that a user creates are
 * also persisted on their own so an empty folder still shows as a filter chip
 * (a phrase-derived list alone would drop folders with no phrases in them).
 *
 * Mirrors the localStorage persist pattern used for phrases in QuickPhrases.
 */

const FOLDERS_STORAGE_KEY = "8gentjr_phrase_folders";

/** Folder names auto-assigned by `autoCategory`; never treated as removable custom folders. */
export const AUTO_FOLDERS = [
  "Feelings",
  "Requests",
  "Questions",
  "Social",
  "Food",
  "School",
  "Body",
  "Common",
] as const;

const AUTO_SET = new Set<string>(AUTO_FOLDERS);

export function isAutoFolder(name: string): boolean {
  return AUTO_SET.has(name);
}

export function loadFolders(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLDERS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
  } catch {
    return [];
  }
}

export function persistFolders(folders: string[]) {
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {}
}

/** Normalise a folder name: trim + collapse internal whitespace. */
export function normaliseFolder(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Add a folder, preserving order and avoiding case-insensitive duplicates.
 * Returns the (possibly unchanged) list and the canonical stored name so the
 * caller can select the existing folder rather than create a clashing one.
 */
export function addFolder(folders: string[], name: string): { folders: string[]; name: string } {
  const clean = normaliseFolder(name);
  if (!clean) return { folders, name: "" };
  const existing = folders.find(f => f.toLowerCase() === clean.toLowerCase());
  if (existing) return { folders, name: existing };
  return { folders: [...folders, clean], name: clean };
}

export function removeFolder(folders: string[], name: string): string[] {
  return folders.filter(f => f !== name);
}
