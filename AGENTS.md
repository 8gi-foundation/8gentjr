# Contributing to 8gent Jr

8gent Jr is a free, personalised communication and learning app for neurodivergent children (autism, ADHD): AAC picture cards, adaptive learning, and parent tools. It is open source under Apache 2.0. See [README.md](README.md) for the full feature list and architecture.

## Build and test

Requirements: Node.js and npm (or Bun).

```bash
npm install
npm run dev          # local dev server
npm run build        # production build
npm run lint         # Next.js lint
npm run lint:banned-imports   # blocks banned imports (see below)
npm test             # bun test
```

Most environment keys are optional for local development; the app falls back gracefully. `VPC_TOKEN_SECRET` is required when you exercise the parental consent flow. See the Development section of the README.

## Contribution rules

- Open an issue before starting non-trivial work, and reference it in your pull request.
- Work on a branch (`feat/...`, `fix/...`, `docs/...`) and open a pull request. Do not push directly to `main`.
- Run lint and tests before you push.
- Keep changes small and focused.

## Product rules

- Child privacy comes first. Features for users under 13 go through the parental consent flow in `src/lib/consent/`.
- No emotion or affect detection libraries. The `lint:banned-imports` check enforces this.
- Core functionality stays free. No paywalls on the communication tools.
- Accessibility is the primary design constraint. Symbols and AAC board positions stay stable so children can build motor memory.
- Do not commit secrets, credentials or personal data.

## License

Apache 2.0. See [LICENSE](LICENSE).
