'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import { useApp } from '@/context/AppContext';
import {
  linearFromDecibels,
  pitchFromBuffer,
  rms as rmsOf,
  spectralCentroid,
} from '@/lib/voice-analysis';
import {
  COPY,
  EXERCISES,
  EXERCISE_IDS,
  hueForCentroid,
  initialState,
  measure,
  registerFor,
  shapeIndexFor,
  stepVoicePlay,
  type CopyRegister,
  type ExerciseId,
  type MouthShapeId,
  type VoicePlayState,
} from '@/lib/voice-play';

/**
 * Voice Play - six mouth-position and held-sound drills with live feedback.
 *
 * THE THREE RULES THIS FILE EXISTS TO KEEP
 *
 * 1. NOTHING LISTENS UNTIL A FINGER SAYS SO. There is no AudioContext, no
 *    getUserMedia and no animation frame anywhere in this component until the
 *    child presses Start. Not a suspended context, not a warmed-up analyser,
 *    nothing. The permission sheet is explained in one plain line before the
 *    press, and the microphone closes on finish, on unmount and on the page
 *    being hidden. That last one is not decoration: a tab left open in a
 *    pocket with a live microphone is exactly the thing families are right to
 *    be afraid of.
 *
 * 2. NOTHING IS RECORDED. The analyser reads the live buffer and the numbers
 *    are drawn and discarded. No MediaRecorder, no upload, no camera, nothing
 *    written to storage. The page says so, in one line, where it is read.
 *
 * 3. THE DRAWING ONLY SAYS WHAT WAS MEASURED. Every attribute painted below
 *    comes from `measure()` over the reducer's state, and the reducer's state
 *    comes from the analyser. There is no decorative animation that could be
 *    mistaken for feedback: when the child is not sounding, the picture stops,
 *    because a picture that keeps dancing to nothing is a lie.
 *
 * WHY THE PAINTING IS NOT REACT
 *
 * One analysis pass per animation frame, and the results are written straight
 * onto DOM attributes through refs. Sixty renders a second of a component this
 * size would cost more than the pitch detector does, and the numbers are not
 * app state: they are a picture of the last twenty milliseconds. React holds
 * the phase, the naming line and the chosen exercise, which are the only things
 * that actually change what is on screen structurally.
 *
 * Issue: #238
 */

/* ── Palette ─────────────────────────────────────────────────────────────── */

const CREAM = '#FFF8F0';
const CARD = '#FFFFFF';
const EDGE = '#F0DECA';
const INK = '#1A1612';
const MUTED = '#6B7280';
const ACCENT = '#E8610A';
const CALM_BLUE = '#2E7D8F';

/* ── Mouth illustrations ─────────────────────────────────────────────────── */

interface ShapeGeometry {
  /** How far the jaw is dropped, 0 closed to 1 wide. */
  open: number;
  /** How wide the lips are spread, 0 pursed to 1 stretched. */
  width: number;
  /** How rounded the lips are, 0 relaxed to 1 pushed forward. */
  round: number;
  /** Where the tongue sits, 0 flat and low to 1 high and forward. */
  tongue: number;
  /** Short label under the drawing. */
  label: string;
}

/**
 * Our own line art, drawn from three numbers a person can feel in their own
 * mouth: how far the jaw is down, how wide the lips are, where the tongue sits.
 *
 * Deliberately not a photograph and deliberately not a face. A photograph of a
 * mouth is somebody's mouth, and a cartoon face invites a child to look at the
 * eyes instead of at the thing they are supposed to copy.
 */
const SHAPES: Record<MouthShapeId, ShapeGeometry> = {
  'two-fingers': { open: 0.85, width: 0.5, round: 0.1, tongue: 0.05, label: 'uh' },
  ah: { open: 0.9, width: 0.68, round: 0.05, tongue: 0.1, label: 'ah' },
  eh: { open: 0.55, width: 0.8, round: 0.05, tongue: 0.45, label: 'eh' },
  ee: { open: 0.24, width: 0.95, round: 0.0, tongue: 0.9, label: 'ee' },
  oh: { open: 0.7, width: 0.42, round: 0.75, tongue: 0.2, label: 'oh' },
  oo: { open: 0.34, width: 0.28, round: 1.0, tongue: 0.35, label: 'oo' },
  relaxed: { open: 0.5, width: 0.62, round: 0.2, tongue: 0.3, label: 'open' },
};

