import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tts?text=hello&voice=<id>
 *
 * ElevenLabs TTS proxy for 8gent Jr.
 * GET allows Vercel CDN to cache responses — same text = served from edge, no ElevenLabs call.
 * Returns audio/mpeg with 1-year immutable cache header.
 *
 * Falls back to 204 if ElevenLabs not configured (client uses browser TTS).
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Charlie — Young, Natural, Conversational (child voice, ElevenLabs)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_JR_VOICE_ID ?? 'IKne3meq5aSn9XLyUdCD';

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')?.trim();
  const voiceId = request.nextUrl.searchParams.get('voice') || DEFAULT_VOICE_ID;

  if (!text) {
    return NextResponse.json({ error: 'text param required' }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: 'Text too long (max 1000 chars)' }, { status: 400 });
  }

  if (!ELEVENLABS_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error(`[TTS] ElevenLabs ${res.status}: ${errText}`);
      // 503 = configured but failed (client should NOT fall back to browser TTS)
      return new NextResponse(null, { status: 503 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        // Permanent CDN cache — same text+voice always returns identical audio
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    // 503 = configured but network/fetch failed (client should NOT fall back to browser TTS)
    return new NextResponse(null, { status: 503 });
  }
}

// Keep POST for backwards compat (redirects to GET logic)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;
    const url = new URL(request.url);
    url.searchParams.set('text', text || '');
    if (voiceId) url.searchParams.set('voice', voiceId);
    return GET(new NextRequest(url.toString(), { method: 'GET' }));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
