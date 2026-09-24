import type { AiTokenUsage } from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';
import { resolveBearerHeaders, subscribeSseText, SseEventParser, type SseEvent } from './http';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

/** Helpers passed to `onEvent` for turning server events into chat updates. */
export interface SseTransportEventContext {
  /** Append answer text. */
  text: (delta: string) => void;
  /** Append reasoning / thinking text. */
  reasoning: (delta: string) => void;
  toolStart: (tool: { id: string; name: string; label?: string }) => void;
  toolComplete: (tool: { id: string; name?: string; frontendData?: unknown }) => void;
  toolError: (tool: { id: string; name?: string; error: string }) => void;
  suggestions: (suggestions: AiSuggestion[]) => void;
  setConversationId: (id: string) => void;
  setMessageId: (id: string) => void;
  setUsage: (usage: AiTokenUsage) => void;
  /** Fail the reply; the error is thrown once the response ends. */
  fail: (message: string) => void;
  /** The request being answered. */
  params: AiTransportStreamParams;
}

export interface SseTransportOptions {
  url: string | ((params: AiTransportStreamParams) => string);
  /** Default `POST`. */
  method?: 'POST' | 'GET';
  /** Static / dynamic headers (auth, API version…). */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** Bearer token provider, sent as `Authorization: Bearer …`. */
  apiKey?: () => Promise<string | null> | string | null;
  /**
   * JSON request body. Default:
   * `{ messages: [{ role, content }], message, conversationId, context }`.
   */
  body?: (params: AiTransportStreamParams) => unknown;
  /** Handle one server-sent event. */
  onEvent: (event: SseEvent, ctx: SseTransportEventContext) => void;
  /** Request timeout in ms. Default 300000. */
  timeoutMs?: number;
  onUnauthorized?: () => void;
}

function defaultBody(params: AiTransportStreamParams) {
  return {
    messages: params.messages.map(message => ({ role: message.role, content: message.content })),
    message: params.userMessage,
    conversationId: params.conversationId ?? undefined,
    context: params.context,
  };
}

/**
 * Transport for any backend that streams Server-Sent Events. You map events
 * to chat updates in `onEvent`; networking, SSE parsing, cancellation and
 * error handling are done for you.
 *
 * @example
 * createSseTransport({
 *   url: 'https://api.example.com/chat',
 *   onEvent: ({ event, data }, ctx) => {
 *     if (data === '[DONE]') return;
 *     const json = JSON.parse(data);
 *     if (event === 'token') ctx.text(json.text);
 *     if (event === 'session') ctx.setConversationId(json.id);
 *   },
 * });
 */
export function createSseTransport(options: SseTransportOptions): AiTransport {
  return {
    async streamChat(params): Promise<AiTransportStreamResult> {
      const { handlers } = params;
      const headers = await resolveBearerHeaders({
        apiKey: options.apiKey,
        getHeaders: options.getHeaders,
      });
      headers.Accept = 'text/event-stream';
      const method = options.method ?? 'POST';
      if (method === 'POST') headers['Content-Type'] = 'application/json';

      const parser = new SseEventParser();
      const toolNames = new Map<string, string>();
      let text = '';
      let reasoning = '';
      let conversationId = params.conversationId ?? undefined;
      let messageId: string | undefined;
      let usage: AiTokenUsage | undefined;
      let failure: string | undefined;

      const ctx: SseTransportEventContext = {
        text: delta => {
          if (!delta) return;
          text += delta;
          handlers.onTextDelta?.(delta, text);
        },
        reasoning: delta => {
          if (!delta) return;
          reasoning += delta;
          handlers.onReasoningDelta?.(delta, reasoning);
        },
        toolStart: tool => {
          if (toolNames.has(tool.id)) return;
          toolNames.set(tool.id, tool.name);
          handlers.onToolStart?.(tool);
        },
        toolComplete: tool => {
          const name = tool.name ?? toolNames.get(tool.id) ?? 'tool';
          handlers.onToolComplete?.({ id: tool.id, name, frontendData: tool.frontendData });
        },
        toolError: tool => {
          const name = tool.name ?? toolNames.get(tool.id) ?? 'tool';
          handlers.onToolError?.({ id: tool.id, name, error: tool.error });
        },
        suggestions: suggestions => handlers.onSuggestions?.(suggestions),
        setConversationId: id => {
          conversationId = id;
        },
        setMessageId: id => {
          messageId = id;
        },
        setUsage: value => {
          usage = value;
        },
        fail: message => {
          failure = failure ?? message;
        },
        params,
      };

      const dispatch = (events: SseEvent[]) => {
        for (const event of events) options.onEvent(event, ctx);
      };

      await subscribeSseText({
        url: typeof options.url === 'function' ? options.url(params) : options.url,
        method,
        headers,
        body: method === 'POST' ? JSON.stringify((options.body ?? defaultBody)(params)) : undefined,
        signal: params.signal,
        timeoutMs: options.timeoutMs,
        onUnauthorized: options.onUnauthorized,
        onChunk: chunk => dispatch(parser.feed(chunk)),
      });
      dispatch(parser.flush());

      if (failure) throw new Error(failure);

      handlers.onDone?.({ text, messageId, conversationId });
      return { text, messageId, conversationId, usage };
    },
  };
}
