/**
 * POST /api/video/render
 *
 * Triggers a server-side Remotion render for a tutorial video.
 * Requires @remotion/renderer to be installed (Node.js only — not edge).
 *
 * Body: TutorialVideoProps + preset
 * Returns: RenderJob (queued status with job ID)
 *
 * NOTE: Rendering is CPU/memory-intensive. On Vercel Pro this needs:
 *   export const maxDuration = 300; (5 min limit for Pro)
 *   export const runtime = 'nodejs';
 *
 * When ready to wire up:
 *   1. npm install @remotion/renderer
 *   2. Uncomment the render logic below
 *   3. Configure output storage (Vercel Blob or S3)
 */

import { NextResponse } from 'next/server';
import type { TutorialVideoProps, RenderJob } from '@/lib/remotion';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse<RenderJob>> {
  // Internal-only: require a shared secret so this isn't publicly callable
  const authHeader = req.headers.get('x-internal-secret');
  if (authHeader !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json(
      { id: '', status: 'failed', error: 'Unauthorized', createdAt: new Date().toISOString() },
      { status: 401 },
    );
  }

  const body = (await req.json()) as TutorialVideoProps & { preset?: string };

  // TODO: wire up @remotion/renderer when ready to render
  // import { renderMedia, selectComposition } from '@remotion/renderer';
  // const composition = await selectComposition({ ... });
  // await renderMedia({ composition, ... });

  const job: RenderJob = {
    id: `render-${Date.now()}`,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  console.log('[video/render] Job queued:', job.id, '— title:', body.title);

  return NextResponse.json(job);
}
