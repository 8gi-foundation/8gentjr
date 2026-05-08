'use client';

import { useEffect, useState } from 'react';

const KEY = '8gentjr-math-calm-mode';

/**
 * Calm Mode toggle for /math.
 *
 * On by default. Halves motion, mutes haptics, lowers density on busier
 * sketches. Persists per-device in localStorage so a returning child stays
 * in their preferred mode.
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
