# 8gent Jr Wiki

8gent Jr is a free communication and learning app for neurodivergent children (autism, ADHD) and the adults who support them: parents, carers, teachers, and speech and language therapists. It runs in the browser and can be installed as a web app (PWA).

## The problem it solves

Many neurodivergent children communicate with picture cards, symbols and short phrases rather than spoken sentences. Commercial communication boards are often expensive, move words around, or send a child's data to the cloud. 8gent Jr offers:

- a communication board (AAC) with fixed word positions so a child can build motor memory;
- vocabulary stages based on how the child processes language (see [Glossary](Glossary.md));
- calm, no-fail learning toys for maths, science, music and sensory regulation;
- parent tools: visual schedules, social stories, progress view, and a consent and privacy flow for children under 13.

Most features keep their data in the browser on the device. Where the app calls a server or a third party, this wiki says so. Read [Security-and-Privacy](Security-and-Privacy.md) before deploying it for real children, because it lists known gaps.

## Who it is for

- **Children** using the board, games, music, science and maths pages.
- **Parents and carers** setting up the board, consent, schedules and settings.
- **Therapists and educators** (guides live in the app under `/guides/*`).

## Pages

| Page | What it covers |
|------|----------------|
| [Getting-Started](Getting-Started.md) | Prerequisites, install, run locally |
| [Architecture](Architecture.md) | Stack, folders, data flow, external services |
| [Features](Features.md) | Every screen and route |
| [Data-Model](Data-Model.md) | Browser keys, server files, types |
| [Operations](Operations.md) | Deploy, environments, environment variable names |
| [Security-and-Privacy](Security-and-Privacy.md) | Children's data, accounts, known gaps |
| [Accessibility](Accessibility.md) | What the code supports today |
| [Testing](Testing.md) | Unit tests and CI |
| [Contributing](Contributing.md) | Branches, PRs, repo rules |
| [Glossary](Glossary.md) | Terms used in the code and app |
| [Roadmap](Roadmap.md) | Existing plan documents, summarised |

Existing documents in the repository root: [README](../../README.md), [ROADMAP](../../ROADMAP.md), [AGENTS.md](../../AGENTS.md), [.env.example](../../.env.example).