function MouthShape({
  shape,
  size = 132,
  showFingers = false,
}: {
  shape: MouthShapeId;
  size?: number;
  showFingers?: boolean;
}) {
  const g = SHAPES[shape];
  // Unique per instance: several of these are on screen at once and a shared
  // clip id would make every mouth wear the first one's opening.
  const clipId = useId().replace(/:/g, '');
  const cx = 60;
  const cy = 60;
  const rx = 16 + g.width * 26;
  const ry = 6 + g.open * 30;
  // Rounded lips are drawn thicker, which is what rounding looks like from the
  // front: less opening, more lip.
  const lip = 5 + g.round * 6;
  /* The tongue is drawn as a quadratic whose PEAK is the tongue height. The
     control point of a quadratic is not on the curve: it sits twice as far
     out, so using the height directly as the control put the tongue four
     pixels tall inside a sixty pixel mouth and it read as no tongue at all. */
  const tongueBase = cy + ry + 3;
  const tonguePeak = cy + ry - 4 - g.tongue * (ry * 1.5);
  const tongueControl = 2 * tonguePeak - tongueBase;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Mouth position: ${g.label}`}
      style={{ display: 'block' }}
    >
      <defs>
        {/* Everything inside the mouth is clipped to the opening. Without this
            the teeth and the tongue spill past the lips and every shape ends up
            looking like the same dark blob, which is exactly what the first
            evidence run showed. */}
        <clipPath id={clipId}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>

      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3B2A22" />

      <g clipPath={`url(#${clipId})`}>
        {/* Upper teeth: a plain strip, not individual teeth. */}
        <rect
          x={cx - rx}
          y={cy - ry}
          width={rx * 2}
          height={Math.max(5, ry * 0.34)}
          fill="#FFFFFF"
        />
        {/* Lower teeth. */}
        <rect
          x={cx - rx}
          y={cy + ry - Math.max(4, ry * 0.24)}
          width={rx * 2}
          height={Math.max(4, ry * 0.24)}
          fill="#F7F2EC"
        />
        {/* Tongue: low and back for uh and ah, high and forward for ee. */}
        <path
          d={`M ${cx - rx} ${tongueBase} Q ${cx} ${tongueControl} ${cx + rx} ${tongueBase} Z`}
          fill="#D98C7A"
        />
        {showFingers && (
          <g aria-hidden="true">
            {/* Two stacked fingers between the teeth: the opening is measured
                with the child's own hand, never with a camera. */}
            <rect
              x={cx - 10}
              y={cy - ry * 0.86}
              width={20}
              height={ry * 0.78}
              rx={6}
              fill="#F6D9C4"
              stroke="#C2705C"
              strokeWidth={2}
            />
            <rect
              x={cx - 10}
              y={cy + ry * 0.06}
              width={20}
              height={ry * 0.78}
              rx={6}
              fill="#F6D9C4"
              stroke="#C2705C"
              strokeWidth={2}
            />
          </g>
        )}
      </g>

      {/* Lips, drawn last so they close the shape over everything inside. */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#C2705C" strokeWidth={lip} />
    </svg>
  );
}

/* ── The exercise runner ─────────────────────────────────────────────────── */

/** How often the pitch and spectrum pass runs. Never more than once a frame. */
const SPECTRAL_INTERVAL_MS = 50;

interface RunnerRefs {
  ring: SVGCircleElement | null;
  blob: SVGCircleElement | null;
  level: SVGRectElement | null;
  meter: SVGRectElement | null;
  contour: SVGPolylineElement | null;
  envelope: SVGPolylineElement | null;
  bumps: SVGGElement | null;
  seconds: HTMLElement | null;
  readout: HTMLElement | null;
}

function ExerciseRunner({
  exercise,
  register,
  onBack,
}: {
  exercise: ExerciseId;
  register: CopyRegister;
  onBack: () => void;
}) {
  const spec = EXERCISES[exercise];
  const copy = COPY[exercise][register];

  const [calm] = useCalmMode();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /**
   * Decoration, not feedback. Glow and easing are the first things to go when a
   * child has asked for less, and the feedback itself is the last, because the
   * feedback IS the activity: a Voice Play with the drawing turned off is not a
   * calmer Voice Play, it is a blank screen with a microphone open.
   */
  const plain = calm || reduceMotion;

  const { line, record, dismiss } = useGuidedDiscovery({ activityId: 'voice-play' });

  /** The whole exercise, in a ref. React sees the phase, not the frames. */
  const stateRef = useRef<VoicePlayState>(initialState(exercise));
  const [phase, setPhase] = useState<VoicePlayState['phase']>('idle');
  const [micDenied, setMicDenied] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof measure> | null>(null);
  const [shapeIndex, setShapeIndex] = useState(0);
  const shapeIndexRef = useRef(0);

  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Explicitly backed by an ArrayBuffer rather than an ArrayBufferLike: the
  // analyser methods refuse a possibly-shared buffer, and the same annotation
  // is what ChladniVisualizer carries for the same reason.
  const timeBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const freqBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef(0);
  const lastSpectralRef = useRef(0);
  const smoothRef = useRef({ level: 0, steady: 0, hue: 210 });

  const refs = useRef<RunnerRefs>({
    ring: null,
    blob: null,
    level: null,
    meter: null,
    contour: null,
    envelope: null,
    bumps: null,
    seconds: null,
    readout: null,
  });

  /* ── Painting ────────────────────────────────────────────────────────── */

  const paint = useCallback(
    (state: VoicePlayState) => {
      const m = measure(state);
      const r = refs.current;
      const sm = smoothRef.current;

      // Easing exists so a jittery frame does not make the picture twitch. When
      // the child has asked for less movement it is turned off, which makes the
      // picture MORE literal, not less.
      const ease = plain ? 1 : 0.25;
      sm.level += (Math.min(1, m.level * 6) - sm.level) * ease;
      sm.steady += (m.pitchSteadiness - sm.steady) * ease;

      if (r.readout) {
        const d = r.readout.dataset;
        d.phase = state.phase;
        d.hz = m.pitchHz > 0 ? m.pitchHz.toFixed(1) : '';
        d.rms = m.level.toFixed(5);
        d.heldMs = Math.round(state.heldMs).toString();
        d.steadiness = m.pitchSteadiness.toFixed(3);
        d.breath = m.breathEvenness.toFixed(3);
        d.centroid = m.centroidHz > 0 ? m.centroidHz.toFixed(1) : '';
        d.centroidSpan = m.centroidSpanHz.toFixed(1);
        d.onsets = m.onsetCount.toString();
        d.onsetSlope = m.meanOnsetSlope.toFixed(3);
        d.slideCents = m.slideCents.toFixed(1);
        d.shapeIndex = m.shapeIndex.toString();
        d.phonating = state.phonating ? '1' : '0';
      }

      if (r.seconds) r.seconds.textContent = `${m.heldSeconds.toFixed(1)} s`;
      if (r.meter) r.meter.setAttribute('width', (m.progress * 240).toFixed(1));
      if (r.level) r.level.setAttribute('width', (sm.level * 240).toFixed(1));

      // 1. The steadying ring. Radius is tight when the pitch is steady and
      // loose when it wanders, and it does not move at all when nothing is
      // sounding, so a still ring always means silence rather than perfection.
      if (r.ring) {
        const looseness = state.phonating ? 1 - sm.steady : 1;
        r.ring.setAttribute('r', (34 + looseness * 22).toFixed(1));
        r.ring.setAttribute('stroke-width', (2 + looseness * 5).toFixed(1));
        r.ring.setAttribute('opacity', state.phonating ? '1' : '0.35');
      }

      // 5. Colour follows the spectrum, position does not follow anything: the
      // blob stays put because the note stayed put.
      if (r.blob) {
        const hue = hueForCentroid(m.centroidHz);
        sm.hue += (hue - sm.hue) * (plain ? 1 : 0.2);
        r.blob.setAttribute('fill', `hsl(${sm.hue.toFixed(1)} 58% 52%)`);
        r.blob.setAttribute('r', (26 + sm.level * 16).toFixed(1));
      }

      // 6. The contour draws itself out of the pitch history.
      if (r.contour) {
        r.contour.setAttribute('points', contourPoints(state.pitchHz));
      }

      // 3. The loudness envelope, which is the breath being spent.
      if (r.envelope) {
        r.envelope.setAttribute('points', envelopePoints(state.envelope));
      }

      // 4. One bump per onset, round for a gentle start and pointed for a slam.
      if (r.bumps) {
        r.bumps.innerHTML = state.onsets
          .slice(-6)
          .map((o, i) => {
            const sharp = Math.max(0, Math.min(1, o.slope / 6));
            const x = 24 + i * 44;
            const h = 20 + sharp * 46;
            const w = 30 - sharp * 20;
            const colour = sharp > 0.45 ? '#C2410C' : CALM_BLUE;
            return `<path d="M ${x - w} 84 Q ${x} ${84 - h * (sharp > 0.45 ? 1.6 : 1)} ${x + w} 84 Z" fill="${colour}" opacity="0.85" />`;
          })
          .join('');
      }

      // The shape index is the one frame-derived value that changes what is
      // STRUCTURALLY on screen, so it goes through React. It moves once every
      // fifteen seconds, which is not a render budget problem.
      const nextShape = shapeIndexFor(state);
      if (nextShape !== shapeIndexRef.current) {
        shapeIndexRef.current = nextShape;
        setShapeIndex(nextShape);
      }
    },
    [plain],
  );

  /* ── Microphone lifecycle ────────────────────────────────────────────── */

  const closeAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      void audioRef.current.close().catch(() => {
        /* already closing */
      });
      audioRef.current = null;
    }
    analyserRef.current = null;
    timeBufRef.current = null;
    freqBufRef.current = null;
  }, []);

  const runLoop = useCallback(() => {
    const loop = (now: number) => {
      const analyser = analyserRef.current;
      const ctx = audioRef.current;
      const time = timeBufRef.current;
      const freq = freqBufRef.current;

      let level = 0;
      let pitchHz: number | undefined;
      let centroidHz: number | undefined;

      if (analyser && ctx && time && freq) {
        analyser.getFloatTimeDomainData(time);
        // Loudness over the window this exercise asked for. Soft Start reads a
        // short tail because the whole 43 ms buffer cannot rise faster than
        // 43 ms and would call a slam gentle; see levelWindowSamples.
        const win = EXERCISES[stateRef.current.exercise].levelWindowSamples;
        level = win > 0 && win < time.length ? rmsOf(time.subarray(time.length - win)) : rmsOf(time);

        // The one analysis pass. Throttled, and never more than once per frame:
        // the pitch detector is the expensive thing on the page and running it
        // sixty times a second on a low-end tablet would cost more than the
        // whole rest of the activity.
        if (now - lastSpectralRef.current >= SPECTRAL_INTERVAL_MS) {
          lastSpectralRef.current = now;
          pitchHz = pitchFromBuffer(time, ctx.sampleRate, {
            noiseFloor: EXERCISES[stateRef.current.exercise].noiseFloor * 0.6,
          });
          analyser.getFloatFrequencyData(freq);
          centroidHz = spectralCentroid(linearFromDecibels(freq), ctx.sampleRate);
        }
      }

      const step = stepVoicePlay(stateRef.current, {
        type: 'frame',
        nowMs: now,
        rms: level,
        ...(pitchHz !== undefined ? { pitchHz } : {}),
        ...(centroidHz !== undefined ? { centroidHz } : {}),
      });
      stateRef.current = step.state;
      paint(step.state);
      for (const id of step.emit) record(id);

      if (step.state.phase === 'holding') {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        // Done. The loop stops and so does the microphone: there is no idle
        // listening state in this activity.
        rafRef.current = 0;
        closeAudio();
        setPhase(step.state.phase);
        setSummary(measure(step.state));
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [closeAudio, paint, record]);

  const start = useCallback(async () => {
    if (stateRef.current.phase !== 'idle') return;
    setSummary(null);
    setMicDenied(false);

    const pressed = stepVoicePlay(stateRef.current, { type: 'press' });
    stateRef.current = pressed.state;
    setPhase(pressed.state.phase);

    if (!spec.needsMic) {
      lastSpectralRef.current = 0;
      runLoop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // All three off: they are designed to make speech clearer on a call
          // and they would each quietly rewrite the thing being measured.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      // Analyser only. The microphone is never routed to the speakers, which
      // would howl and would also be a recording device by another name.
      source.connect(analyser);

      analyserRef.current = analyser;
      timeBufRef.current = new Float32Array(analyser.fftSize);
      freqBufRef.current = new Float32Array(analyser.frequencyBinCount);

      const ready = stepVoicePlay(stateRef.current, { type: 'micReady' });
      stateRef.current = ready.state;
      setPhase(ready.state.phase);
      lastSpectralRef.current = 0;
      runLoop();
    } catch {
      closeAudio();
      const denied = stepVoicePlay(stateRef.current, { type: 'micDenied' });
      stateRef.current = denied.state;
      setPhase(denied.state.phase);
      setMicDenied(true);
    }
  }, [closeAudio, runLoop, spec.needsMic]);

  const finish = useCallback(() => {
    closeAudio();
    const step = stepVoicePlay(stateRef.current, { type: 'finish' });
    stateRef.current = step.state;
    setPhase(step.state.phase);
    setSummary(measure(step.state));
    // The loop has stopped, so the last thing it painted is still on screen and
    // in the readout. Paint the final state once by hand, or the picture keeps
    // describing a moment that has passed.
    paint(step.state);
  }, [closeAudio, paint]);

  const again = useCallback(() => {
    stateRef.current = initialState(exercise);
    shapeIndexRef.current = 0;
    setShapeIndex(0);
    setPhase('idle');
    setSummary(null);
    paint(stateRef.current);
  }, [exercise, paint]);

  /* A hidden page is a page nobody is holding. Everything stops. */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      closeAudio();
      const step = stepVoicePlay(stateRef.current, { type: 'hide' });
      stateRef.current = step.state;
      setPhase(step.state.phase);
      paint(step.state);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [closeAudio, paint]);

  /* And leaving the exercise closes it too, however the leaving happened. */
  useEffect(() => closeAudio, [closeAudio]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  const running = phase === 'holding' || phase === 'armed';
  const shape = spec.shapes[Math.min(shapeIndex, spec.shapes.length - 1)];

  return (
    <section
      style={{
        background: CARD,
        border: `1px solid ${EDGE}`,
        borderRadius: 20,
        padding: 20,
        boxShadow: plain ? 'none' : '0 2px 12px rgba(232, 97, 10, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            closeAudio();
            onBack();
          }}
          aria-label="Back to all exercises"
          style={{
            minWidth: 44,
            minHeight: 44,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 12,
            border: `1px solid ${EDGE}`,
            background: CREAM,
            color: ACCENT,
            cursor: 'pointer',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: INK,
            fontFamily: 'var(--font-fraunces), serif',
          }}
        >
          {copy.title}
        </h2>
      </div>

      {/* The mouth position, and what it is showing. */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ background: CREAM, borderRadius: 16, padding: 8 }}>
          <MouthShape shape={shape} showFingers={exercise === 'open-and-hold'} />
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: INK }}>{copy.cue}</p>
          <p style={{ margin: '0 0 6px', fontSize: 14, color: MUTED, lineHeight: 1.45 }}>
            {copy.mouthNote}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.45 }}>{copy.watch}</p>
        </div>
      </div>

      {/* The feedback. Everything in here is painted from a measurement. */}
      <div
        ref={(el) => {
          refs.current.readout = el;
        }}
        data-voice-readout=""
        data-exercise={exercise}
        style={{ marginTop: 16 }}
      >
        <Feedback exercise={exercise} refs={refs} shapeIndex={shapeIndex} />
      </div>

      {/* The naming line sits directly under the drawing rather than at the
          bottom of the panel. It arrives the moment the effect happens, and a
          sentence a child has to scroll to find is a sentence they do not read.
          The dock is fixed to the bottom of the viewport, which is the other
          half of the reason. */}
      <NamingCard line={line} onDismiss={dismiss} accent={ACCENT} className="mt-4" />

      {/* Controls. */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {phase === 'idle' && (
          <button
            type="button"
            onClick={() => void start()}
            data-voice-start=""
            style={primaryButton}
          >
            Start
          </button>
        )}
        {running && (
          <button type="button" onClick={finish} data-voice-finish="" style={primaryButton}>
            Finish
          </button>
        )}
        {phase === 'done' && (
          <button type="button" onClick={again} data-voice-again="" style={primaryButton}>
            Go again
          </button>
        )}
      </div>

      {/* The one plain line before the permission sheet appears. */}
      {phase === 'idle' && spec.needsMic && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          Start opens the microphone so the screen can follow your sound. Your device will ask
          first. Nothing is recorded and nothing is sent anywhere.
        </p>
      )}
      {phase === 'idle' && !spec.needsMic && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          This one makes no sound, so the microphone stays closed.
        </p>
      )}

      {micDenied && (
        <p
          role="status"
          style={{ margin: '12px 0 0', fontSize: 14, color: INK, lineHeight: 1.5 }}
        >
          The microphone stayed closed, so this exercise cannot draw your sound. Silent Shapes
          works without it.
        </p>
      )}

      {summary && summaryLine(exercise, summary) && (
        <p style={{ margin: '12px 0 0', fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
          {summaryLine(exercise, summary)}
        </p>
      )}

    </section>
  );
}

