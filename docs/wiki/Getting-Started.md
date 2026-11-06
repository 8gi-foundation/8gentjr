# Getting Started

## Prerequisites

- Node.js and npm (the README uses `npm install` and `npm run dev`). A Node version is not pinned in `package.json`: not yet documented. Next.js 15 and React 19 are the declared dependencies.
- [Bun](https://bun.sh) to run the tests (`bun test`) and the banned-imports check. CI uses Bun.
- Optional: a self-hosted Ollama server for the parent chat helper.
- Optional: keys for Clerk, the transactional email provider and others (see [Operations](Operations.md)). The README states most keys are optional for a first look.

## Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Both `package-lock.json` and `bun.lock` are committed. The README documents npm.

## Scripts (from `package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Local dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the build |
| `lint` | `next lint` | Next.js lint. No ESLint dependency is listed in `package.json`, so whether this runs cleanly is not yet verified |
| `lint:banned-imports` | `bun run scripts/check-banned-imports.ts` | Blocks emotion and affect detection imports |
| `test` | `bun test` | Unit tests |
| `privacy:pending` | `node scripts/privacy-admin.mjs pending` | Lists pending privacy withdrawals from the local ledger |

`ROADMAP.md` records that `bun run build` was failing when prerendering `/talk/core` and `/math/wave` at the time it was written. Check the current state before relying on a production build.

## First run

Open the app. `/` redirects to `/onboarding` until onboarding is complete, then to `/talk`. An age gate appears first (see [Security-and-Privacy](Security-and-Privacy.md)).

Without keys the app falls back to local behaviour: device speech, rules-based suggestions, and log-only email. `VPC_TOKEN_SECRET` is required in production and is needed to exercise the consent flow properly.
