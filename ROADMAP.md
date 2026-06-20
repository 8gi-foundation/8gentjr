# 8gent Jr — Roadmap

_Living roadmap. Generated 2026-06-14 from repo state. Edit freely — the glasses read this aloud._

## Now / In progress
- [ ] **Math route** — finish `feat/math-route`: the Wave lesson, calm-mode sketches, and Dock entry are built but uncommitted-to-main and not yet merged.
- [ ] **Fix the broken build** — `bun run build` exits 1 prerendering `/talk/core` and `/math/wave`; add `dynamic = 'force-dynamic'` and a build CI job.
- [ ] **Truthful onboarding copy** — onboarding claims "all data stays on this device", but prod TTS and autocomplete go to ElevenLabs and Groq; soften to match `/privacy`.

## Next
- [ ] **Wire consent to the real VPC engine** — default path skips the email-plus flow; route onboarding through `/api/consent/initiate` and gate egress on `parentEmailConfirmed`.
- [ ] **Durable VPC scheduling** — the 24h second email uses in-process `setTimeout`, which Vercel kills; move to Vercel Cron or a queue.
- [ ] **Keyboard and switch-access taps** — `TapCard` fires only on pointer-up, so switch hardware and screen readers cannot select a word; add click and Enter/Space.
- [ ] **Social preview images** — `public/og.png` and `public/logo.png` are referenced but missing; add them or a dynamic OG image.

## Later
- [ ] **Public front door** — the home page is redirect-only; build a marketing route group for parents, educators, and therapists.
- [ ] **Offline support** — add a service worker and cache the app shell, last board, and a subset of ARASAAC pictograms for PWA offline use.
- [ ] **Simplify navigation** — the Dock buries 14 flat items in one More overlay; mirror the iOS Daily / Play & Explore / For grown-ups structure.
- [ ] **Wire or delete dead motor-lock** — `src/lib/motor-lock.ts` exists but nothing imports it, so web still duplicates chips on rapid taps.
- [ ] **Changelog and version** — stuck at 0.1.0 with no CHANGELOG across ~15 shipped PRs; add one and bump.

## Done (recent)
- **Math route v1** — `/math` with a Wave lesson and calm-mode-aware sketches.
- **Educator and government guides** — `/guides/educator` IEP walkthrough and `/guides/government` public-sector brief.
- **EU AI Act guard** — CI blocks emotion and affect-detection imports.
- **GLP adaptive AAC layer** — Blend engine, on-device stage estimator, predictive next-word strip, and personal vocab promotion.
- **Email-plus VPC consent flow** — COPPA child-account flow with age gate, HMAC tokens, and an immutable audit log.
- **On-device smart suggestions** — SmolLM2-135M plus a rules engine for local autocomplete.
