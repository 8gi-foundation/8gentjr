import { NextRequest } from 'next/server';
import { createAIProviderWithFallback } from '@/lib/ai-provider';
import { IMPROVE_PROMPT, BLEND_PROMPT } from '@/lib/glp-prompts';

/**
 * 8gent Jr - Sentence Improvement / Blend API
 *
 * Two modes:
 * - 'improve' (default, stage 3+): grammar clean-up of word-by-word AAC input.
 *   Returns JSON with { improved, explanation, missing }.
 * - 'blend' (stage 2 mix-and-match): fuses 2+ whole gestalts into a single
 *   coherent gestalt without inventing new words. Returns JSON with
 *   { blended, original }. Falls back to plain concatenation on any error.
 *
 * Same provider chain (local Ollama with Groq fallback). Same auth.
 *
 * Issues: #53 (improve), #142 (blend)
 */

type Mode = 'improve' | 'blend';

interface RequestBody {
  // Legacy improve payload kept for back-compat with existing callers.
  cards?: string[];
  // Preferred shape going forward; both modes accept either field.
  words?: string[];
  mode?: Mode;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const mode: Mode = body.mode === 'blend' ? 'blend' : 'improve';
  const words = body.words ?? body.cards ?? [];

  if (!Array.isArray(words) || words.length === 0) {
    return jsonError(
      mode === 'blend' ? 'words array required' : 'Cards array required',
      400
    );
  }

  const rawSentence = words.join(' ');

  try {
    const provider = await createAIProviderWithFallback('llama-3.1-8b-instant');

    if (!provider) {
      return mode === 'blend'
        ? blendFallback(words, rawSentence, 'AI unavailable - joined as-is')
        : improveFallback(rawSentence, 'AI unavailable - sentence returned as-is');
    }

    if (mode === 'blend') {
      const content = await provider.chat(
        [
          { role: 'system', content: BLEND_PROMPT },
          {
            role: 'user',
            content: `Fuse these gestalts into one: ${JSON.stringify(words)}`,
          },
        ],
        { max_tokens: 128 }
      );
      const blended = sanitizeBlend(content) || rawSentence;
      return jsonOk({ original: rawSentence, blended });
    }

    const content = await provider.chat(
      [
        { role: 'system', content: IMPROVE_PROMPT },
        { role: 'user', content: `Improve this AAC sentence: "${rawSentence}"` },
      ],
      { max_tokens: 512 }
    );

    if (content) return parseAndRespond(content, rawSentence);
    return jsonError('No response from AI', 500);
  } catch (error) {
    console.error('[8gent Jr improve-sentence] Error:', error);
    if (mode === 'blend') {
      return blendFallback(words, rawSentence, 'Blend failed - joined as-is');
    }
    return jsonError('Internal server error', 500);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function jsonOk(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function blendFallback(words: string[], rawSentence: string, explanation: string): Response {
  return jsonOk({
    original: rawSentence,
    blended: words.join(' '),
    explanation,
  });
}

function improveFallback(rawSentence: string, explanation: string): Response {
  return jsonOk({
    original: rawSentence,
    improved: rawSentence,
    explanation,
    missing: [],
  });
}

/**
 * The blend prompt asks for plain text, but small models sometimes wrap
 * the output in quotes, code fences, or trailing commentary. Strip those
 * back to a single-line plain string before returning.
 */
function sanitizeBlend(content: string | null | undefined): string {
  if (!content) return '';
  let s = content.trim();
  // Strip code fences if present
  const fenceMatch = s.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Take first non-empty line
  const firstLine = s.split('\n').map(l => l.trim()).find(Boolean) ?? '';
  // Strip surrounding quotes
  return firstLine.replace(/^["'`]+|["'`]+$/g, '').trim();
}

function parseAndRespond(content: string, rawSentence: string): Response {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    const result = JSON.parse(jsonStr);
    return jsonOk({
      original: rawSentence,
      improved: result.improved,
      explanation: result.explanation,
      missing: result.missing || [],
    });
  } catch {
    return jsonOk({
      original: rawSentence,
      improved: content.trim(),
      explanation: 'Grammar improved',
      missing: [],
    });
  }
}
