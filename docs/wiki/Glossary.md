# Glossary

The README has a longer glossary of AAC terms; this page lists terms as the code uses them.

| Term | Meaning |
|------|---------|
| AAC | Augmentative and alternative communication: picture cards, boards and speech output |
| ARASAAC | Open pictogram library used for symbols |
| Core words | High-frequency words on the fixed core grid (`src/lib/vocabulary.ts`) |
| Supercore grid | The fixed-position core board in `SupercoreGrid.tsx` |
| Your Words | Frequently tapped words promoted to a row (5 or more taps within 7 days, at most 6 cards) |
| Fitzgerald Key | Colour coding of word classes |
| GLP | Gestalt language processing: learning language in whole phrases first. `src/lib/glp/index.ts` expands it as "Graded Language Proficiency" while other files say "Gestalt Language Processing"; the code is inconsistent |
| GLP stage | One of six stages (echolalia, mitigated gestalts, single words, early sentences, complex grammar, full conversation); setting `glpStage` defaults to 3 |
| Gestalt chip | A phrase of 3 or more words flagged as a whole unit |
| Stage estimate | On-device suggestion of a stage from usage; the parent slider is the source of truth |
| VSD | Visual scene display: a scene with tappable hotspots |
| VPC | Verifiable parental consent; the two-step email flow |
| Age gate | Birth-year check at first run (not a PIN) |
| Lock screen | Tap-to-unlock screen per browser session |
| Calm mode | Reduced stimulation in maths and play surfaces |
| Naming line | A short descriptive line shown once when a child discovers an effect in a toy |
| Voice Play | Mouth-position and held-sound drills with live feedback |
| Motor lock | Dwell, guard and debounce settings against accidental taps (not currently wired) |
| Tap throttle | 60 ms gate against duplicate taps |
| SchoolTube | The reels-style games feed |
| Toolshed | Hub page of tools by category |
| SLT | Speech and language therapist |
