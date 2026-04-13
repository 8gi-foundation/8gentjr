'use client';

/**
 * TutorialVideo — Remotion composition for 8gent Jr how-to videos.
 *
 * Structure:
 *   0 → 3s      Opening title card (brand dark bg, animated title)
 *   3s → end-2s Screen recording with caption bar at bottom
 *   end-2s → end Outro card ("8gentjr.com — Free forever.")
 *
 * The AAC child's voice narrates. Captions are synced to the narration.
 */

import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CaptionLine, ScreenSegment, TutorialVideoProps } from '../types';

const BRAND_BG = '#1A1209';
const BRAND_ORANGE = '#E8610A';
const BRAND_CREAM = '#FDFCFA';
const TITLE_CARD_SEC = 3;
const OUTRO_SEC = 2;

// ---------------------------------------------------------------------------
// Title card — shown for the first 3 seconds
// ---------------------------------------------------------------------------

function TitleCard({ title, subtitle }: { title: string; subtitle?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 });
  const translateY = interpolate(frame, [0, 20], [24, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND_BG,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        padding: 60,
      }}
    >
      {/* 8gent Jr wordmark */}
      <div
        style={{
          opacity: opacity * 0.7,
          color: BRAND_ORANGE,
          fontSize: 22,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        8gent Jr
      </div>

      {/* Main title */}
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          color: BRAND_CREAM,
          fontSize: 52,
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 800,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }),
            color: 'rgba(253,252,250,0.6)',
            fontSize: 24,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Caption bar — synced to the narration
// ---------------------------------------------------------------------------

function CaptionBar({
  captions,
  offsetSec,
}: {
  captions: CaptionLine[];
  offsetSec: number; // how many seconds this sequence started after video start
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps + offsetSec;

  const active = captions.find(
    (c) => currentSec >= c.startSec && currentSec < c.endSec,
  );

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        padding: '10px 24px',
        maxWidth: '80%',
        textAlign: 'center',
        color: '#FFFFFF',
        fontSize: 28,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      {active.text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outro card
// ---------------------------------------------------------------------------

function OutroCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND_BG,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          opacity,
          color: BRAND_ORANGE,
          fontSize: 48,
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
        }}
      >
        8gent Jr
      </div>
      <div
        style={{
          opacity,
          color: 'rgba(253,252,250,0.7)',
          fontSize: 22,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Free forever. 8gentjr.com
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Screen segment layer
// ---------------------------------------------------------------------------

function ScreenLayer({ segment }: { segment: ScreenSegment }) {
  return (
    <Video
      src={segment.src}
      startFrom={Math.round(segment.startSec * 30)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Root composition
// ---------------------------------------------------------------------------

export function TutorialVideo({
  screenSegments,
  captions,
  narrationSrc,
  title,
  subtitle,
}: TutorialVideoProps) {
  const { fps } = useVideoConfig();

  const titleFrames = TITLE_CARD_SEC * fps;
  const outroFrames = OUTRO_SEC * fps;

  // Total duration from screen segments
  const screenDurationSec = screenSegments.reduce(
    (acc, s) => acc + (s.endSec - s.startSec),
    0,
  );
  const screenFrames = Math.round(screenDurationSec * fps);

  let segmentOffset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND_BG }}>
      {/* Narration audio — runs from the start of the screen section */}
      {narrationSrc && (
        <Sequence from={titleFrames}>
          <Audio src={narrationSrc} />
        </Sequence>
      )}

      {/* 1. Title card */}
      <Sequence from={0} durationInFrames={titleFrames}>
        <TitleCard title={title} subtitle={subtitle} />
      </Sequence>

      {/* 2. Screen segments with captions */}
      {screenSegments.map((segment, i) => {
        const segDuration = Math.round((segment.endSec - segment.startSec) * fps);
        const from = titleFrames + Math.round(segmentOffset * fps);
        const currentOffset = segmentOffset;
        segmentOffset += segment.endSec - segment.startSec;

        return (
          <Sequence key={i} from={from} durationInFrames={segDuration}>
            <AbsoluteFill>
              <ScreenLayer segment={segment} />
              <CaptionBar captions={captions} offsetSec={currentOffset} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* 3. Outro */}
      <Sequence from={titleFrames + screenFrames} durationInFrames={outroFrames}>
        <OutroCard />
      </Sequence>
    </AbsoluteFill>
  );
}

/** Total frame count for a tutorial video — use this as durationInFrames in registerRoot. */
export function getTutorialDuration(
  screenSegments: ScreenSegment[],
  fps = 30,
): number {
  const screenSec = screenSegments.reduce((acc, s) => acc + (s.endSec - s.startSec), 0);
  return (TITLE_CARD_SEC + screenSec + OUTRO_SEC) * fps;
}
