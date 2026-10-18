// Build-time guard: a production deploy must never carry a Clerk development
// (pk_test / sk_test) instance key. Wired from next.config so it runs while
// `next build` loads the config (phase-production-build only). It fails the BUILD only: the running site never
// evaluates this, so the current production deployment stays up and only a new
// deploy is blocked.

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
