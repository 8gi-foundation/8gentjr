/**
 * Remotion types for 8gent Jr video production.
 *
 * Used for compositing tutorial screen recordings with:
 * - Animated captions synced to the AAC voice audio
 * - 8gent Jr branding (lower-thirds, title cards)
 * - Export at 9:16 (YouTube Shorts/social) and 16:9 (YouTube)
 */

export type VideoPreset = 'youtube' | 'youtube-short' | 'square';

export interface VideoPresetConfig {
  width: number;
  height: number;
  fps: number;
}

export const VIDEO_PRESETS: Record<VideoPreset, VideoPresetConfig> = {
  'youtube': { width: 1920, height: 1080, fps: 30 },
  'youtube-short': { width: 1080, height: 1920, fps: 30 },
  'square': { width: 1080, height: 1080, fps: 30 },
};

/** A timed caption line, synced to the AAC voice narration. */
export interface CaptionLine {
  text: string;
  startSec: number; // seconds from start of video
  endSec: number;
}

/** A screen recording segment to use as base video. */
export interface ScreenSegment {
  src: string;      // path or URL to the mp4
  startSec: number; // trim start
  endSec: number;   // trim end
}

/** Full composition props for a tutorial video. */
export interface TutorialVideoProps {
  /** The screen recording(s) to use as the base layer. */
  screenSegments: ScreenSegment[];
  /** Captions synced to the AAC narration audio. */
  captions: CaptionLine[];
  /** Path/URL to the AAC voice narration mp3. */
  narrationSrc?: string;
  /** Title shown on the opening card (2-3 sec). */
  title: string;
  /** Optional subtitle for the opening card. */
  subtitle?: string;
  /** Output preset. Default: youtube */
  preset?: VideoPreset;
}

/** Render job status for API responses. */
export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'complete' | 'failed';
  outputUrl?: string;
  error?: string;
  createdAt: string;
}
