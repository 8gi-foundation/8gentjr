import { NextRequest } from 'next/server';
import { improveSentence } from '@/lib/sentence-engine';

type Mode = 'improve' | 'blend';

interface RequestBody {
  cards?: string[];
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
    return jsonError(mode === 'blend' ? 'words array required' : 'Cards array required', 400);
  }

  const cleanWords = words.map((word) => String(word).trim()).filter(Boolean);
  const rawSentence = cleanWords.join(' ');

  if (mode === 'blend') {
    return jsonOk({
      original: rawSentence,
      blended: rawSentence,
      explanation: 'Local blend preserved the selected AAC phrases as-is',
      local: true,
    });
  }

  return jsonOk({
    original: rawSentence,
    improved: improveSentence(cleanWords),
    explanation: 'Local grammar cleanup',
    missing: [],
    local: true,
  });
}

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