/**
 * What to say once the exercise stops, in one plain sentence.
 *
 * Exercise-aware because "you held it for 1.4 seconds" is a nonsense thing to
 * say about three separate ah sounds, and saying it anyway is how a screen
 * teaches a child that it is not really watching.
 */
function summaryLine(exercise: ExerciseId, m: ReturnType<typeof measure>): string | null {
  switch (exercise) {
    case 'silent-shapes':
      return `You worked through the shapes for ${m.heldSeconds.toFixed(0)} seconds.`;
    case 'soft-start':
      // The bumps above already say it, and a count would turn three sounds
      // into a score.
      return null;
    default:
      return `You held it for ${m.heldSeconds.toFixed(1)} seconds.`;
  }
}

const primaryButton: CSSProperties = {
  minHeight: 48,
  minWidth: 120,
  padding: '0 22px',
  borderRadius: 999,
  border: 'none',
  background: ACCENT,
  color: '#FFFFFF',
  fontSize: 17,
  fontWeight: 700,
  cursor: 'pointer',
};

/* ── Per-exercise feedback drawings ──────────────────────────────────────── */

/** Pitch history as an SVG polyline, log scaled so an octave is an octave. */
function contourPoints(pitchHz: readonly number[]): string {
  const kept = pitchHz.slice(-160);
  if (kept.length === 0) return '';
  const lo = Math.log2(80);
  const hi = Math.log2(1000);
  const pts: string[] = [];
  kept.forEach((hz, i) => {
    if (hz <= 0) return;
    const x = (i / Math.max(1, kept.length - 1)) * 280 + 10;
    const t = Math.max(0, Math.min(1, (Math.log2(hz) - lo) / (hi - lo)));
    pts.push(`${x.toFixed(1)},${(100 - t * 90).toFixed(1)}`);
  });
  return pts.join(' ');
}

