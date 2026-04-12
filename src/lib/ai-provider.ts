/**
 * 8gent Jr — AI Provider Abstraction
 *
 * Priority: Ollama (local, free) → Groq (cloud, free tier) → null (graceful degradation)
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

/**
 * Returns the best available AI provider, or null if none configured.
 *
 * @param groqModel  Groq model to use when falling back to cloud (default: llama-3.3-70b-versatile)
 * @param ollamaModel  Ollama model to use locally (default: llama3.2:3b)
 */
export function createAIProvider(
  groqModel = 'llama-3.3-70b-versatile',
  ollamaModel = 'llama3.2:3b'
): AIProvider | null {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const groqKey = process.env.GROQ_API_KEY;

  // Ollama wins when OLLAMA_HOST is set (or default localhost is acceptable to try).
  // We always prefer local — callers can set OLLAMA_HOST=disabled to skip.
  if (ollamaHost && ollamaHost !== 'disabled') {
    return {
      chat: ollamaProvider(ollamaHost, ollamaModel),
      source: 'ollama',
      model: ollamaModel,
    };
  }

  if (groqKey) {
    return {
      chat: groqProvider(groqKey, groqModel),
      source: 'groq',
      model: groqModel,
    };
  }

  return null;
}

/**
 * Tries Ollama first; if the request fails (e.g. Ollama not running), falls back to Groq.
 * This is the recommended function for server routes — handles the fallback automatically.
 */
export async function createAIProviderWithFallback(
  groqModel = 'llama-3.3-70b-versatile',
  ollamaModel = 'llama3.2:3b'
): Promise<AIProvider | null> {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const groqKey = process.env.GROQ_API_KEY;

  if (ollamaHost && ollamaHost !== 'disabled') {
    // Probe Ollama with a lightweight tags request
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
      // Ollama not reachable — fall through to Groq
    }
  }

  if (groqKey) {
    return {
      chat: groqProvider(groqKey, groqModel),
      source: 'groq',
      model: groqModel,
    };
  }

  return null;
}
