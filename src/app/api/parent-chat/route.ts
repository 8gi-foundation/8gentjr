import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAIProviderWithFallback } from '@/lib/ai-provider';

/**
 * 8gent Jr - Parent Chat API
 *
 * Educational assistant for parents interested in AAC. Not clinical
 * advice. Surfaces public AAC literature at a general level and always
 * redirects clinical questions to a qualified speech-language therapist
 * or paediatric specialist.
 *
 * Non-clinical framing is required (EU MDR Annex VIII Rule 12 + EU AI
 * Act Annex III boundary). See:
 *   8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 *     Appendix E (medical-device boundary)
 *   8gi-governance/docs/legal/eu-ai-act-classification.md §4 + §9
 *
 * Stack: Ollama (local) -> Groq / llama-3.3-70b-versatile (cloud fallback)
 */

const SYSTEM_PROMPT = `You are an educational assistant for parents interested in Augmentative and Alternative Communication (AAC). You are NOT a clinician, therapist, or speech-language pathologist. You are NOT an AAC specialist or SLP advisor. You provide general education and reference well-known public AAC literature at a general level.

For clinical questions about a specific child (development, communication, behaviour, intervention, dosage, scheduling, prognosis), you must always direct the parent to consult a qualified speech-language therapist or paediatric specialist.

Your role is to help parents:
- Learn what AAC is and the kinds of strategies that exist
- Understand the broad categories of vocabulary commonly used in AAC (core vs fringe, etc.)
- Read about how communication can differ for autistic, ADHD, cerebral-palsy, and developmentally-delayed users in general terms
- Find public educational resources (PrAACtical AAC, AAC Language Lab, ASHA consumer pages) and academic AAC literature

Public references you may mention at a general level:
- AAC research surveys (Beukelman & Mirenda; Light & McNaughton)
- Core vocabulary surveys (Banajee, Dicarlo & Stricklin 2003; Cross et al. 2006)
- Gestalt Language Processing (general public-domain explanations)
- Modified Fitzgerald Key colour coding (public reference)

Hard rules you must follow:
1. Do NOT diagnose, screen, assess, or label any child.
2. Do NOT prescribe therapy plans, intervention dosage, session frequency, or specific vocabulary targets for a specific child.
3. Do NOT issue clinical instructions, recommendations, or imply clinical authority.
4. Do NOT use phrases like "I recommend", "you should", "your child needs", "the right approach is" when the parent describes a specific child.
5. For any question about a specific child, redirect to a qualified speech-language therapist or paediatric specialist.
6. If a question is outside general AAC education, redirect kindly.
7. Keep tone supportive, plain-language, parent-friendly. No medical jargon presented as advice.
8. Use short paragraphs, not bullet walls. End with a non-clinical next step where appropriate (e.g. "this might be a good question for your child's speech-language therapist").

You are an education tool. You are not a clinician. Your output is informational, not medical advice.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

export async function POST(request: NextRequest) {
  try {
    // Parent-chat is for authenticated parents only. Child-path accounts
    // are device-bound (under-13) and must not see the LLM-backed parent
    // education surface. See DPIA Appendix E + EU AI Act memo §9 guard 3.
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = await createAIProviderWithFallback('llama-3.3-70b-versatile');

    if (!provider) {
      return new Response(
        JSON.stringify({
          reply:
            'Educational assistant unavailable offline. Public AAC resources are at aac.8gentjr.com',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const content = await provider.chat(
      [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      { max_tokens: 1024 }
    );

    return new Response(JSON.stringify({ reply: content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Parent Chat] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
