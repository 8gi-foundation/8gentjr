import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-song
 *
 * Music generation for 8gent Jr.
 * Dual-provider: Suno (polling) -> ElevenLabs (direct audio) fallback.
 *
 * Body: { sentences: string[], style?: string, tempo?: string }
 * Returns: { taskId, title, lyrics } (Suno) or { audioUrl, title, lyrics } (ElevenLabs)
 *
 * Issue: #10
 */

export const maxDuration = 60;

const SONG_PROMPT_SYSTEM = `You are a children's songwriter. Given a list of sentences and words that a child has been communicating through their AAC device, create a fun, simple song.

Rules:
1. Use the child's OWN words and themes as much as possible
2. Keep lyrics simple, repetitive, and age-appropriate (ages 4-10)
3. Make it fun and uplifting
4. Use common children's song structures (verse, chorus, verse, chorus)
5. Each line should be short (5-8 words max)
6. Include [Verse] and [Chorus] tags
7. The song should be 1-2 minutes when sung

Respond with JSON only:
{
  "title": "Song Title (2-4 words, fun and catchy)",
  "style": "children's pop, happy, playful, simple melody, acoustic guitar",
  "lyrics": "[Verse]\\nLine 1\\nLine 2\\n\\n[Chorus]\\nLine 1\\nLine 2\\n\\n[Verse]\\nLine 1\\nLine 2\\n\\n[Chorus]\\nLine 1\\nLine 2"
}`;

interface GenerateSongRequest {
  sentences: string[];
  style?: string;
  tempo?: string;
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSongRequest = await request.json();

    if (!body.sentences || body.sentences.length === 0) {
      return jsonResponse({ error: 'No prompt provided' }, 400);
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
      return jsonResponse({ error: 'Music creation not configured' }, 500);
    }

    // ── Step 1: LLM generates song structure from prompt ──────────
    const styleHint = body.style ? `\n\nThe song should feel: ${body.style}.` : '';
    const tempoHint = body.tempo ? ` Tempo: ${body.tempo}.` : '';
    const userMessage = `Here are things the child has been saying:\n\n${body.sentences.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n\nCreate a fun children's song using these themes and words.${styleHint}${tempoHint}`;

    let songData: { title: string; style: string; lyrics: string } | null = null;

    // Try Groq first (fast + free)
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1024,
            messages: [
              { role: 'system', content: SONG_PROMPT_SYSTEM },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) songData = parseSongData(content);
        }
      } catch (err) {
        console.error('[generate-song] Groq error:', err);
      }
    }

    // Fallback to OpenAI
    if (!songData && openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 1024,
            messages: [
              { role: 'system', content: SONG_PROMPT_SYSTEM },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) songData = parseSongData(content);
        }
      } catch (err) {
        console.error('[generate-song] OpenAI error:', err);
      }
    }

    if (!songData) {
      return jsonResponse({ error: 'Could not generate song lyrics' }, 500);
    }

    // ── Step 2: Try Suno (polling-based) ──────────────────────────
    const sunoKey = process.env.SUNO_API_KEY;
    if (sunoKey) {
      try {
        const sunoRes = await fetch('https://api.sunoapi.org/api/v1/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sunoKey}`,
          },
          body: JSON.stringify({
            customMode: true,
            instrumental: false,
            title: songData.title,
            style: body.style || songData.style,
            prompt: songData.lyrics,
            model: 'V4_5',
          }),
        });

        if (sunoRes.ok) {
          const sunoData = await sunoRes.json();
          if (sunoData.code === 200 && sunoData.data?.taskId) {
            return jsonResponse({
              taskId: sunoData.data.taskId,
              title: songData.title,
              style: songData.style,
              lyrics: songData.lyrics,
            });
          }
        }
        console.error('[generate-song] Suno failed, trying fallback');
      } catch (err) {
        console.error('[generate-song] Suno error:', err);
      }
    }

    // ── Step 3: Fallback to ElevenLabs (direct audio) ─────────────
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      try {
        const musicPrompt = `A children's song called "${songData.title}".
Style: ${body.style || songData.style}${body.tempo ? `, ${body.tempo}` : ''}.
For kids ages 4-10, fun and singable.

${songData.lyrics}`;

        const elRes = await fetch('https://api.elevenlabs.io/v1/music', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey,
          },
          body: JSON.stringify({
            prompt: musicPrompt,
            music_length_ms: 60000,
            model_id: 'music_v1',
          }),
        });

        if (elRes.ok) {
          const audioBuffer = await elRes.arrayBuffer();
          const base64 = Buffer.from(audioBuffer).toString('base64');
          const dataUrl = `data:audio/mpeg;base64,${base64}`;

          return jsonResponse({
            audioUrl: dataUrl,
            title: songData.title,
            lyrics: songData.lyrics,
            duration: 60,
          });
        }

        console.error('[generate-song] ElevenLabs failed:', elRes.status);
      } catch (err) {
        console.error('[generate-song] ElevenLabs error:', err);
      }
    }

    // Both providers failed
    return jsonResponse({ error: 'Music generation unavailable' }, 500);
  } catch (error) {
    console.error('[generate-song] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function parseSongData(content: string): { title: string; style: string; lyrics: string } | null {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed.title && parsed.style && parsed.lyrics) {
      return { title: parsed.title, style: parsed.style, lyrics: parsed.lyrics };
    }
    return null;
  } catch {
    return null;
  }
}
