/**
 * 8gent Jr — Remotion video production module.
 *
 * Usage:
 *   import { TutorialVideo, getTutorialDuration } from '@/lib/remotion';
 *   import type { TutorialVideoProps, CaptionLine } from '@/lib/remotion';
 */

export { TutorialVideo, getTutorialDuration } from './compositions/TutorialVideo';
export type {
  TutorialVideoProps,
  CaptionLine,
  ScreenSegment,
  RenderJob,
  VideoPreset,
} from './types';
export { VIDEO_PRESETS, RENDER_DEFAULTS, COMPOSITION_ID } from './render/config';
