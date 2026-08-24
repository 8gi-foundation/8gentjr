'use client';

import { useEffect, useState } from 'react';

const KEY = '8gentjr-math-calm-mode';

/**
 * Calm Mode. One switch, one key, shared by every surface that reads it.
 *
 * On by default. Halves motion, mutes haptics, lowers density on busier
 * sketches. Persists per-device in localStorage so a returning child stays in
 * their preferred mode.
 *
 * It began under /math and this comment used to say so, but it is now read by
 * the science sandboxes too, and in the cymatics plate it is one of the two
 * things standing between a sensory-sensitive child and three thousand grains
 * of boiling sand. Saying "for /math" while that is true would invite somebody
 * to move or rename the key without knowing what else leans on it.
 *
 * The toggle itself is deliberately NOT on every surface. It is a preference,
 * not a per-activity control, and one switch that reaches everything is easier
 * for a carer to reason about than five that each do a little.
 */
export function useCalmMode(): [boolean, (next: boolean) => void] {
  const [calm, setCalm] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'false') setCalm(false);
    else if (stored === 'true') setCalm(true);
  }, []);

  const update = (next: boolean) => {
    setCalm(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, String(next));
    }
  };

  return [calm, update];
}
