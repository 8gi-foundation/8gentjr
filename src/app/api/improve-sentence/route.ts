import { NextRequest } from 'next/server';
import { createAIProviderWithFallback } from '@/lib/ai-provider';

/**
 * 8gent Jr — Sentence Improvement API (Magic Button)
 *
 * Takes raw AAC card words and returns a grammatically improved sentence.
 * Uses local Ollama (free) with Groq (free tier) as cloud fallback.
 * Ported from NickOS improve-sentence endpoint.
 *
 * Issue: #53
 */

const SYSTEM_PROMPT = `You are an AAC sentence improver for children. Your job is to take words from communication cards and form natural sentences.

Rules:
1. Keep the meaning EXACTLY the same
2. Add only necessary grammar (articles, prepositions, conjugations)
3. Keep sentences simple and age-appropriate
4. Output should sound natural when spoken aloud
5. Do NOT add new concepts or change the intent

Also detect if the sentence is missing important vocabulary. Return suggestions for cards that would help.

Example:
Input: "I want apple juice"
Output: "I would like some apple juice, please"
Missing: None

Example:
Input: "go park"
Output: "I want to go to the park"
Missing: ["I", "want"] - core vocabulary for expressing desires

Respond with JSON:
{
  "improved": "the improved sentence",
  "explanation": "brief explanation of changes",
  "missing": [
    {
      "word": "missing word",
      "category": "core|actions|feelings|etc",
      "reason": "why this would help"
    }
  ]
}`;

interface ImproveRequest {
  cards: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ImproveRequest = await request.json();

    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0) {
      return new Response(JSON.stringify({ error: 'Cards array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = await createAIProviderWithFallback('llama-3.1-8b-instant');

    const rawSentence = body.cards.join(' ');

    if (!provider) {
      // Graceful degradation: return the raw sentence unchanged
      return new Response(
        JSON.stringify({
          original: rawSentence,
          improved: rawSentence,
          explanation: 'AI unavailable — sentence returned as-is',
          missing: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const content = await provider.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Improve this AAC sentence: "${rawSentence}"` },
      ],
      { max_tokens: 512 }
    );

    if (content) {
      return parseAndRespond(content, rawSentence);
    }

    return new Response(JSON.stringify({ error: 'No response from AI' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[8gent Jr Improve] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function parseAndRespond(content: string, rawSentence: string): Response {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    const result = JSON.parse(jsonStr);
    return new Response(
      JSON.stringify({
        original: rawSentence,
        improved: result.improved,
        explanation: result.explanation,
        missing: result.missing || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({
        original: rawSentence,
        improved: content.trim(),
        explanation: 'Grammar improved',
        missing: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
