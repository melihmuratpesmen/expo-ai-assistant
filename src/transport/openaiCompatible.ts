import type { AiChatMessage } from '../types/aiChat';
import { joinUrl, resolveBearerHeaders, subscribeSseText, SseDataParser, AiHttpError } from './http';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

export interface OpenAICompatibleTransportOptions {
  /**
   * API root including version segment, e.g.
   * `https://api.openai.com/v1` or any OpenAI-compatible gateway.
   */
  baseUrl?: string;
  /** API key provider. Prefer a function so the key is not baked into the bundle. */
  apiKey: () => Promise<string | null> | string | null;
  /** Chat model id (required for OpenAI-compatible backends). */
  model: string;
  /** Defaults to `/chat/completions`. */
  chatPath?: string;
  /** Extra static or dynamic headers. */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  temperature?: number;
  /** Called on HTTP 401. */
  onUnauthorized?: () => void;
  /** Map library messages → provider message payload (advanced). */
  mapMessages?: (
    messages: AiChatMessage[],
    userMessage: string
  ) => Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  /** Optional system prompt prepended to every request. */
  systemPrompt?: string;
}

function defaultMapMessages(
  messages: AiChatMessage[],
  userMessage: string,
  systemPrompt?: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const mapped: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (systemPrompt?.trim()) {
    mapped.push({ role: 'system', content: systemPrompt.trim() });
  }
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    mapped.push({
      role: message.role,
      content: message.content,
    });
  }
  mapped.push({ role: 'user', content: userMessage });
  return mapped;
}

/**
 * Default public transport: OpenAI Chat Completions streaming
 * (`POST /chat/completions` with `stream: true`).
 *
 * Works with OpenAI and compatible providers (Azure OpenAI-style gateways,
 * Groq, Together, Fireworks, local proxies, etc.) that speak the same protocol.
 */
export function createOpenAICompatibleTransport(
  options: OpenAICompatibleTransportOptions
): AiTransport {
  const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
  const chatPath = options.chatPath ?? '/chat/completions';

  return {
    async streamChat(params: AiTransportStreamParams): Promise<AiTransportStreamResult> {
      const headers = await resolveBearerHeaders({
        apiKey: options.apiKey,
        getHeaders: options.getHeaders,
      });
      headers['Content-Type'] = 'application/json';
      headers.Accept = 'text/event-stream';

      const payload = {
        model: options.model,
        stream: true,
        temperature: options.temperature,
        messages:
          options.mapMessages?.(params.messages, params.userMessage) ??
          defaultMapMessages(params.messages, params.userMessage, options.systemPrompt),
      };

      const parser = new SseDataParser();
      let snapshot = '';
      let conversationId = params.conversationId ?? undefined;
      let messageId: string | undefined;
      let streamError: string | undefined;

      await subscribeSseText({
        url: joinUrl(baseUrl, chatPath),
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: params.signal,
        onUnauthorized: options.onUnauthorized,
        onChunk: chunk => {
          for (const data of parser.feed(chunk)) {
            if (!data || data === '[DONE]') continue;

            let json: Record<string, unknown>;
            try {
              json = JSON.parse(data) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (typeof json.id === 'string' && !messageId) {
              messageId = json.id;
              conversationId = conversationId ?? json.id;
            }

            if (typeof json.error === 'object' && json.error !== null) {
              const errObj = json.error as { message?: string };
              streamError = errObj.message ?? 'Provider error';
              params.handlers.onError?.(streamError);
              continue;
            }

            const choices = Array.isArray(json.choices) ? json.choices : [];
            const first = choices[0] as
              | { delta?: { content?: string | null }; message?: { content?: string } }
              | undefined;
            const delta = first?.delta?.content ?? first?.message?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              snapshot += delta;
              params.handlers.onTextDelta?.(delta, snapshot);
            }
          }
        },
      }).catch(error => {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        if (error instanceof AiHttpError) {
          const message = error.message;
          params.handlers.onError?.(message);
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Stream failed';
        params.handlers.onError?.(message);
        throw error;
      });

      if (streamError) {
        throw new Error(streamError);
      }

      params.handlers.onDone?.({
        text: snapshot,
        messageId,
        conversationId,
      });

      return {
        text: snapshot,
        messageId,
        conversationId,
      };
    },
  };
}
