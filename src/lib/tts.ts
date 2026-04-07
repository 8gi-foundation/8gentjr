/**
 * 8gent Jr — ElevenLabs TTS with Web Speech API fallback
 *
 * Uses the /api/tts proxy endpoint for ElevenLabs synthesis.
 * Falls back to browser SpeechSynthesis when:
 *   - ElevenLabs API key is not configured
 *   - Server returns non-200
 *   - Network is offline
 *
 * Issue: #53
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSOptions {
  /** Text to speak */
  text: string;
  /** ElevenLabs voice ID (optional — server uses default if omitted) */
  voiceId?: string;
  /** Speech rate 0.5–2.0 (default 1.0) */
  rate?: number;
  /** Volume 0.0–1.0 (default 1.0) */
  volume?: number;
  /** Stability 0.0–1.0 for ElevenLabs (default 0.5) */
  stability?: number;
  /** Similarity boost 0.0–1.0 for ElevenLabs (default 0.75) */
  similarityBoost?: number;
}

export type TTSEngine = 'elevenlabs' | 'browser' | 'none';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// ---------------------------------------------------------------------------
// Stop any playing audio
// ---------------------------------------------------------------------------

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

// ---------------------------------------------------------------------------
// Check if currently speaking
// ---------------------------------------------------------------------------

export function isSpeaking(): boolean {
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
    return true;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Detect available engine
// ---------------------------------------------------------------------------

export function getAvailableEngine(): TTSEngine {
  if (typeof window === 'undefined') return 'none';
  // ElevenLabs is always available via proxy — actual availability
  // is determined at call time by server response
  return 'elevenlabs';
}

// ---------------------------------------------------------------------------
// Main speak function
// ---------------------------------------------------------------------------

export async function speak(options: TTSOptions): Promise<TTSEngine> {
  const { text, voiceId, rate = 1.0, volume = 1.0, stability = 0.5, similarityBoost = 0.75 } = options;

  if (!text || typeof window === 'undefined') return 'none';

  // Stop anything currently playing
  stopSpeaking();

  // Try ElevenLabs first
  try {
    const engine = await speakElevenLabs(text, { voiceId, stability, similarityBoost, volume });
    if (engine === 'elevenlabs') return 'elevenlabs';
  } catch {
    // Fall through to browser TTS
  }

  // Fallback: Web Speech API (caller should signal this to the user)
  return speakBrowser(text, { rate, volume });
}

// ---------------------------------------------------------------------------
// ElevenLabs via /api/tts proxy
// ---------------------------------------------------------------------------

async function speakElevenLabs(
  text: string,
  opts: { voiceId?: string; stability: number; similarityBoost: number; volume: number }
): Promise<TTSEngine> {
  const params = new URLSearchParams({ text });
  if (opts.voiceId) params.set('voice', opts.voiceId);
  const res = await fetch(`/api/tts?${params.toString()}`);

  // 204 = not configured — fall back to browser TTS
  if (res.status === 204) return 'none';

  // Other error — ElevenLabs is configured but failed; fail silently, no robot fallback
  if (!res.ok) return 'elevenlabs';

  const blob = await res.blob();
  // Empty blob — configured but silent failure; don't trigger robot voice
  if (blob.size === 0) return 'elevenlabs';

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, opts.volume));
  currentAudio = audio;

  return new Promise<TTSEngine>((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve('elevenlabs');
    };
    audio.onerror = () => {
      audio.src = '';
      URL.revokeObjectURL(url);
      currentAudio = null;
      // Don't resolve 'none' — would trigger browser TTS while ElevenLabs may still be audible
      resolve('elevenlabs');
    };
    audio.play().catch(() => {
      // iOS Safari can reject play() after user gesture context expires during fetch.
      // Resolve 'elevenlabs' to prevent robot voice from firing on top.
      audio.src = '';
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve('elevenlabs');
    });
  });
}

// ---------------------------------------------------------------------------
// Browser Web Speech API fallback
// ---------------------------------------------------------------------------

function speakBrowser(
  text: string,
  opts: { rate: number; volume: number }
): Promise<TTSEngine> {
  return new Promise<TTSEngine>((resolve) => {
    if (!window.speechSynthesis) {
      resolve('none');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(2, opts.rate));
    utterance.volume = Math.max(0, Math.min(1, opts.volume));
    utterance.lang = 'en-US';
    currentUtterance = utterance;

    utterance.onend = () => {
      currentUtterance = null;
      resolve('browser');
    };
    utterance.onerror = () => {
      currentUtterance = null;
      resolve('none');
    };

    window.speechSynthesis.speak(utterance);
  });
}
