/**
 * 8gent Jr — TTS
 *
 * Web Speech API is primary (free, local, offline-capable).
 * ElevenLabs is opt-in premium — enable by:
 *   - passing `useElevenLabs: true` in TTSOptions, OR
 *   - setting NEXT_PUBLIC_USE_ELEVENLABS=true in the environment
 *
 * Issue: #53
 */

import { getBestVoice } from './voice-selector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSOptions {
  /** Text to speak */
  text: string;
  /** ElevenLabs voice ID (optional — server uses default if omitted) */
  voiceId?: string;
  /** Speech rate 0.5-2.0 (default 1.0) */
  rate?: number;
  /** Volume 0.0-1.0 (default 1.0) */
  volume?: number;
  /** Stability 0.0-1.0 for ElevenLabs (default 0.5) */
  stability?: number;
  /** Similarity boost 0.0-1.0 for ElevenLabs (default 0.75) */
  similarityBoost?: number;
  /** Opt-in to ElevenLabs premium TTS (default: false — uses browser TTS) */
  useElevenLabs?: boolean;
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
// Preferred engine
// ---------------------------------------------------------------------------

export function getPreferredEngine(): TTSEngine {
  if (typeof window === 'undefined') return 'none';
  const envFlag = process.env.NEXT_PUBLIC_USE_ELEVENLABS === 'true';
  if (envFlag) return 'elevenlabs';
  if (window.speechSynthesis) return 'browser';
  return 'none';
}

/** @deprecated Use getPreferredEngine() instead */
export function getAvailableEngine(): TTSEngine {
  return getPreferredEngine();
}

// ---------------------------------------------------------------------------
// Main speak function
// ---------------------------------------------------------------------------

export async function speak(options: TTSOptions): Promise<TTSEngine> {
  const {
    text,
    voiceId,
    rate = 1.0,
    volume = 1.0,
    stability = 0.5,
    similarityBoost = 0.75,
    useElevenLabs = false,
  } = options;

  if (!text || typeof window === 'undefined') return 'none';

  // Stop anything currently playing
  stopSpeaking();

  const elevenLabsEnabled =
    useElevenLabs || process.env.NEXT_PUBLIC_USE_ELEVENLABS === 'true';

  if (elevenLabsEnabled) {
    // Premium path: try ElevenLabs, fall back to browser on failure
    try {
      const engine = await speakElevenLabs(text, { voiceId, stability, similarityBoost, volume });
      if (engine === 'elevenlabs') return 'elevenlabs';
    } catch {
      // Fall through to browser TTS
    }
  }

  // Default primary path: Web Speech API (free, local, offline)
  return speakBrowser(text, { rate, volume });
}

// ---------------------------------------------------------------------------
// ElevenLabs via /api/tts proxy (premium opt-in)
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

  // Other error — ElevenLabs is configured but failed; fail silently
  if (!res.ok) return 'elevenlabs';

  const blob = await res.blob();
  // Empty blob — configured but silent failure
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
      resolve('elevenlabs');
    };
    audio.play().catch(() => {
      audio.src = '';
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve('elevenlabs');
    });
  });
}

// ---------------------------------------------------------------------------
// Browser Web Speech API (primary — free, local, offline)
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

    // Use best available child-friendly voice
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

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