/** Loudness history as an SVG polyline. */
function envelopePoints(envelope: readonly number[]): string {
  const kept = envelope.slice(-280);
  if (kept.length === 0) return '';
  return kept
    .map((v, i) => {
      const x = (i / Math.max(1, kept.length - 1)) * 280 + 10;
      const y = 100 - Math.min(1, v * 6) * 90;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function Feedback({
  exercise,
  refs,
  shapeIndex,
}: {
  exercise: ExerciseId;
  refs: RefObject<RunnerRefs>;
  shapeIndex: number;
}) {

  const meter = (
    <svg viewBox="0 0 300 22" width="100%" height={22} aria-hidden="true">
      <rect x={30} y={4} width={240} height={14} rx={7} fill="#FFF1E6" />
      <rect
        ref={(el) => {
          refs.current.meter = el;
        }}
        x={30}
        y={4}
        width={0}
        height={14}
        rx={7}
        fill={ACCENT}
      />
    </svg>
  );

  const seconds = (
    <p
      ref={(el) => {
        refs.current.seconds = el;
      }}
      aria-live="off"
      style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: INK, textAlign: 'center' }}
    >
      0.0 s
    </p>
  );

  const loudnessBar = (
    <svg viewBox="0 0 300 22" width="100%" height={22} aria-hidden="true">
      <rect x={30} y={6} width={240} height={10} rx={5} fill="#EAF3F5" />
      <rect
        ref={(el) => {
          refs.current.level = el;
        }}
        x={30}
        y={6}
        width={0}
        height={10}
        rx={5}
        fill={CALM_BLUE}
      />
    </svg>
  );

  switch (exercise) {
    case 'open-and-hold':
      return (
        <div>
          <svg viewBox="0 0 200 130" width="100%" height={150} aria-hidden="true">
            <circle cx={100} cy={65} r={34} fill="#FFF1E6" />
            <circle
              ref={(el) => {
                refs.current.ring = el;
              }}
              cx={100}
              cy={65}
              r={56}
              fill="none"
              stroke={ACCENT}
              strokeWidth={7}
              opacity={0.35}
            />
          </svg>
          {loudnessBar}
          {meter}
          {seconds}
        </div>
      );

    case 'silent-shapes':
      return (
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: INK }}>
            {SHAPES[EXERCISES['silent-shapes'].shapes[shapeIndex]].label}
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            {EXERCISES['silent-shapes'].shapes.map((s, i) => (
              <span
                key={s}
                aria-hidden="true"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  background: i <= shapeIndex ? ACCENT : EDGE,
                }}
              />
            ))}
          </div>
          {meter}
          {seconds}
        </div>
      );

    case 'long-low-note':
      return (
        <div>
          <svg viewBox="0 0 300 110" width="100%" height={130} aria-hidden="true">
            <rect x={10} y={5} width={280} height={100} rx={12} fill="#F3F8F9" />
            <polyline
              ref={(el) => {
                refs.current.envelope = el;
              }}
              points=""
              fill="none"
              stroke={CALM_BLUE}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          {meter}
          {seconds}
        </div>
      );

    case 'soft-start':
      // No hold meter and no clock here. This exercise is not a hold: what it
      // has to show is the SHAPE of each start, and a timer counting the total
      // length of three separate sounds would be a number about nothing.
      return (
        <div>
          <svg viewBox="0 0 300 100" width="100%" height={120} aria-hidden="true">
            <rect x={10} y={5} width={280} height={90} rx={12} fill="#F3F8F9" />
            <line x1={10} y1={84} x2={290} y2={84} stroke="#D8E4E7" strokeWidth={2} />
            <g
              ref={(el) => {
                refs.current.bumps = el;
              }}
            />
          </svg>
          {loudnessBar}
        </div>
      );

    case 'three-colours':
      return (
        <div>
          <svg viewBox="0 0 200 130" width="100%" height={150} aria-hidden="true">
            {/* The pitch lock. It does not move, because the note does not. */}
            <circle cx={100} cy={65} r={52} fill="none" stroke="#D8E4E7" strokeWidth={4} />
            <circle
              ref={(el) => {
                refs.current.blob = el;
              }}
              cx={100}
              cy={65}
              r={26}
              fill="hsl(213 58% 52%)"
            />
          </svg>
          {meter}
          {seconds}
        </div>
      );

    case 'slide':
      return (
        <div>
          <svg viewBox="0 0 300 110" width="100%" height={130} aria-hidden="true">
            <rect x={10} y={5} width={280} height={100} rx={12} fill="#F3F8F9" />
            <polyline
              ref={(el) => {
                refs.current.contour = el;
              }}
              points=""
              fill="none"
              stroke={ACCENT}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          {meter}
          {seconds}
        </div>
      );
  }

}

