// Build-time guard: a production deploy must never carry a Clerk development
// (pk_test / sk_test) instance key. Wired from next.config so it runs while
// `next build` loads the config (phase-production-build only). It fails the BUILD only: the running site never
// evaluates this, so the current production deployment stays up and only a new
// deploy is blocked.
//
// Limits (do not describe this as "production can never carry pk_test"):
//  - Vercel promote and Instant Rollback do not run a build, so they can re-serve a
//    deployment that was built with a pk_test key.
//  - Builds without VERCEL_ENV (Docker, self-host, CI build then upload) are not covered.
//  - It only inspects NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.
//  - Once merged, every Vercel Production build fails until the live keys are set, so
//    merge only in the same window as the pk_live/sk_live swap.

export const PK_MESSAGE =
  "Production cannot use a Clerk development key (pk_test). Set the live pk_live key in Vercel Production.";
export const SK_MESSAGE =
  "Production cannot use a Clerk development secret (sk_test). Set the live sk_live key in Vercel Production.";

/** Throws when env describes a production build that points at a Clerk dev instance. */
// `phase` is the first argument Next passes to a function-style next.config export.
// process.env.NEXT_PHASE is not set yet when the config loads, so it cannot be used.
export function assertNoDevClerkKeyInProduction(phase, env = process.env) {
  if (phase !== "phase-production-build") return;
  if (env.VERCEL_ENV !== "production") return;
  if ((env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim().startsWith("pk_test_")) {
    throw new Error(PK_MESSAGE);
  }
  if ((env.CLERK_SECRET_KEY ?? "").trim().startsWith("sk_test_")) {
    throw new Error(SK_MESSAGE);
  }
}
