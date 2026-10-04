/**
 * Voice catalogue for 8gent Jr (web).
 *
 * These are local system speech profiles. The browser chooses the closest
 * installed voice on the device; no text is sent to a hosted voice provider.
 */

export interface VoiceOption {
  /** Local voice profile id. */
  id: string;
  /** Display name. */
  name: string;
  /** One-line, parent-facing description of how it sounds. */
  blurb: string;
  /** Accent tag, shown as a small chip. */
  accent: 'System' | 'IE/UK' | 'US';
  /** True for the app's out-of-box default. */
  default?: boolean;
}

export const VOICES: VoiceOption[] = [
  {
    id: 'system-default',
    name: 'System',
    blurb: 'Uses the safest local voice installed on this device',
    accent: 'System',
    default: true,
  },
  {
    id: 'system-ie',
    name: 'Warm local',
    blurb: 'Prefers an Irish or UK English system voice when available',
    accent: 'IE/UK',
  },
  {
    id: 'system-gb',
    name: 'Clear local',
    blurb: 'Prefers a clear UK English system voice when available',
    accent: 'IE/UK',
  },
  {
    id: 'system-us',
    name: 'Bright local',
    blurb: 'Prefers a US English system voice when available',
    accent: 'US',
  },
];

/** The out-of-box default voice profile. */
export const DEFAULT_VOICE_ID = VOICES.find((v) => v.default)!.id;

/** A short, fixed sample line for comparing local system voices. */
export const VOICE_SAMPLE_TEXT = 'Hello! Nice to meet you.';

/** Resolve a stored selectedVoiceId (which may be null or legacy) to a catalogue entry. */
export function resolveVoice(selectedVoiceId: string | null | undefined): VoiceOption {
  const id = selectedVoiceId ?? DEFAULT_VOICE_ID;
  return VOICES.find((v) => v.id === id) ?? VOICES.find((v) => v.default)!;
}