/* ── The activity ────────────────────────────────────────────────────────── */

export default function VoicePlay() {
  const { settings } = useApp();
  const [selected, setSelected] = useState<ExerciseId | null>(null);

  const register = useMemo(
    () => registerFor({ accountType: settings.accountType, isChild: settings.isChild }),
    [settings.accountType, settings.isChild],
  );

  if (selected) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 16px 40px' }}>
        <ExerciseRunner
          key={selected}
          exercise={selected}
          register={register}
          onBack={() => setSelected(null)}
        />
        <PrivacyNote />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 16px 40px' }}>
      <p style={{ margin: '0 0 16px', fontSize: 15, color: MUTED, lineHeight: 1.5 }}>
        {register === 'child'
          ? 'Pick one. Make the shape, hold the sound, and watch what your voice does.'
          : 'Pick a drill. Set the mouth position, sustain the sound, and read what the screen measured.'}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
        }}
      >
        {EXERCISE_IDS.map((id) => {
          const copy = COPY[id][register];
          const spec = EXERCISES[id];
          return (
            <button
              key={id}
              type="button"
              data-voice-exercise={id}
              onClick={() => setSelected(id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '20px 14px 18px',
                borderRadius: 16,
                background: CARD,
                border: `1px solid ${EDGE}`,
                boxShadow: '0 2px 12px rgba(232, 97, 10, 0.08)',
                minHeight: 56,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <MouthShape
                shape={spec.shapes[0]}
                size={76}
                showFingers={id === 'open-and-hold'}
              />
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: INK,
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                {copy.title}
              </span>
              <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.4 }}>{copy.blurb}</span>
            </button>
          );
        })}
      </div>

      <PrivacyNote />
    </div>
  );
}

function PrivacyNote() {
  return (
    <p
      style={{
        margin: '20px 0 0',
        fontSize: 13,
        color: MUTED,
        lineHeight: 1.5,
        textAlign: 'center',
      }}
    >
      Your voice is listened to on this device only, while an exercise is running. Nothing is
      recorded, nothing is uploaded, and the camera is never used.
    </p>
  );
}
