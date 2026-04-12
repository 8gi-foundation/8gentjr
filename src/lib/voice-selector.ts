/**
 * 8gent Jr — Voice Selector
 *
 * Picks the best available SpeechSynthesisVoice for child-friendly TTS.
 * Priority: Samantha/Karen (macOS) > Google UK English Female > any en-US > any en
 * Result is cached after first call so voice is consistent across utterances.
 */

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

export function getBestVoice(lang = 'en-US'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  if (cachedVoice !== undefined) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet — caller should retry after voiceschanged
    return null;
  }

  // Priority 1: child / junior in name
  const childVoice = voices.find((v) =>
    /child|junior/i.test(v.name)
  );
  if (childVoice) { cachedVoice = childVoice; return cachedVoice; }

  // Priority 2: Samantha or Karen (macOS natural voices)
  const macFav = voices.find((v) =>
    /Samantha|Karen/i.test(v.name)
  );
  if (macFav) { cachedVoice = macFav; return cachedVoice; }

  // Priority 3: Google UK English Female
  const googleFemale = voices.find((v) =>
    v.name === 'Google UK English Female'
  );
  if (googleFemale) { cachedVoice = googleFemale; return cachedVoice; }

  // Priority 4: any en-US
  const enUS = voices.find((v) => v.lang === lang);
  if (enUS) { cachedVoice = enUS; return cachedVoice; }

  // Priority 5: any English
  const anyEn = voices.find((v) => v.lang.startsWith('en'));
  cachedVoice = anyEn ?? null;
  return cachedVoice;
}

// ---------------------------------------------------------------------------
// Speak wrapper
// ---------------------------------------------------------------------------

export function speakWithBestVoice(text: string, rate = 1.0): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('SpeechSynthesis not available'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(2, rate));
    utterance.lang = 'en-US';

    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(e.error));

    window.speechSynthesis.speak(utterance);
  });
}
