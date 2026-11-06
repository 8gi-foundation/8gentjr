# Features

Every route below exists as a `page.tsx` under `src/app`. "Network" means the screen needs an internet connection or server for that function.

## Entry, gates and chrome

| Route | What it does |
|-------|--------------|
| `/` | No UI. Redirects to `/onboarding` if onboarding is not complete, else `/talk` |
| `/onboarding` | Three steps (introduction, why picture communication helps, child profile). Skippable at every step. Local |
| `/parent-email-verification` | Step 1 of parental consent for under-13 accounts. Posts to `/api/consent/initiate`. Network |
| `/consent/step1-received`, `/consent/expired`, `/consent/activated` | Landing pages for the consent email links |
| `/sign-in`, `/sign-up` | Clerk screens. Network |

The age gate (`src/components/ParentalGate.tsx`) asks whether the user is a child under 13 (completed by a parent or guardian), a person 13 or over, or a carer 13 or over, and records birth year only. It is not a PIN. The lock screen (`LockScreen.tsx`) is a tap, Enter, Space or Escape to unlock screen, stored per browser session; it is not a PIN either. The dock (`Dock.tsx`) has Talk, Music, Games and Speech as primary items, with the rest under More.

## Communication (AAC)

| Route | What it does |
|-------|--------------|
| `/talk` | Main hub with four tabs: Core (50 fixed core words, Fitzgerald Key colours, words never move), Browse (categories), Phrases (saved sentences), Keyboard. A floating voice card creator lets an adult create cards by voice and search ARASAAC |
| `/talk/core` | The core grid alone |
| `/talk/builder` | Sentence builder with local autocomplete |
| `/category/[id]` | Word grid for one category with the shared sentence bar |
| `/aac/paginated` | Demo of a paginated symbol grid with swipe pages, speak and clear |
| `/add` | Add a custom card from an ARASAAC search or an upload. Saved to the browser |
| `/symbols` | Search ARASAAC pictograms. Network |
| `/suggestions` | Demo page of the suggestion helpers using sample data, not live usage |
| `/vsd` | Visual scene displays: kitchen, playground, bedroom, school, park. Hotspots speak phrases |
| `/parent-chat` | Parent describes changes to the board in conversation; uses a self-hosted Ollama server through `/api/parent-chat`. Offers a canned reply if the server is unreachable. Network |
| `/browser-llm-demo` | Smoke test page, not in the dock. Card-label extraction with a small on-device model (one-time download) |

## Speech

| Route | What it does |
|-------|--------------|
| `/speech` | 20 sound drills (5 vowels, 10 consonants, 5 blends) with mouth-shape drawings, example words and ARASAAC pictures |
| `/speech/play` | Voice Play: mouth positions and held sounds with live feedback. The microphone is requested only on an explicit press and analysed on the device |

## Games

- `/games`: a reels-style feed with topic filter and daily activity banner, built from `src/lib/reels-data.ts` (includes YouTube video entries; network).
- `/games/play`: game hub with category tabs and `?game=<id>`. An unknown id shows a "That game has moved" screen.
  - **Speech (8):** Animal Sounds, Word Repeat, Rhyme Time, Feelings Explorer, Copy Move, Nature Explore, Jump and Count, Sentence Builder.
  - **Maths (10):** Color Sort, Counting Balls, Pattern Complete, Shape Match, Letter Trace, Number Order, Size Sort, Number Bonds, Color Mix, Bubble Pop.
  - **Sensory (10):** Breathing Sphere, Bubble Wrap, Rainbow Paint, Spin Fidget, Marble Run, Ice Cream Builder, Shape Tower, Ball Rain, Bottle Fill, Water Pour.
  - **Sensory 3D (11):** Starfield, Crystal Garden, Calming Particles, Lava Lamp, Magnetic Particles, Domino Cascade, Ball Run, Pendulum Wave, Chain Reaction, Fireworks, Musical Balls.
  - **Memory (1):** Memory Match.
  - **Science (4):** Ripples, Light Mixer, Water Sphere, Pattern Garden.
- `/intuition`: colour card guessing game with score, streak and accuracy.

## Maths (guided lessons with sound)

`/math` (index), `/math/wave`, `/math/amplitude` (Tall and Small), `/math/layers`, `/math/garden`. Sound uses Web Audio on the device. Calm mode and sound can be switched off. There is no score and no locked control (`ROADMAP.md` and `src/lib/guided-learning.ts`).

## Science

`/science` lists seven sandboxes: `/science/shapes` (Shape World), `/science/physics`, `/science/light`, `/science/water`, `/science/garden`, `/science/fractal`, `/science/harmonograph` (Sound Drawing).

## Music

`/music` has five tabs: My Songs, Create, Instruments (drum pads and xylophone), Listen (Sound Detective), Sound Art (Chladni patterns, uses the microphone). Create needs the server and optional hosted services. `/music/instruments` and `/music/moods` (mood playlists) are separate pages.

## Daily living and creative

| Route | What it does |
|-------|--------------|
| `/schedule` | "My Day" picture schedule. Default eight activities from 07:00 to 20:00, highlighting the current one. Static, not editable in code |
| `/timer` | Bubble timer with 1, 2, 5, 10 minute presets |
| `/stories` | Six social stories: Going to School, Doctor Visit, Birthday Party, Going Shopping, Bedtime Routine, Making a Friend |
| `/draw` | Drawing canvas |
| `/toolshed` | Tool hub by category with a star total |

## Adults

| Route | What it does |
|-------|--------------|
| `/parent` | Parent dashboard behind Clerk sign-in (UI guard only). Data shown is hard-coded in this version |
| `/settings` | Child name, stage estimate and slider, voice and speed, grid columns, layout presets, colour, smart suggestions toggle, pin most-tapped words, install section |
| `/settings/privacy` | Withdraw consent and delete data actions |
| `/analytics` | Progress view from local session data |
| `/guides/intro`, `/guides/talk`, `/guides/educator`, `/guides/therapist`, `/guides/government` | Static guides |
| `/help` | How-to with video embeds |
| `/feedback` | Feedback form to `/api/feedback` |
| `/privacy` | Privacy notice |

## PWA

`manifest.ts` (standalone, portrait), generated icons via `/api/pwa-icon`, and an install prompt (`InstallPrompt.tsx`). No service worker registration was found, so offline support is not yet implemented (`ROADMAP.md` lists it as planned).

## Not wired or not found

- `Companion.tsx` exists but no page renders it.
- `src/components/schooltube/PinDialog.tsx` has a hard-coded demo PIN and no importer was found.
- `/terms` is treated as ungated in `AppChrome.tsx` but no `src/app/terms` page exists.
