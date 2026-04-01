import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tts
 *
 * ElevenLabs TTS proxy endpoint for 8gent Jr.
 * Keeps the API key server-side. Returns audio/mpeg stream.
 *
 * Body: { text: string, voiceId?: string, stability?: number, similarityBoost?: number }
 * Returns: audio/mpeg (or 204 if ElevenLabs not configured)
 *
 * Issue: #53
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_JR_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL'; // Sarah (child-friendly)

interface TTSRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function POST(request: NextRequest) {
  // No API key configured — client should fall back to browser TTS
  if (!ELEVENLABS_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body: TTSRequest = await request.json();
    const { text, voiceId, stability = 0.5, similarityBoost = 0.75 } = body;

    // Validate
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Text too long (max 1000 chars)' }, { status: 400 });
    }

    const voice = voiceId || DEFAULT_VOICE_ID;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: Math.max(0, Math.min(1, stability)),
          similarity_boost: Math.max(0, Math.min(1, similarityBoost)),
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error(`[TTS API] ElevenLabs ${res.status}: ${errText}`);
      // Return 204 so client falls back gracefully
      return new NextResponse(null, { status: 204 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
