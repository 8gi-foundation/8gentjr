# 8gent Jr

Personalised AI OS for neurodivergent children (autism, ADHD). Free forever.

- **Domain:** 8gentjr.com
- **Parent:** [8GI Foundation](https://8gi.org)
- **License:** Apache 2.0

## What it is

Not a generic kids' app. A personalised system that learns YOUR child's patterns, communication style, and routines. AAC (picture cards for speaking), adaptive learning, parent co-modelling.

## Architecture

- Next.js 15.1 / React 19 on Vercel (8gentjr.com)
- Auth via 8gent.app (Clerk)
- AI via 8gent-code kernel (local-first, privacy-first)
- ARASAAC symbol library (46,000+ CC BY 4.0 pictograms)
- Web Audio API for music synthesis and sound feedback
- PWA with offline support
- Nick's instance at nick.8gentjr.com

## Neurodiversity & AAC Glossary

Terminology used in this codebase and why it matters. Using the wrong term confuses SLTs (speech-language therapists) and informed parents.

| Term | What it means | What NOT to confuse it with |
|------|--------------|----------------------------|
| **AAC** (Augmentative & Alternative Communication) | Any method that supplements or replaces spoken language: picture cards, symbol boards, speech-generating devices. Umbrella term. | "Special needs app" (too vague, avoid) |
| **Core vocabulary** | ~400 high-frequency words (I, want, more, go, stop) that make up ~80% of what people say daily. Contrast with fringe vocabulary (specific nouns). | Topic vocabulary / fringe vocabulary |
| **Fringe vocabulary** | Context-specific words (banana, swimming, teacher). Important but secondary to core. | Core vocabulary |
| **Visual Scene Display (VSD)** | A scene-based AAC format: a contextually rich image with hotspot buttons overlaid. Tapping a hotspot produces a phrase. Developed by Beukelman & Janice Light. This is what the `/vsd` ("Scenes") route implements. | Social Stories (completely different) |
| **Social Stories** | Short, first-person narratives written *about* a child to explain social situations and expected behaviour ("When I arrive at school, I hang my bag up first…"). Created by Carol Gray (1991). Evidence-based for autism. | Visual Scene Displays |
| **GLP (Gestalt Language Processing)** | A language acquisition style where children learn language in chunks/phrases ("ready-set-go", "do you want to?") before breaking them into parts. Contrast with analytic language processing. Many autistic children are gestalt processors. | Echolalia (overlapping but distinct) |
| **Fitzgerald Key** | A colour-coding system for AAC symbol categorisation: Yellow = pronouns, Green = verbs, Orange = nouns, Pink = adjectives/adverbs, Blue = prepositions, Red = negation/interjections, White = small words. Industry standard (used by Grid 3, Supercore, Snap Core). | Arbitrary colour choices |
| **Motor planning** | The muscle-memory principle that AAC words should NEVER move position on a board. A child builds motor memory for where "I" lives, and moving it breaks that memory. Critical for SupercoreGrid. | Layout flexibility / drag-and-drop |
| **Supercore / Core Word Board** | A fixed-position 50-word grid following Modified Fitzgerald Key. The `/talk` route. Based on Smartbox Supercore design principles. | General symbol board |
| **ARASAAC** | Aragonese Centre of Augmentative and Alternative Communication. Provides 46,000+ free CC BY 4.0 pictographic symbols used throughout the app. | Any paid symbol library |
| **Neurodivergent** | Umbrella term for people whose neurological development differs from the statistical norm: autism, ADHD, dyslexia, dyspraxia, etc. Preferred by the community over "special needs". | "Special needs", "disabled" (context-dependent) |
| **SLT / SLP** | Speech and Language Therapist (UK/IE) / Speech-Language Pathologist (US). The clinical professional who prescribes and trains AAC use. | OT (Occupational Therapist), different role |
| **Co-regulation** | An adult helping a child regulate their emotional/sensory state before expecting communication. A key principle: communicate when regulated, regulate before communicating. | Self-regulation (child doing it independently) |
| **PGC** | Psychiatric Genomics Consortium. Provides large-scale GWAS (genome-wide association study) data for ADHD, autism, and other conditions. Stored in `data/resources/index.json` as a research reference. | Clinical diagnosis tool |

## Features

### Communication (AAC)

| Feature | Route | Description |
|---------|-------|-------------|
| **Talk (Supercore)** | `/talk` | 50-word core vocabulary grid following Modified Fitzgerald Key colour coding. Fixed motor-planned positions. Three views: Core grid, Browse categories, Quick Phrases |
| **Browse Categories** | `/talk` (browse tab) | Category-based AAC board. Tap a category to see symbols, tap a symbol to speak |
| **Quick Phrases** | `/talk` (phrases tab) | Saved sentences with 4 input methods for rapid communication |
| **Voice Card Creator** | via Talk | Create custom AAC cards with symbol search and voice recording |
| **Visual Scenes (VSD)** | `/vsd` | Scene-based AAC. Contextual images (kitchen, playground, bedroom, school, park) with tappable hotspots that speak gestalt phrases |
| **Sentence Builder** | via AAC | Build sentences from symbols with shared sentence bar and TTS output |
| **Symbol Search** | `/symbols` | Search 46,000+ ARASAAC pictographic symbols |

### Games (SchoolTube)

Games are presented in a TikTok-style reels feed with topic filters and daily activity banners.

**Academic**

| Game | Description |
|------|-------------|
| **Bubble Pop Numbers** | Pop numbered bubbles in sequence |
| **Color Mix** | Mix primary colours to discover new ones |
| **Color Sort** | Sort objects by colour into matching bins |
| **Counting Balls** | Count falling balls for number recognition |
| **Letter Trace** | Trace letter shapes with touch |
| **Number Bonds** | Find pairs that add up to a target number |
| **Number Order** | Arrange numbers in ascending/descending order |
| **Pattern Complete** | Identify and complete visual patterns |
| **Shape Match** | Match shapes to their silhouettes |
| **Size Sort** | Order objects from smallest to largest |

**Speech & Language**

| Game | Description |
|------|-------------|
| **Animal Sounds** | Listen to and identify animal sounds |
| **Copy Move** | Watch and copy movement sequences |
| **Feelings Explorer** | Identify and learn about emotions |
| **Jump Count** | Jump and count: physical movement + numbers |
| **Nature Explore** | Explore nature scenes with vocabulary |
| **Rhyme Time** | Find words that rhyme together |
| **Sentence Builder** | Build sentences from word cards |
| **Word Repeat** | Listen and repeat words for articulation practice |

**Sensory**

| Game | Description |
|------|-------------|
| **Ball Rain** | Colourful balls raining down, tap to pop |
| **Bottle Fill** | Pour virtual liquid into bottles |
| **Breathing Sphere** | Guided breathing with expanding/contracting sphere |
| **Bubble Wrap** | Pop virtual bubble wrap for tactile satisfaction |
| **Ice Cream Builder** | Stack scoops to build ice cream cones |
| **Marble Run** | Watch marbles roll through tracks |
| **Rainbow Paint** | Free paint with rainbow colours |
| **Shape Tower** | Stack shapes to build towers |
| **Spin Fidget** | Virtual fidget spinner |
| **Water Pour** | Pour water between containers |

**Sensory 3D**

| Game | Description |
|------|-------------|
| **Ball Run 3D** | 3D ball rolling physics |
| **Calming Particles** | Gentle particle systems for regulation |
| **Chain Reaction** | Trigger cascading particle chain reactions |
| **Crystal Garden** | Grow virtual crystals |
| **Domino Cascade** | Set up and topple domino chains |
| **Lava Lamp** | Hypnotic lava lamp simulation |
| **Magnetic Particles** | Particles that attract/repel with touch |
| **Musical Balls** | Bouncing balls that play notes on collision |
| **Particle Fireworks** | Touch-triggered firework particle displays |
| **Pendulum Wave** | Mesmerising synchronised pendulum patterns |
| **Starfield** | Fly through an interactive starfield |

**Memory**

| Game | Description |
|------|-------------|
| **Memory Match** | Classic card-flipping memory game with symbols |

### Music

| Feature | Route | Description |
|---------|-------|-------------|
| **Song Creator** | `/music` (create tab) | AI-generated songs from text prompts, saved to local library |
| **My Songs** | `/music` (songs tab) | Personal song library with playback and management |
| **Drum Pads** | `/music` (instruments tab) | Touch-responsive drum pad grid with real drum samples |
| **Xylophone Keys** | `/music` (instruments tab) | Coloured xylophone keys, play melodies by tapping |
| **Sound Detective** | `/music` (listen tab) | Ear training game: 8 notes, cymatics shapes, visual-first |
| **Sound Art (Chladni)** | `/music` (sound art tab) | Cymatics visualiser: see sound wave patterns as Chladni figures |
| **Mood Music** | `/music/moods` | Music playlists organised by mood/emotion |

### Science

| Feature | Route | Description |
|---------|-------|-------------|
| **Shape World** | `/science/shapes` | Isometric world builder: paint 3D terrain with colours mapped to musical tones. Synesthetic learning, every colour plays a note (C4 to C5). Procedural terrain generation, "Play Song" sweeps painted colours as melody |
| **Physics Lab** | `/science/physics` | Launch particles, swing pendulums, splash colours: interactive physics sandbox |

### Speech Therapy

| Feature | Route | Description |
|---------|-------|-------------|
| **Speech Therapy** | `/speech` | Interactive phoneme practice with mouth position visualisation and speech synthesis |

### Social & Emotional

| Feature | Route | Description |
|---------|-------|-------------|
| **Social Stories** | `/stories` | Picture-based first-person narratives explaining everyday social situations (Carol Gray method) |
| **Intuition Game** | `/intuition` | Colour card pattern recognition ("which colour do you feel?") with scoring, streaks, and accuracy tracking |

### Creative

| Feature | Route | Description |
|---------|-------|-------------|
| **Draw** | `/draw` | Free drawing canvas with colour palette and brush tools |

### Daily Living

| Feature | Route | Description |
|---------|-------|-------------|
| **Visual Schedule** | `/schedule` | Picture-based daily schedule ("My Day") with visual task cards |
| **Bubble Timer** | `/timer` | Visual countdown timer with presets (1, 2, 5, 10 min), animated progress circle, and completion celebration |

### Toolshed

| Feature | Route | Description |
|---------|-------|-------------|
| **Toolshed** | `/toolshed` | Hub of all tools and activities organised by category, with star rewards and unlock progression |

### Parent & Setup

| Feature | Route | Description |
|---------|-------|-------------|
| **Onboarding** | `/onboarding` | Problem-first onboarding flow: learns about your child before configuring the system |
| **Settings** | `/settings` | App preferences and child profile configuration |
| **Parental Gate** | (system) | Consent gate protecting all content (localStorage-based) |
| **Lock Screen** | (system) | Session-based lock screen to prevent accidental exits |

## Privacy, consent & compliance

Child-path accounts (under 13) are gated behind COPPA email-plus Verifiable Parental Consent. Signup routes to `/parent-email-verification`, which posts to `/api/consent/initiate` and issues two signed, single-use tokens: step 1 arrives immediately, step 2 ~10 minutes after step-1 confirmation. Child profiles stay inactive until both links are clicked. Withdrawal (Art 7(3)) and full delete (Art 17) are one-tap in Settings > Privacy & Consent, backed by an append-only JSONL audit log.

- VPC flow: `src/lib/consent/`
- Email provider: AgentMail (`privacy@8gentjr.com`). Falls back to a `LogOnlySender` when `AGENTMAIL_API_KEY` is unset.
- Audit log: JSONL at `VPC_AUDIT_DIR` (default `./data/consent`).
- DPIA + legal record: `8gi-foundation/8gi-governance`.

## Ecosystem

8gent Jr is a product of the [8GI Foundation](https://8gi.org), a Dublin-based non-profit building free, local-first AI for people the K-shaped economy is leaving behind.

- [8gi.org](https://8gi.org): foundation site
- [8gent.dev](https://8gent.dev): open source agent kernel (8gent Code)
- [8gentjr.com](https://8gentjr.com): this product

## Development

```bash
npm install
cp .env.example .env.local   # fill in GROQ, ELEVENLABS, VPC, AGENTMAIL keys as needed
npm run dev
```

Most keys are optional for local dev — the app gracefully falls back (log-only email sender, browser Web Speech TTS, Groq-less autocomplete). `VPC_TOKEN_SECRET` is required whenever you exercise the parental consent flow.
