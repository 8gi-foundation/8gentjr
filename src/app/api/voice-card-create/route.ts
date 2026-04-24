import { NextRequest } from 'next/server';
import { createAIProviderWithFallback } from '@/lib/ai-provider';

/**
 * POST /api/voice-card-create
 *
 * Takes a parent's spoken request and returns a ready-to-render AAC card.
 *
 * Flow:
 *   1. Ollama (local) or Groq (llama-3.3-70b) extracts: label, ARASAAC search term, Fitzgerald category
 *   2. ARASAAC public API finds the best matching pictogram
 *   3. Returns structured card data — client animates the card into view
 *
 * Stack: Ollama (local, free) → Groq / llama-3.3-70b-versatile (cloud fallback) + ARASAAC public API (no key needed)
 */

const SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) vocabulary specialist.

A parent has spoken a request to create a custom symbol card for their child's communication board.

Your job: extract the core concept and classify it for the board.

Return ONLY a JSON object — no markdown, no explanation:
{
  "label": "swimming",
  "searchTerm": "swim",
  "category": "verb",
  "rationale": "swimming is an action/activity"
}

Rules:
- label: 1-3 words, child-friendly, title case for nouns, lowercase for verbs/adjectives
- searchTerm: single simple English word for pictogram search (the most concrete noun or verb)
- category: MUST be one of exactly: pronoun | verb | noun | adjective | preposition | question | negation | social
  - verb: actions, activities (eat, swim, play, run, help)
  - noun: people, places, objects, animals (dog, toilet, park, doctor)
  - adjective: feelings, descriptions (happy, hot, tired, big)
  - pronoun: people words (I, you, we) — only if explicitly requested
  - social: greetings, manners (hello, please, sorry)
  - negation: stop, no, don't — only if explicitly requested
  - question: what, where, why — only if explicitly requested
  - preposition: in, on, under — only if explicitly requested
- rationale: one brief sentence explaining the category choice`;

interface CardRequest {
  speech: string;
}

interface ArasaacResult {
  _id: number;
  [key: string]: unknown;
}

async function findArasaacPictogram(searchTerm: string): Promise<{ id: number; imageUrl: string } | null> {
  try {
    const res = await fetch(
      `https://api.arasaac.org/v1/pictograms/en/search/${encodeURIComponent(searchTerm)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const results: ArasaacResult[] = await res.json();
    if (!results || results.length === 0) return null;
    const id = results[0]._id;
    return {
      id,
      imageUrl: `https://static.arasaac.org/pictograms/${id}/${id}_500.png`,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CardRequest = await request.json();
    const { speech } = body;

    if (!speech?.trim()) {
      return new Response(JSON.stringify({ error: 'speech required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = await createAIProviderWithFallback('llama-3.3-70b-versatile');

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'AI unavailable — no local or cloud provider configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const raw = await provider.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: speech.trim() },
      ],
      { max_tokens: 200, temperature: 0.1 }
    );

    // Parse JSON from response — model is instructed to return only JSON
    let parsed: { label: string; searchTerm: string; category: string; rationale?: string };
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: use the speech as the label
      const fallbackLabel = speech.trim().slice(0, 30);
      parsed = { label: fallbackLabel, searchTerm: fallbackLabel.split(' ')[0], category: 'noun' };
    }

    // Validate category
    const validCategories = ['pronoun', 'verb', 'noun', 'adjective', 'preposition', 'question', 'negation', 'social'];
    const category = validCategories.includes(parsed.category) ? parsed.category : 'noun';

    // Find ARASAAC pictogram — try searchTerm first, fall back to first word of label
    let pictogram = await findArasaacPictogram(parsed.searchTerm);
    if (!pictogram) {
      pictogram = await findArasaacPictogram(parsed.label.split(' ')[0]);
    }

    return new Response(
      JSON.stringify({
        label: parsed.label,
        category,
        arasaacId: pictogram?.id ?? null,
        imageUrl: pictogram?.imageUrl ?? null,
        rationale: parsed.rationale ?? null,
        transcript: speech.trim(),
        aiGenerated: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[VoiceCardCreate] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create card' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
