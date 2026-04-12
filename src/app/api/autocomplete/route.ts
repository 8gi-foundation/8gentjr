import { NextRequest, NextResponse } from 'next/server';
import { createAIProviderWithFallback } from '@/lib/ai-provider';

/**
 * 8gent Jr — Autocomplete API
 *
 * Uses local Ollama (free) with Groq (free tier) as cloud fallback for AI-powered word suggestions.
 * Ported from NickOS autocomplete endpoint, adapted for 8gent Jr AAC.
 *
 * Issue: #53
 */

interface AutocompleteRequest {
  input: string;
  existingWords: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AutocompleteRequest = await request.json();
    const { input, existingWords = [] } = body;

    if (!input || input.trim().length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const provider = await createAIProviderWithFallback('llama-3.1-8b-instant');

    if (!provider) {
      return NextResponse.json({ suggestions: [], offline: true });
    }

    const prompt = `You are an AAC (Augmentative and Alternative Communication) word suggestion assistant for a 7-year-old child.

The child has started typing: "${input}"

Existing vocabulary cards available: ${existingWords.slice(0, 50).join(', ')}

Suggest 5 words that:
1. Complete or relate to what they started typing
2. Are age-appropriate for a 7-year-old
3. Are commonly used in daily communication
4. Mix between words they already have (from the list) and new useful words

Return ONLY a JSON array of 5 words, no explanation. Example: ["hello", "help", "happy", "home", "hungry"]`;

    const text = await provider.chat([{ role: 'user', content: prompt }], { max_tokens: 128 });

    // Parse the response — expecting a JSON array
    let suggestions: string[] = [];
    try {
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      suggestions = JSON.parse(cleanedText);

      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
      suggestions = suggestions
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 6);
    } catch {
      // If parsing fails, try to extract words from the text
      const wordMatch = text.match(/["']([^"']+)["']/g);
      if (wordMatch) {
        suggestions = wordMatch
          .map((w) => w.replace(/["']/g, ''))
          .slice(0, 6);
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[8gent Jr Autocomplete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', suggestions: [] },
      { status: 500 }
    );
  }
}
