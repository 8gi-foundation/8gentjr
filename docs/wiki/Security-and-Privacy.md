# Security and Privacy

This page describes what the code does today. `AGENTS.md` states the product is COPPA compliant and GDPR work is in progress; the gaps below should be read alongside that claim.

## What is collected and where it lives

| Data | Where | Who can see it |
|------|-------|----------------|
| Child's taps, sentences, custom cards, songs, settings, usage events | Browser localStorage on the device ([Data-Model](Data-Model.md)) | Anyone using that browser profile |
| Birth year, account type | Browser settings | Same |
| Parent email, raw IP, browser string, token hash, timestamps (consent steps) | Server audit log: file, or private Vercel Blob | Holders of `VPC_ADMIN_TOKEN` or file/Blob access; the email provider sees the address and links |
| Privacy ledger: SHA-256 of email, receipt ids | `data/privacy/ledger.jsonl` | Holders of `PRIVACY_ADMIN_TOKEN` or file access |
| Feedback text, optional contact email, hashed IP, browser string | `data/feedback/submissions.jsonl` | File access or the CLI script |
| Account identity for 13+ users | Clerk | Clerk and the operator |
| Parent chat messages | Sent to the host in `OLLAMA_HOST`; not stored by the route | That host's operator |
| Child phrases used for songs | Sent to hosted services only if their keys are set | Those services |
| Symbol search terms | Sent from the browser to ARASAAC | ARASAAC |
| Speech recognition audio | Browser speech service (some browsers send audio to their vendor) | Browser vendor |

Speech output uses the device (`src/lib/tts.ts`); hosted speech was removed and `/api/tts` returns 410. Microphone analysis for Voice Play and Sound Art runs on the device. Emotion and affect detection libraries are blocked by CI.

## Accounts

Under-13 users are device-bound and do not sign in; a parent completes the two-step email consent flow. Users 13 and over may use Clerk. Only `/parent` uses a Clerk sign-in guard, and that is a client-side UI guard.

## Consent flow (`src/lib/consent`)

1. Parent enters an email at `/parent-email-verification` (`/api/consent/initiate`), a signed step 1 token is emailed.
2. Clicking it (`/api/consent/confirm-step1`) records confirmation and schedules the second email after `VPC_STEP2_DELAY_MS` (default 24 hours).
3. Clicking the second link (`/api/consent/confirm-step2`) records step 2 and `/consent/activated` sets browser flags.

Tokens are HMAC-signed, expire in 7 days, and single use is checked against the audit log. The README says step 2 arrives about 10 minutes after step 1; the code default is 24 hours.

## Security headers

Enforced: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, and a `Permissions-Policy` allowing only the microphone for the site. A fuller Content Security Policy is **report-only** (it blocks nothing, has no report endpoint, and allows `'unsafe-inline'` scripts). No HSTS header is set in the app config.

## Known gaps (as observed in code)

1. Activation is client-side only. Consent is stored as browser flags that anyone can set; the server keeps no active-account state and does not link consent to a child's data.
2. `/api/privacy/withdraw` and `/api/privacy/delete` have no authentication or proof the caller owns the email. They write a ledger entry only; nothing server-side is deleted and no job enforces the grace period.
3. The "delete everything" list (`CHILD_DATA_KEYS` in `privacy-store.ts`) does not match the keys the app actually writes, for example `8gentjr_session_events`, `8gentjr_sentence`, `8gentjr_phrases`, `8gentjr_custom_cards`, `8gentjr_songs`. Child data can remain after deletion.
4. Privacy emails (`privacy-email.ts`) are log-only stubs; no email is sent although the screens suggest one.
5. The second consent email uses an in-process timer that can be lost on serverless hosting. Single-use token checks can race. The step 2 delay is not checked at confirmation time.
6. No rate limiting on consent initiation, song generation, song status, parent chat, privacy routes or icon generation. The feedback limiter is in memory per process.
7. Clerk middleware protects no route. Admin tokens are compared with plain equality.
8. File-based stores (`data/privacy`, `data/feedback`, consent file backend) fail or lose data on read-only or ephemeral hosts. `.gitignore` covers `data/consent/` and `data/health/` but not `data/privacy/` or `data/feedback/`.
9. The raw parent email and IP are stored in the audit log, the email also in browser privacy state and in log lines from the stubs.
10. The privacy page describes browser speech recognition as on-device, which comments in `security-headers.mjs` flag as wrong (issue #258 referenced there). The song feature's disclosure on the privacy page is not yet verified.
11. Development fallbacks exist for the token secret (non-production only) and the feedback IP salt (a fixed constant when unset).
12. If `NEXT_PUBLIC_SITE_URL` is unset, consent link hosts derive from request headers.
13. A demo PIN dialog with a hard-coded PIN exists but is not used.
