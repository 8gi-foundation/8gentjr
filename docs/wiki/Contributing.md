# Contributing

Rules from `AGENTS.md` that apply to this repository:

- Work on a feature branch (`feat/`, `fix/`, `docs/`) and open a pull request. No direct push to `main`.
- Every change gets an issue first; link the pull request with `Closes #N`.
- Run the tests (`bun test`) and `bun run lint:banned-imports` before pushing.
- Use Bun for 8GI runtimes and tests.
- No em dashes in content or docs. No purple, pink or violet hues (270 to 350) in UI. `card-gradients.test.ts` and other tests check the hue rule.
- No secrets in commits. Environment values come from `.env.local`.
- Core functionality stays free. Accessibility outranks aesthetics.
- Features for users under 13 need the parental consent flow.
- No imports of emotion or affect detection libraries (EU AI Act); CI blocks them.
- No personal details about real children in any content, and no formal diagnosis claims.

Layout: see [Architecture](Architecture.md). Tests: [Testing](Testing.md).
