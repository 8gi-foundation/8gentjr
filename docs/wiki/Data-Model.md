# Data Model

There is **no database**. Data lives in three places: browser storage on the child's device, append-only files on the server, and optionally Vercel Blob for the consent audit.

## Browser storage (localStorage unless noted)

| Key | Source | Content |
|-----|--------|---------|
| `8gentjr-app-settings` | `src/context/AppContext.tsx` | Settings (below) |
| `8gentjr_session_events` | `src/lib/session-logger.ts` | Events `word_used`, `session_start`, `session_end` with timestamp and data. Old logs pruned after 30 days by `clearOldLogs` |
| `8gentjr_sentence` | `src/lib/sentence-store.ts` | Current sentence: array of `{label, imageUrl?, className?, style?, isGestalt?}` |
| `8gentjr_phrases` | `QuickPhrases.tsx` | Saved phrases |
| `8gentjr_phrase_folders` | `src/lib/phrase-folders.ts` | Folder names |
| `8gentjr-custom-cards` | `src/app/add/page.tsx` | Custom cards |
| `8gentjr_custom_cards` | `VoiceCardCreator.tsx` | Voice-created cards, capped at 100. Different key from the one above (hyphen versus underscore) |
| `8gentjr_songs` | `SongCreator.tsx`, `/music` | Saved songs, capped at 50 |
| `8gentjr-glp-disable` | `SupercoreGrid.tsx` | Stage filter switch |
| `8gentjr_parental_consent` | `privacy-constants.ts` | Consent record key |
| `8gentjr_privacy_state` | `src/lib/privacy-store.ts` | `{status: active/withdrawn/deleted, withdrawnAt, gracePeriodDays (default 30), purgeAfter, parentEmail}` |
| `8gentjr_deletion_proof` | `privacy-store.ts` | Email SHA-256, timestamp, reason, policy version, receipt id |
| `8gentjr-parental-gate-passed` | `ActivatedRedirect.tsx` | Set after consent activation |
| `8gentjr_install_dismissed` | `InstallPrompt.tsx` | Install prompt dismissed |
| `arasaac-recent-searches` | `SymbolSearch.tsx` | Recent symbol searches |
| `8gentjr-companion-name`, `8gentjr-companion-hue` | `useCompanion.ts` | Companion preferences |
| `8gentjr-math-calm-mode`, `8gentjr-math-sound`, `8gentjr-math-garden-favourites` | maths pages | Preferences and favourites |
| guided lesson progress | `src/lib/guided-learning.ts` | Per lesson, prefixed `8gentjr-guided-` per the README; exact keys not yet documented |
| `8gentjr-unlocked` (sessionStorage) | `LockScreenGate.tsx` | Lock screen unlocked this session |

### AppSettings fields

`childName`, `primaryColor`, `selectedVoiceId`, `ttsRate`, `ttsVolume`, `gridColumns`, `hasCompletedOnboarding`, `glpStage` (default 3), `accountType`, `birthYear`, `isChild`, `carerRelationship`, `guardianConfirmed`, `parentEmailConfirmed`, `gatedAt`, `smartSuggestionsEnabled` (default false), `smollmDownloaded`, `showPersonalVocab` (default true), `cardSize`, `showPredictions`, `density`, `activeLayoutPreset` (default `big-simple`).

### Account types (`src/lib/account.ts`)

`child_under_13`, `self_13_plus`, `carer_13_plus`. Only birth year is kept, never a full date of birth. The record is merged into settings, not stored separately.

## Server files (JSON Lines, created at runtime under `data/`)

| File | Source | Fields |
|------|--------|--------|
| `data/consent/vpc-audit.jsonl` (directory set by `VPC_AUDIT_DIR`) | `src/lib/consent/audit-store.ts` | `ts`, `event` (step1-sent, step1-confirmed, step2-sent, step2-confirmed, expired, withdrawn), `sid`, `email`, `step`, `tokenHash`, `ip`, `userAgent` (browser string), `noticeVersion`, `childProfileId` |
| `data/consent/outbox.jsonl` | `email-sender.ts` | Log-only copy of emails when no provider key is set |
| `data/privacy/ledger.jsonl` | `src/lib/privacy-server.ts` | `kind` (withdraw, withdraw-restored, delete), `at`, `emailHash` (SHA-256), `purgeAfter`, `gracePeriodDays`, `receiptId`, `policyVersion` |
| `data/feedback/submissions.jsonl` | `src/lib/feedback-store.ts` | `id`, `createdAt`, `role`, `relationship`, works well, should change, optional contact email, hashed IP, browser string |

With the Blob backend, each consent audit row is one private JSON object under `vpc-audit/`.

`data/resources/index.json` is a static catalogue of one research reference (a public genetics dataset), not user data.

## Static data in code

`src/lib/vocabulary.ts` and `src/lib/glp/vocabulary.ts` (word lists), `src/lib/glp/stages.ts` (six stages), `src/lib/social-stories.ts`, `src/lib/schedule.ts`, `src/lib/vsd/scenes.ts`, `src/lib/reels-data.ts`, `src/lib/emotional-playlists.ts`, `src/lib/toolshed/index.ts`, `src/lib/layout-presets.ts`.
