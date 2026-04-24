/**
 * 8gent Jr — AI Provider Abstraction
 *
 * Priority: Ollama (local, free) → Groq (cloud, free tier) → null (graceful degradation)
 *
 * CHILD_LLM_ENABLED flag (default false in prod) gates the cloud Groq fallback
 * for any path that touches child-derived text. Without a signed DPA with
 * Groq, sending child-derived content to their API is not GDPR Art 28
 * compliant. See 8gi-governance/docs/legal/2026-04-24-8gentjr-eu-compliance-audit.md.
 *
 * No new dependencies. Ollama is reached via raw fetch.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  max_tokens?: number;
  temperature?: number;
}

export type ChatFn = (messages: ChatMessage[], options?: ChatOptions) => Promise<string>;

interface OllamaResponse {
  message: { content: string };
}

interface GroqResponse {
  choices: Array<{ message: { content: string | null } }>;
}

export function isChildAIEnabled(): boolean {
  return process.env.CHILD_LLM_ENABLED === 'true';
}

function ollamaProvider(host: string, model: string): ChatFn {
  return async (messages, options = {}) => {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(options.max_tokens !== undefined && { num_predict: options.max_tokens }),
        ...(options.temperature !== undefined && { options: { temperature: options.temperature } }),
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = (await res.json()) as OllamaResponse;
    return data.message.content;
  };
}

function groqProvider(apiKey: string, model: string): ChatFn {
  return async (messages, options = {}) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as GroqResponse;
    return data.choices?.[0]?.message?.content ?? '';
  };
}

export interface AIProvider {
  chat: ChatFn;
  source: 'ollama' | 'groq';
  model: string;
}

export function createAIProvider(
  groqModel = 'llama-3.3-70b-versatile',
  ollamaModel = 'llama3.2:3b'
): AIProvider | null {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const groqKey = process.env.GROQ_API_KEY;

  if (ollamaHost && ollamaHost !== 'disabled') {
    return {
      chat: ollamaProvider(ollamaHost, ollamaModel),
      source: 'ollama',
      model: ollamaModel,
    };
  }

  if (groqKey && isChildAIEnabled()) {
    return {
      chat: groqProvider(groqKey, groqModel),
      source: 'groq',
      model: groqModel,
    };
  }

  return null;
}

/**
 * Tries Ollama first; if the request fails (e.g. Ollama not running), falls
 * back to Groq only when CHILD_LLM_ENABLED=true. Default is off so the app
 * ships safe in EU/UK without a signed Groq DPA.
 */
export async function createAIProviderWithFallback(
  groqModel = 'llama-3.3-70b-versatile',
  ollamaModel = 'llama3.2:3b'
): Promise<AIProvider | null> {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const groqKey = process.env.GROQ_API_KEY;

  if (ollamaHost && ollamaHost !== 'disabled') {
    try {
      const probe = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (probe.ok) {
        return {
          chat: ollamaProvider(ollamaHost, ollamaModel),
          source: 'ollama',
          model: ollamaModel,
        };
      }
    } catch {
      // Ollama not reachable — fall through to Groq if permitted
    }
  }

  if (groqKey && isChildAIEnabled()) {
    return {
      chat: groqProvider(groqKey, groqModel),
      source: 'groq',
      model: groqModel,
    };
  }

  return null;
}
