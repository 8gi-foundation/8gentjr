'use client';

/**
 * AuthBadge — minimal sign-in indicator for adult (13+) surfaces.
 *
 * Shows:
 *   - SignedIn: Clerk's <UserButton/> (popover w/ sign-out)
 *   - SignedOut: a "Sign in" link
 *
 * Intentionally NOT shown on the child-facing lockscreen + dock flow,
 * because under-13 accounts stay device-bound per COPPA + the DPIA.
 */
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export function AuthBadge() {
  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-sm font-medium px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:opacity-90"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
