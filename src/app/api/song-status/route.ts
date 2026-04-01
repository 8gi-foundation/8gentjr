import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/song-status?taskId=xxx
 *
 * Polls Suno for song generation progress.
 * Returns: { status: 'complete'|'processing'|'failed', audioUrl?, title?, duration? }
 *
 * Issue: #10
 */

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    const sunoKey = process.env.SUNO_API_KEY;
    if (!sunoKey) {
      return NextResponse.json({ error: 'Music service not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${sunoKey}` },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }

    const data = await res.json();

    if (data.code !== 200) {
      return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }

    const status = data.data?.status;
    const sunoTracks = data.data?.response?.sunoData || [];

    // Complete — return first track
    if (status === 'SUCCESS' && sunoTracks.length > 0) {
      const track = sunoTracks[0];
      return NextResponse.json({
        status: 'complete',
        audioUrl: track.audioUrl,
        streamUrl: track.streamAudioUrl,
        imageUrl: track.imageUrl,
        title: track.title,
        duration: track.duration,
        tags: track.tags,
      });
    }

    // Failed states
    if (
      status === 'CREATE_TASK_FAILED' ||
      status === 'GENERATE_AUDIO_FAILED' ||
      status === 'CALLBACK_EXCEPTION' ||
      status === 'SENSITIVE_WORD_ERROR'
    ) {
      return NextResponse.json({ status: 'failed', error: status });
    }

    // Still processing
    return NextResponse.json({
      status: 'processing',
      sunoStatus: status,
    });
  } catch (error) {
    console.error('[song-status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
