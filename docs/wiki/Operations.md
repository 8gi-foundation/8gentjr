# Operations

## Deploy

The README states the app runs on Vercel at 8gentjr.com. The repository has no `vercel.json` and no Dockerfile; `.vercel` is git-ignored. Project settings on the host are not yet documented here.

Build and start with `npm run build` and `npm run start`. See the build caveat in [Getting-Started](Getting-Started.md).

## CI

- `.github/workflows/banned-imports.yml`: runs `bun run scripts/check-banned-imports.ts` on pull requests touching source or the script, and on pushes to `main`.
- `.github/workflows/notify-governance.yml`: on push to `main`, sends a repository dispatch event to the foundation's governance repository using a repository secret.

No workflow runs tests, a build, a type check or lint.

## Environments and environment variable names

Values are never committed. Copy `.env.example` to `.env.local`. Names only:

| Name | Purpose |
|------|---------|
| `OLLAMA_HOST` | Self-hosted language model URL for parent chat. `disabled` turns it off. Default `http://localhost:11434` |
| `PRIVACY_GRACE_PERIOD_DAYS` | Withdrawal grace period, default 30 |
| `PRIVACY_ADMIN_TOKEN` | Guards `/api/privacy/admin` |
| `VPC_TOKEN_SECRET` | Signs consent tokens. Required in production |
| `VPC_STEP2_DELAY_MS` | Delay before the second consent email, default 86400000 (24 hours) |
| `VPC_ADMIN_TOKEN` | Guards `/api/consent/admin` |
| `VPC_AUDIT_DIR` | Directory for the consent audit log and outbox; forces the file backend |
| `AGENTMAIL_API_KEY` | Enables the email provider; without it emails are only logged |
| `AGENTMAIL_FROM_INBOX` | Sender inbox, default `privacy@8gentjr.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk accounts |
| `BLOB_READ_WRITE_TOKEN` | Selects the Vercel Blob consent audit backend |
| `FEEDBACK_IP_SALT` | Salt for hashing feedback IPs |
| `INTERNAL_API_SECRET` | Guards `/api/video/render` |
| `NEXT_PUBLIC_SITE_URL` | Base URL for consent links; if unset it is derived from request headers |
| `OPENAI_API_KEY`, `SUNO_API_KEY` | Optional hosted services for song creation |
| `NODE_ENV` | Production check in token handling |

`BLOB_READ_WRITE_TOKEN`, `FEEDBACK_IP_SALT`, `INTERNAL_API_SECRET`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY` and `SUNO_API_KEY` are used in code but missing from `.env.example`.

## Operating notes

- Consent step 2 is scheduled with an in-process timer. On serverless hosting this can be lost; recover with `POST /api/consent/admin` action `retry-step2`.
- `npm run privacy:pending` reads `data/privacy/ledger.jsonl` locally. `scripts/list-feedback.mjs` lists feedback from the local file.
- Server writes go to `data/` on the local filesystem. On read-only or ephemeral hosting these writes fail or are lost (see gaps in [Security-and-Privacy](Security-and-Privacy.md)).
