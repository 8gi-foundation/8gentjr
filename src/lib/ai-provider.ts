/**
 * 8gent Jr - local/self-hosted AI provider abstraction.
 *
 * Server routes may use Ollama when an explicit OLLAMA_HOST is available.
 * There is no hosted cloud LLM fallback in this app.
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

export interface AIProvider {
  chat: ChatFn;
  source: 'ollama';
  model: string;
}

export function createAIProvider(ollamaModel = 'llama3.2:3b'): AIProvider | null {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

  if (!ollamaHost || ollamaHost === 'disabled') return null;

  return {
    chat: ollamaProvider(ollamaHost, ollamaModel),
    source: 'ollama',
    model: ollamaModel,
  };
}

export async function createAIProviderWithFallback(
  ollamaModel = 'llama3.2:3b'
): Promise<AIProvider | null> {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  if (!ollamaHost || ollamaHost === 'disabled') return null;

  try {
    const probe = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) return null;
  } catch {
    return null;
  }

  return {
    chat: ollamaProvider(ollamaHost, ollamaModel),
    source: 'ollama',
    model: ollamaModel,
  };
}
