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

// Single pooled Audio element reused across taps. iOS Safari throttles / kills
// tabs that rapidly create many Audio + Blob URLs; reusing one element prevents
// the "crash + refresh" that happens when a child taps cards very fast.
let pooledAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let currentResolve: ((engine: TTSEngine) => void) | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAbortController: AbortController | null = null;

/** Client-side blob cache: text -> audio Blob. Avoids re-fetching for repeated words. */
const audioCache = new Map<string, Blob>();

function getPooledAudio(): HTMLAudioElement {
  if (!pooledAudio) pooledAudio = new Audio();
  return pooledAudio;
}

function revokeCurrentBlobUrl() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

function resolvePending() {
  if (currentResolve) {
    const r = currentResolve;
    currentResolve = null;
    r('elevenlabs');
  }
}

// ---------------------------------------------------------------------------
// Stop any playing audio
// ---------------------------------------------------------------------------

export function stopSpeaking(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (pooledAudio) {
    pooledAudio.pause();
    // NOTE: do NOT reset pooledAudio.src here. On iOS Safari, assigning
    // src = '' puts the element into a broken state where the next .src
    // assignment fails silently — the first tap speaks, the rest don't.
    // playCachedBlob will overwrite src cleanly on the next tap.
  }
  revokeCurrentBlobUrl();
  resolvePending();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

// ---------------------------------------------------------------------------
// Check if currently speaking
// ---------------------------------------------------------------------------

export function isSpeaking(): boolean {
  if (pooledAudio && !pooledAudio.paused && !pooledAudio.ended) {
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

/** Play a cached blob via the pooled Audio element — safe for rapid taps */
function playCachedBlob(blob: Blob, volume: number): Promise<TTSEngine> {
  // Resolve any still-pending promise from the previous tap before reassigning handlers
  resolvePending();
  revokeCurrentBlobUrl();

  const audio = getPooledAudio();
  audio.pause();
  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  audio.src = url;
  audio.volume = Math.max(0, Math.min(1, volume));

  return new Promise<TTSEngine>((resolve) => {
    currentResolve = resolve;
    const done = () => {
      if (currentResolve === resolve) {
        currentResolve = null;
        if (currentBlobUrl === url) {
          URL.revokeObjectURL(url);
          currentBlobUrl = null;
        }
        resolve('elevenlabs');
      }
    };
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  });
}

async function speakElevenLabs(
  text: string,
  opts: { voiceId?: string; stability: number; similarityBoost: number; volume: number }
): Promise<TTSEngine> {
  const cacheKey = `${text}|${opts.voiceId || ''}`;

  // Hit cache — instant playback, no network
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return playCachedBlob(cached, opts.volume);
  }

  const params = new URLSearchParams({ text });
  if (opts.voiceId) params.set('voice', opts.voiceId);

  const controller = new AbortController();
  currentAbortController = controller;

  let res: Response;
  try {
    res = await fetch(`/api/tts?${params.toString()}`, { signal: controller.signal });
  } catch (err) {
    // AbortError = user tapped another card; stay silent so we don't speak
    // the stale word on top of the new one.
    if ((err as { name?: string })?.name === 'AbortError') return 'elevenlabs';
    // Any other fetch failure (offline, DNS, CORS) — fall back to Web Speech.
    return 'none';
  } finally {
    if (currentAbortController === controller) currentAbortController = null;
  }

  // 204 = not configured — fall back to browser TTS
  if (res.status === 204) return 'none';

  // Any non-OK response (503 upstream fail, 429, 500…) — fall back so the
  // child always hears *something* instead of silence.
  if (!res.ok) return 'none';

  const blob = await res.blob();
  // Empty payload — fall back rather than swallowing silently.
  if (blob.size === 0) return 'none';

  // Cache the blob for instant replay
  audioCache.set(cacheKey, blob);

  return playCachedBlob(blob, opts.volume);
}

// ---------------------------------------------------------------------------
// Preload — fetch and cache audio for a list of words (fire and forget)
// ---------------------------------------------------------------------------

export function preloadAudio(words: string[], voiceId?: string): void {
  for (const text of words) {
    const cacheKey = `${text}|${voiceId || ''}`;
    if (audioCache.has(cacheKey)) continue;

    const params = new URLSearchParams({ text });
    if (voiceId) params.set('voice', voiceId);

    fetch(`/api/tts?${params.toString()}`)
      .then((res) => {
        if (!res.ok || res.status === 204) return;
        return res.blob();
      })
      .then((blob) => {
        if (blob && blob.size > 0) audioCache.set(cacheKey, blob);
      })
      .catch(() => {
        /* silent — preload is best-effort */
      });
  }
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
