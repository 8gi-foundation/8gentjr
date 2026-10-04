import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-song
 *
 * Music generation for 8gent Jr.
 * Local lyric shaping, with optional Suno polling for audio generation.
 *
 * Body: { sentences: string[], style?: string, tempo?: string }
 * Returns: { taskId, title, lyrics } when audio generation is configured.
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

    const openaiKey = process.env.OPENAI_API_KEY;

    // ── Step 1: Create song structure from prompt ──────────
    const styleHint = body.style ? `\n\nThe song should feel: ${body.style}.` : '';
    const tempoHint = body.tempo ? ` Tempo: ${body.tempo}.` : '';
    const userMessage = `Here are things the child has been saying:\n\n${body.sentences.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n\nCreate a fun children's song using these themes and words.${styleHint}${tempoHint}`;

    let songData: { title: string; style: string; lyrics: string } | null =
      buildLocalSongData(body.sentences, body.style, body.tempo);

    // Optional: self-owned configured lyric enhancer. Local template remains
    // the fallback, so this route no longer depends on a hosted LLM to work.
    if (openaiKey) {
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
          if (content) songData = parseSongData(content) ?? songData;
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

    return jsonResponse(
      {
        error: 'Music audio generation unavailable',
        title: songData.title,
        lyrics: songData.lyrics,
      },
      503
    );
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

function buildLocalSongData(
  sentences: string[],
  style?: string,
  tempo?: string
): { title: string; style: string; lyrics: string } {
  const clean = sentences.map((s) => s.trim()).filter(Boolean);
  const first = clean[0] || 'my words';
  const titleWord = first.split(/\s+/).slice(0, 3).join(' ');
  const title = `${capitalize(titleWord)} Song`;
  const styleText = style || `children's pop, happy, playful, simple melody${tempo ? `, ${tempo}` : ''}`;
  const lines = clean.length > 0 ? clean.slice(0, 4) : ['I have something to say'];
  const chorus = lines.slice(0, 2);

  return {
    title,
    style: styleText,
    lyrics: [
      '[Verse]',
      ...lines.map((line) => shortenLine(line)),
      '',
      '[Chorus]',
      ...(chorus.length > 0 ? chorus : ['Listen to my words']).map((line) => `${shortenLine(line)} again`),
      '',
      '[Verse]',
      ...lines.map((line) => `I say ${shortenLine(line)}`),
      '',
      '[Chorus]',
      ...(chorus.length > 0 ? chorus : ['Listen to my words']).map((line) => `${shortenLine(line)} again`),
    ].join('\n'),
  };
}

function shortenLine(line: string): string {
  return line.split(/\s+/).slice(0, 8).join(' ');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
