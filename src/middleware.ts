/**
 * Clerk middleware (accounts v1).
 *
 * All routes stay public at the middleware layer. Clerk just attaches auth
 * state so server components can read it via `auth()` and UI can read it via
 * `<SignedIn/>` / `<SignedOut/>`. COPPA path for under-13 stays device-bound
 * (no sign-in required); 13+ path gets persistent identity via Clerk.
 */
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run on API + trpc routes.
    '/(api|trpc)(.*)',
  ],
};
