import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

/**
 * 8gent Jr — Parent Chat API
 *
 * Evidence-informed AAC advisor for parents. Answers questions about
 * their child's communication, vocabulary, and AAC strategy using
 * specialist knowledge. Not generalised — grounded in AAC research.
 *
 * Stack: Groq / llama-3.3-70b-versatile (more capable than 8b for nuanced Q&A)
 */

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an expert AAC (Augmentative and Alternative Communication) specialist and speech-language pathologist advisor embedded in 8gent Jr, a communication app for children.

Your role is to help parents:
- Understand AAC strategies for their child's specific needs
- Choose and prioritise vocabulary for their child's board
- Understand how conditions like ADHD, autism, cerebral palsy, and developmental delays affect communication
- Implement evidence-based AAC strategies at home
- Interpret their child's communication behaviours

Your knowledge is grounded in:
- AAC research (Beukelman & Mirenda, Light & McNaughton, etc.)
- Core vocabulary research (Banajee, Dicarlo & Stricklin 2003; Cross et al. 2006)
- Gestalt Language Processing (GLP) theory
- Modified Fitzgerald Key colour coding system
- Psychiatric and neurodevelopmental research where relevant

Rules:
1. Be specific and evidence-informed — not generic wellness advice
2. When citing research, name the authors and approximate date
3. Be warm and practical — parents are often overwhelmed
4. If a question is outside AAC/communication scope, redirect kindly
5. Keep responses concise but complete — parents are busy
6. Use plain English, not clinical jargon (explain terms when needed)
7. When relevant, suggest specific vocabulary words or categories for the app

Format:
- Use short paragraphs, not bullet walls
- Bold key terms or recommendations
- End with a practical next step when appropriate`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: ChatRequest = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groq = new Groq({ apiKey: groqKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? '';

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
