"use client";

import { useState, useEffect, useCallback } from "react";

const PINNED_KEY  = "8gentjr_pinned_scripts";
const SCRIPTS_KEY = "8gentjr_phrases";          // storage key unchanged for backward compat

export interface SavedScript {
  id: string;
  text: string;
  category: string;
  createdAt: number;
}

function loadPinnedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]"); } catch { return []; }
}

function savePinnedIds(ids: string[]) {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(ids)); } catch {}
}

export function getPinnedScripts(): SavedScript[] {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]");
    const all: SavedScript[] = JSON.parse(localStorage.getItem(SCRIPTS_KEY) ?? "[]");
    const byId = new Map(all.map(s => [s.id, s]));
    return ids.map(id => byId.get(id)).filter(Boolean) as SavedScript[];
  } catch { return []; }
}

export function usePinnedScripts() {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    setPinnedIds(loadPinnedIds());
    const onSync = () => setPinnedIds(loadPinnedIds());
    window.addEventListener("pinned-scripts-changed", onSync);
    return () => window.removeEventListener("pinned-scripts-changed", onSync);
  }, []);

  const toggle = useCallback((id: string) => {
    const current = loadPinnedIds();
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    savePinnedIds(next);
    setPinnedIds(next);
    window.dispatchEvent(new Event("pinned-scripts-changed"));
  }, []);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  return { pinnedIds, toggle, isPinned };
}
