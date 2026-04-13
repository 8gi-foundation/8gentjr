/**
 * Render configuration for 8gent Jr tutorial videos.
 *
 * Server-side rendering uses @remotion/renderer (requires Node.js runtime).
 * On Vercel, run this in a serverless function with maxDuration = 300s.
 *
 * Output is written to /tmp during render, then uploaded to wherever
 * we decide to host (Vercel Blob, S3, Cloudflare R2 — TBD when needed).
 */

import type { VideoPreset, VideoPresetConfig } from '../types';

export const VIDEO_PRESETS: Record<VideoPreset, VideoPresetConfig> = {
  'youtube': { width: 1920, height: 1080, fps: 30 },
  'youtube-short': { width: 1080, height: 1920, fps: 30 },
  'square': { width: 1080, height: 1080, fps: 30 },
};

export const RENDER_DEFAULTS = {
  codec: 'h264' as const,
  imageFormat: 'jpeg' as const,
  jpegQuality: 90,
  // CRF 18 = near-lossless, good for tutorial content
  crf: 18,
  // Concurrency: 1 to avoid memory issues on serverless
  concurrency: 1,
  // Output to /tmp for Vercel serverless
  outputDir: '/tmp/remotion-renders',
};

export const COMPOSITION_ID = '8gentjr-tutorial';
