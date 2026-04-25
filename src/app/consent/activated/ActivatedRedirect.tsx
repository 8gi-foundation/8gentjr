'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ActivatedRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      sessionStorage.setItem('8gentjr-unlocked', 'true');
      localStorage.setItem('8gentjr-parental-gate-passed', 'true');
    } catch {}
    const t = setTimeout(() => router.replace('/talk'), 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
