# Testing

## Run

```bash
bun test
```

Tests use Bun's runner with no config file. There are 21 test files, all under `src/lib`.

## Coverage by area

| Test file | Covers |
|-----------|--------|
| `account.test.ts` | Age gate, validation, routing |
| `card-gradients.test.ts` | Gradients avoid the banned hue band |
| `contrast.test.ts` | Contrast maths and accent surfaces |
| `feedback-store.test.ts` | Feedback storage |
| `fractal-grower*.test.ts`, `harmonograph*.test.ts`, `pattern-garden*.test.ts`, `water-sphere*.test.ts` | Toy maths and one-time naming lines |
| `guided-learning.test.ts`, `guided-naming.test.ts` | Guided steps, progress, naming lines |
| `math-audio.test.ts` | Sonification mapping |
| `phrase-folders.test.ts` | Phrase folders |
| `privacy-store.test.ts` | Withdraw and delete primitives |
| `security-headers.test.ts` | Baseline headers |
| `voice-analysis.test.ts`, `voice-play.test.ts` | Audio analysis and Voice Play exercises |
| `consent/__tests__/flow.test.ts` | Consent tokens and flow |

## Not covered

No tests for API routes, components, middleware, `session-logger`, `sentence-store`, `personal-vocab`, `predictive`, `stage-estimator`, `motor-lock`, `sentence-engine`, or `privacy-server`.

## CI

CI runs only the banned-imports check (`bun run scripts/check-banned-imports.ts`). It scans source files for import sources on a fixed list of face, voice and emotion recognition packages and name patterns. It checks single-line imports only and does not read `package.json`. Tests, build and lint are not in CI.
