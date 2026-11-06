# Accessibility

Accessibility is the stated primary design constraint (`AGENTS.md`). This page lists what the code supports today, not a conformance claim. No audit with assistive technology is documented: not yet documented.

## Supported in code

- **Fixed word positions.** The core grid never moves words so a child builds motor memory (`SupercoreGrid.tsx`).
- **Colour coding.** Modified Fitzgerald Key word classes (`src/lib/fitzgerald-key.ts`).
- **Contrast.** `src/lib/contrast.ts` implements WCAG 2.1 contrast maths and `accentSurface`, used to keep labels readable on accent colours; unit tested.
- **Touch targets.** `src/styles/theme.ts` sets minimum 48 and comfortable 56 pixel targets.
- **Tap throttle.** `useTapThrottle` coalesces rapid taps (default 60 ms).
- **Reduced motion.** A global `prefers-reduced-motion` rule in `globals.css` plus component-level handling in several visual toys.
- **Calm mode.** Maths lessons default to calm mode and haptics are skipped when it is on; sound and motion can be turned off per lesson.
- **No fail states.** Guided lessons have no score, no wrong answer, no locked controls.
- **ARIA.** `aria-label`, `aria-live`, `aria-pressed` and related attributes are used widely. Some visual toys have spoken or screen-reader descriptions, covered by unit tests (pattern garden, water sphere).
- **Keyboard.** Key handlers exist in the keyboard surface, lock screen, quick phrases, paginated grid, sentence bar, onboarding and others.
- **Voice input.** Speech recognition where the browser supports it (`useVoiceInput.ts`).
- **Speech output.** Device voices with rate and volume settings; a voice picker in settings.
- **Layout options.** Grid columns, card size, density and layout presets in settings.
- **Haptics.** `navigator.vibrate` in some instruments and knobs.

## Known gaps

- `ROADMAP.md` records that `TapCard` fires on pointer-up only, so switch hardware and screen readers cannot select a word. Add click and Enter or Space handling is planned.
- `src/lib/motor-lock.ts` (dwell, guard distance, debounce profiles) is not imported by any component.
- The lock screen and age gate are not PINs.
- Offline use is not implemented (no service worker found).
- Mouth-position drawings and some games depend on visuals; text alternatives for each game are not yet documented.
