'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { speak, stopSpeaking } from '@/lib/tts';
import { getNamingLine, type GuidedActivityId } from '@/lib/guided-naming';

/**
 * do -> see -> name, as a hook.
 *
 * An activity calls `record(discoveryId)` whenever the child actually produces
 * an effect. The naming line for that effect appears straight away, phrased
 * for the child's GLP stage, and that particular effect never names again.
 *
 * The rule, and why it is this rule:
 *
 *   - NAME AFTER THE FIRST EFFECT. The doctrine is manipulation, then the
 *     consequence, then one calm sentence naming what the child has already
 *     produced. It is singular and it is per effect. An earlier version of
 *     this hook withheld every line until three distinct effects had been
 *     produced. That gate made most authored lines unreachable and could leave
 *     a child with no naming at all for a whole session, which defeats the
 *     doctrine it was meant to serve.
 *
 *   - ONE LINE PER EFFECT, ONCE. Each distinct effect earns its own single
 *     line the first time the child produces it, and never repeats. That is
 *     what keeps this anti-engagement: no streak, no counter, no escalation,
 *     and producing the same effect again is silent. A child who keeps
 *     dragging is never nagged; a child who explores widely is never starved.
 *
 *   - DISPLAY IS NEVER GATED ON AUDIO. The line is returned for display
 *     regardless. Speech is additive: with `speakEnabled` false, or the
 *     child's TTS volume at zero, the sentence is still on screen, so a deaf
 *     or hard-of-hearing child loses nothing.
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
  /** The current naming line, or null before the first effect and after dismiss. */
  line: string | null;
  /** Record that the child produced an effect. Effects already named are silent. */
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

  /**
   * Effects that have already named. A ref, not state: the child never sees a
   * count, and this must not trigger a render of its own.
   */
  const named = useRef<Set<string>>(new Set());
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
      // Already named this effect: stay silent. This is the anti-nag rule, and
      // it is the only gate. There is no threshold to reach.
      if (named.current.has(discoveryId)) return;

      const s = settingsRef.current;
      const text = getNamingLine(activityId, discoveryId, s.glpStage);
      // Unknown discovery id: show nothing rather than invent a sentence.
      if (!text) return;

      named.current.add(discoveryId);
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
    named.current = new Set();
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
