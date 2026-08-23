'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { speak, stopSpeaking } from '@/lib/tts';
import {
  DISCOVERIES_BEFORE_NAMING,
  getNamingLine,
  type GuidedActivityId,
} from '@/lib/guided-naming';

/**
 * do -> see -> name, as a hook.
 *
 * An activity calls `record(discoveryId)` whenever the child actually produces
 * an effect. Nothing is said or shown until the child has produced
 * DISCOVERIES_BEFORE_NAMING *distinct* effects. At that point exactly one
 * naming line appears, phrased for the child's GLP stage.
 *
 * Deliberate properties, all from issue #225:
 *
 *   - Fires ONCE per activity session. There is no streak, no counter shown to
 *     the child, no second nag. `reset()` exists for a genuine restart such as
 *     switching modes, not for re-earning praise.
 *
 *   - The line is returned for DISPLAY regardless of audio. Speech is additive.
 *     With `speakEnabled` false, or the child's TTS volume at zero, the
 *     activity is still complete: the sentence is on screen. A deaf or
 *     hard-of-hearing child loses nothing.
 *
 *   - Repeating the same discovery does not advance anything. Only distinct
 *     effects count, so waggling one slider cannot trigger the naming line.
 *
 * Issue: #225
 */

interface UseGuidedDiscoveryOptions {
  activityId: GuidedActivityId;
  /**
   * Whether the naming line may also be spoken. Callers pass their own audio
   * state here (for example a volume slider at zero, or a muted activity).
   * Display is never gated on this.
   */
  speakEnabled?: boolean;
}

interface UseGuidedDiscoveryResult {
  /** The single naming line, once earned. Null until then, and after dismiss. */
  line: string | null;
  /** Record that the child produced an effect. Repeats are ignored. */
  record: (discoveryId: string) => void;
  /** Child or carer dismissed the line. */
  dismiss: () => void;
  /** Clear all progress, for a genuine restart such as a mode change. */
  reset: () => void;
}

export function useGuidedDiscovery({
  activityId,
  speakEnabled = true,
}: UseGuidedDiscoveryOptions): UseGuidedDiscoveryResult {
  const { settings } = useApp();
  const [line, setLine] = useState<string | null>(null);

  /** Distinct discoveries produced so far. A ref: the child never sees a count. */
  const seen = useRef<Set<string>>(new Set());
  /** Latched once the single naming line has fired, so it cannot fire twice. */
  const named = useRef(false);
  /** True only if THIS activity started speech, so cleanup cannot cut off the talker. */
  const spoke = useRef(false);

  // Read settings through a ref so `record` stays referentially stable and does
  // not re-create on every settings change inside a canvas event handler.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const speakEnabledRef = useRef(speakEnabled);
  speakEnabledRef.current = speakEnabled;

  const record = useCallback(
    (discoveryId: string) => {
      if (named.current) return;
      if (seen.current.has(discoveryId)) return;
      seen.current.add(discoveryId);
      if (seen.current.size < DISCOVERIES_BEFORE_NAMING) return;

      const s = settingsRef.current;
      const text = getNamingLine(activityId, discoveryId, s.glpStage);
      // Unknown discovery id: show nothing rather than invent a sentence.
      if (!text) return;

      named.current = true;
      setLine(text);

      // Speech is additive. The line is already on screen either way.
      const volume = s.ttsVolume ?? 1;
      if (speakEnabledRef.current && volume > 0) {
        spoke.current = true;
        void speak({
          text,
          voiceId: s.selectedVoiceId ?? undefined,
          rate: s.ttsRate ?? 1,
          volume,
        }).catch(() => {
          /* silent: a failed voice must never break the visual activity */
        });
      }
    },
    [activityId],
  );

  const dismiss = useCallback(() => setLine(null), []);

  const reset = useCallback(() => {
    seen.current = new Set();
    named.current = false;
    setLine(null);
  }, []);

  // Never leave our sentence playing over the next screen. Guarded on `spoke`
  // so unmounting an activity that never spoke cannot cut off the talker.
  useEffect(() => {
    return () => {
      if (spoke.current) stopSpeaking();
    };
  }, []);

  return { line, record, dismiss, reset };
}
