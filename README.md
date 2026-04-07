# 8gent Jr

Personalised AI OS for neurodivergent children (Autism, ADHD). Free forever.

- **Domain:** 8gentjr.com
- **Parent:** 8GI Foundation
- **License:** Apache 2.0

## What it is

Not a generic kids' app. A personalised system that learns YOUR child's patterns, communication style, and routines. AAC (picture cards for speaking), adaptive learning, parent co-modelling.

## Architecture

- Next.js on Vercel (8gentjr.com)
- Auth via 8gent.app (Clerk)
- AI via 8gent-code kernel (local-first, privacy-first)
- Nick's instance at nick.8gentjr.com

## Neurodiversity & AAC Glossary

Terminology used in this codebase and why it matters. Using the wrong term confuses SLTs (speech-language therapists) and informed parents.

| Term | What it means | What NOT to confuse it with |
|------|--------------|----------------------------|
| **AAC** (Augmentative & Alternative Communication) | Any method that supplements or replaces spoken language — picture cards, symbol boards, speech-generating devices. Umbrella term. | "Special needs app" — too vague, avoid |
| **Core vocabulary** | ~400 high-frequency words (I, want, more, go, stop) that make up ~80% of what people say daily. Contrast with fringe vocabulary (specific nouns). | Topic vocabulary / fringe vocabulary |
| **Fringe vocabulary** | Context-specific words (banana, swimming, teacher). Important but secondary to core. | Core vocabulary |
| **Visual Scene Display (VSD)** | A scene-based AAC format: a contextually rich image with hotspot buttons overlaid. Tapping a hotspot produces a phrase. Developed by Beukelman & Janice Light. This is what the `/vsd` ("Scenes") route implements. | **Social Stories™** — completely different |
| **Social Stories™** | Short, first-person narratives written *about* a child to explain social situations and expected behaviour ("When I arrive at school, I hang my bag up first…"). Created by Carol Gray (1991). Evidence-based for autism. | Visual Scene Displays |
| **GLP (Gestalt Language Processing)** | A language acquisition style where children learn language in chunks/phrases ("ready-set-go", "do you want to?") before breaking them into parts. Contrast with analytic language processing. Many autistic children are gestalt processors. | Echolalia (overlapping but distinct) |
| **Fitzgerald Key** | A colour-coding system for AAC symbol categorisation: Yellow = pronouns, Green = verbs, Orange = nouns, Pink = adjectives/adverbs, Blue = prepositions, Red = negation/interjections, White = small words. Industry standard (used by Grid 3, Supercore, Snap Core). | Arbitrary colour choices |
| **Motor planning** | The muscle-memory principle that AAC words should NEVER move position on a board. A child builds motor memory for where "I" lives — moving it breaks that memory. Critical for SupercoreGrid. | Layout flexibility / drag-and-drop |
| **Supercore / Core Word Board** | A fixed-position 50-word grid following Modified Fitzgerald Key. The `/talk` route. Based on Smartbox Supercore design principles. | General symbol board |
| **ARASAAC** | Aragonese Centre of Augmentative and Alternative Communication. Provides 46,000+ free CC BY 4.0 pictographic symbols used throughout the app. | Any paid symbol library |
| **Neurodivergent** | Umbrella term for people whose neurological development differs from the statistical norm: autism, ADHD, dyslexia, dyspraxia, etc. Preferred by the community over "special needs". | "Special needs", "disabled" (context-dependent) |
| **SLT / SLP** | Speech and Language Therapist (UK/IE) / Speech-Language Pathologist (US). The clinical professional who prescribes and trains AAC use. Target professional user of Parent Chat. | OT (Occupational Therapist), different role |
| **Co-regulation** | An adult helping a child regulate their emotional/sensory state before expecting communication. A key principle: communicate when regulated, regulate before communicating. | Self-regulation (child doing it independently) |
| **PGC** | Psychiatric Genomics Consortium. Provides large-scale GWAS (genome-wide association study) data for ADHD, autism, and other conditions. Stored in `data/resources/index.json` as a research reference. | Clinical diagnosis tool |

## Development

```bash
npm install
npm run dev
```
