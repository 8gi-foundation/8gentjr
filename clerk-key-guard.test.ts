import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { assertNoDevClerkKeyInProduction, PK_MESSAGE, SK_MESSAGE } from "./clerk-key-guard.mjs";

const PHASE = "phase-production-build";
const build = { VERCEL_ENV: "production" };

describe("assertNoDevClerkKeyInProduction", () => {
  test("fails a production build with a pk_test key", () => {
    expect(() =>
      assertNoDevClerkKeyInProduction(PHASE, { ...build, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc" }),
    ).toThrow(PK_MESSAGE);
  });
  test("fails a production build with an sk_test secret", () => {
    expect(() =>
      assertNoDevClerkKeyInProduction(PHASE, {
        ...build,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc",
        CLERK_SECRET_KEY: "sk_test_abc",
      }),
    ).toThrow(SK_MESSAGE);
  });
  test("passes a production build with live keys", () => {
    expect(() =>
      assertNoDevClerkKeyInProduction(PHASE, {
        ...build,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc",
        CLERK_SECRET_KEY: "sk_live_abc",
      }),
    ).not.toThrow();
  });
  test("allows pk_test on preview and development", () => {
    for (const VERCEL_ENV of ["preview", "development", undefined]) {
      expect(() =>
        assertNoDevClerkKeyInProduction(PHASE, {
          VERCEL_ENV,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
        }),
      ).not.toThrow();
    }
  });
  test("never fires outside the build phase (running site stays up)", () => {
    for (const phase of ["phase-development-server", "phase-production-server", undefined]) {
      expect(() =>
        assertNoDevClerkKeyInProduction(phase as string, {
          VERCEL_ENV: "production",
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
        }),
      ).not.toThrow();
    }
  });
});

describe("shipped path: loading next.config", () => {
  const load = (env: Record<string, string>, phase = PHASE) =>
    spawnSync("bun", ["-e", `const c = (await import("./next.config.mjs")).default; if (typeof c === "function") await c(process.env.TEST_PHASE)`], {
      cwd: import.meta.dir,
      env: { PATH: process.env.PATH ?? "", TEST_PHASE: phase, ...env },
      encoding: "utf8",
    });

  test("production build with pk_test exits non-zero with the clear message", () => {
    const r = load({ ...build, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc" });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(PK_MESSAGE);
  });
  test("same env at server start loads cleanly (current deployment unaffected)", () => {
    const r = load({ ...build, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc" }, "phase-production-server");
    expect(r.status).toBe(0);
  });
  test("production build with pk_live loads cleanly", () => {
    const r = load({ ...build, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc" });
    expect(r.status).toBe(0);
  });
});
