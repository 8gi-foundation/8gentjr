# Architecture

## Stack

- Next.js 15 (App Router) and React 19, TypeScript, Tailwind CSS 3.
- Clerk (`@clerk/nextjs`) for accounts, wired in `src/middleware.ts` and `src/app/layout.tsx`.
- `@huggingface/transformers` for an optional on-device small language model in a web worker.
- Remotion packages are installed; the video render route is a stub (see below).
- `@vercel/blob` for an optional consent audit backend.
- No database. See [Data-Model](Data-Model.md).

## Folders

| Path | Contents |
|------|----------|
| `src/app` | Pages (`page.tsx`) and API routes (`api/*/route.ts`) |
| `src/components` | UI: AAC boards, games (`games/`), maths (`math/`), reels feed (`schooltube/`), guides |
| `src/lib` | Logic: vocabulary, GLP stages, consent, privacy, stores, audio and graphics maths, tests |
| `src/hooks` | Voice input, tap throttle, tap feedback, companion, sentence, guided discovery |
| `src/context/AppContext.tsx` | Settings held in React context and saved to localStorage |
| `src/workers/smollm.worker.ts` | On-device model worker |
| `src/styles/theme.ts` | Design tokens |
| `scripts` | Banned-imports check, privacy admin CLI, feedback listing CLI |
| `data/resources/index.json` | Static research reference catalogue (not user data) |
| `.github/workflows` | Two workflows (see [Testing](Testing.md)) |

## Data flow

1. **Child interaction** happens in the browser. Taps build a sentence held in `src/lib/sentence-store.ts` and spoken by the browser speech synthesis API (`src/lib/tts.ts`).
2. **Usage events** (words used, session start and end) are written to localStorage by `src/lib/session-logger.ts` and read by progress, prediction and stage-estimate features.
3. **Settings** are loaded and saved by `AppContext` under one localStorage key.
4. **Server routes** are used for consent email, privacy ledger entries, feedback, parent chat, and song generation.
5. **Page chrome** (`src/components/AppChrome.tsx`) decides gating: the age gate, then the lock screen, then the page with the dock and install prompt. Some routes are ungated (privacy, help, feedback, sign-in, sign-up, consent pages, guides). Onboarding and parent email verification get the age gate only.

## Server routes

`/api/autocomplete`, `/api/improve-sentence` (local rules, no external call), `/api/parent-chat` (Ollama), `/api/generate-song` and `/api/song-status` (optional hosted services), `/api/tts` (returns 410, hosted speech was removed), `/api/video/render` (stub, needs an internal secret), `/api/pwa-icon`, `/api/feedback`, `/api/consent/*`, `/api/privacy/*`. Details in [Security-and-Privacy](Security-and-Privacy.md).

## External services

| Service | Used for | Where |
|---------|----------|-------|
| Clerk | Accounts for 13+ users | `src/middleware.ts`, layout, `/sign-in`, `/sign-up`, `/parent` |
| ARASAAC | Pictogram search and images (browser calls) | `src/lib/arasaac.ts`, `/add`, `/symbols` |
| Hugging Face | One-time model download for optional smart suggestions | `src/workers/smollm.worker.ts` |
| Transactional email provider | Consent emails | `src/lib/consent/email-sender.ts` |
| Vercel Blob | Optional consent audit storage | `src/lib/consent/audit-store.ts` |
| Ollama (self-hosted) | Parent chat | `src/lib/ai-provider.ts` |
| Hosted language model and music generation | Optional song creation | `/api/generate-song`, `/api/song-status` |
| YouTube | Video reels and help videos | `src/lib/reels-data.ts`, `/help` |
| Browser speech services | Speech recognition in some browsers | `src/hooks/useVoiceInput.ts` |

The README names Vercel as the host. There is no `vercel.json`; see [Operations](Operations.md).
