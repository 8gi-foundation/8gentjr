/**
 * Voice catalogue for 8gent Jr (web).
 *
 * A small, deliberately-curated set of ElevenLabs library voices. Kept to six
 * so a child or parent isn't tempted to cycle through dozens (each unheard
 * voice is a fresh ElevenLabs generation = tokens). The six cover a warm
 * spread of timbre and accent: the current default plus two female, two male,
 * and one neutral, across US and UK.
 *
 * Mirrors the iOS voice picker (AppSettings.selectedVoice / SupertonicVoice)
 * so the two products stay aligned — iOS uses on-device Supertonic voices,
 * web uses ElevenLabs, but the settings UX is the same "pick + hear a sample".
 *
 * IDs are ElevenLabs default-library voice IDs (stable across accounts).
 * `selectedVoiceId === null` in AppSettings means "use the default" (Charlie),
 * which keeps existing users on the voice they already have.
 */

export interface VoiceOption {
  /** ElevenLabs voice ID. */
  id: string;
  /** Display name. */
  name: string;
  /** One-line, parent-facing description of how it sounds. */
  blurb: string;
  /** Accent tag, shown as a small chip. */
  accent: 'US' | 'UK';
  /** True for the app's out-of-box default. */
  default?: boolean;
}

export const VOICES: VoiceOption[] = [
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', blurb: 'Friendly and natural — the original 8gent jr voice', accent: 'UK', default: true },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah',   blurb: 'Warm and gentle',  accent: 'US' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily',    blurb: 'Soft and soothing', accent: 'UK' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George',  blurb: 'Warm and steady',   accent: 'UK' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will',    blurb: 'Cheerful and easy-going', accent: 'US' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River',   blurb: 'Calm and even',     accent: 'US' },
];

/** The out-of-box default voice id (Charlie). */
export const DEFAULT_VOICE_ID = VOICES.find((v) => v.default)!.id;

/** A short, fixed sample line — fixed so each voice's preview is generated
 *  once and then served from the CDN cache (no repeat token cost). */
export const VOICE_SAMPLE_TEXT = 'Hello! Nice to meet you.';

/** Resolve a stored selectedVoiceId (which may be null) to a catalogue entry. */
export function resolveVoice(selectedVoiceId: string | null | undefined): VoiceOption {
  const id = selectedVoiceId ?? DEFAULT_VOICE_ID;
  return VOICES.find((v) => v.id === id) ?? VOICES.find((v) => v.default)!;
}
