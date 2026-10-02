import { NextRequest, NextResponse } from 'next/server';
import { getAllWords, suggestNextWord } from '@/lib/sentence-engine';

interface AutocompleteRequest {
  input: string;
  existingWords?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AutocompleteRequest = await request.json();
    const input = body.input?.trim() ?? '';

    if (!input) {
      return NextResponse.json({ suggestions: [] });
    }

    const candidates = uniqueWords([
      ...(body.existingWords ?? []),
      ...getAllWords(),
      ...suggestNextWord([input]),
    ]);

    const lower = input.toLowerCase();
    const startsWith = candidates.filter((word) => word.toLowerCase().startsWith(lower));
    const includes = candidates.filter(
      (word) => !word.toLowerCase().startsWith(lower) && word.toLowerCase().includes(lower)
    );
    const next = suggestNextWord([input]).filter(
      (word) => !startsWith.includes(word) && !includes.includes(word)
    );

    return NextResponse.json({
      suggestions: uniqueWords([...startsWith, ...includes, ...next]).slice(0, 6),
      local: true,
    });
  } catch (error) {
    console.error('[8gent Jr Autocomplete] Error:', error);
    return NextResponse.json({ suggestions: [], local: true }, { status: 200 });
  }
}

function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const word of words) {
    const clean = word.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}
