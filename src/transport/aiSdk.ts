import type { AiSuggestion } from '../types/aiContext';
import { createSseTransport } from './sse';
import type { AiTransport, AiTransportStreamParams } from './types';

export interface AiSdkTransportOptions {
  /**
   * Your AI SDK chat route, e.g. `https://example.com/api/chat` returning
   * `result.toUIMessageStreamResponse()`.
   */
  api: string;
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** Extra JSON body fields sent with every request. */
  body?:
    | Record<string, unknown>
    | ((params: AiTransportStreamParams) => Record<string, unknown> | undefined);
  /** Tool card titles by tool name. */
  toolLabels?: Record<string, string>;
  /** Request timeout in ms. Default 300000. */
  timeoutMs?: number;
  onUnauthorized?: () => void;
}

interface UiMessageChunk {
  type?: string;
  messageId?: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  output?: unknown;
  errorText?: string;
  data?: unknown;
}

let chatCounter = 0;
function newChatId() {
  chatCounter += 1;
  return `chat-${Date.now()}-${chatCounter}`;
}

function toUiMessage(role: 'user' | 'assistant', id: string, text: string) {
  return { id, role, parts: [{ type: 'text', text }] };
}

function isSuggestionList(value: unknown): value is AiSuggestion[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        !!item &&
        typeof (item as AiSuggestion).label === 'string' &&
        typeof (item as AiSuggestion).prompt === 'string'
    )
  );
}

/**
 * Transport for Vercel AI SDK chat routes (UI Message Stream protocol,
 * `x-vercel-ai-ui-message-stream: v1`).
 *
 * Sends `{ id, messages, trigger: 'submit-message' }` with `UIMessage`s and maps
 * text, reasoning and tool parts to the chat. A `data-suggestions` part whose
 * `data` is `[{ id, label, prompt }]` shows follow-up chips.
 */
export function createAiSdkTransport(options: AiSdkTransportOptions): AiTransport {
  // The chat id sent in the body becomes the conversation id for follow-up turns.
  const chatIds = new WeakMap<AiTransportStreamParams, string>();

  return createSseTransport({
    url: options.api,
    getHeaders: options.getHeaders,
    timeoutMs: options.timeoutMs,
    onUnauthorized: options.onUnauthorized,
    body: params => {
      const extra = typeof options.body === 'function' ? options.body(params) : options.body;
      const messages = [
        ...params.messages.map(message => toUiMessage(message.role, message.id, message.content)),
        toUiMessage('user', `user-${Date.now()}`, params.userMessage),
      ];
      const id = params.conversationId ?? newChatId();
      chatIds.set(params, id);
      return {
        ...extra,
        id,
        messages,
        trigger: 'submit-message',
        ...(params.context ? { context: params.context } : {}),
      };
    },
    onEvent: ({ data }, ctx) => {
      if (!data || data === '[DONE]') return;
      let chunk: UiMessageChunk;
      try {
        chunk = JSON.parse(data) as UiMessageChunk;
      } catch {
        return;
      }

      const chatId = chatIds.get(ctx.params);
      if (chatId) ctx.setConversationId(chatId);

      switch (chunk.type) {
        case 'start':
          if (chunk.messageId) ctx.setMessageId(chunk.messageId);
          break;
        case 'text-delta':
          ctx.text(chunk.delta ?? '');
          break;
        case 'reasoning-delta':
          ctx.reasoning(chunk.delta ?? '');
          break;
        case 'tool-input-start':
        case 'tool-input-available':
          if (chunk.toolCallId && chunk.toolName) {
            ctx.toolStart({
              id: chunk.toolCallId,
              name: chunk.toolName,
              label: options.toolLabels?.[chunk.toolName],
            });
          }
          break;
        case 'tool-output-available':
          if (chunk.toolCallId) {
            ctx.toolComplete({ id: chunk.toolCallId, frontendData: chunk.output });
          }
          break;
        case 'tool-output-error':
        case 'tool-input-error':
          if (chunk.toolCallId) {
            ctx.toolError({ id: chunk.toolCallId, error: chunk.errorText ?? 'Tool failed' });
          }
          break;
        case 'data-suggestions':
          if (isSuggestionList(chunk.data)) ctx.suggestions(chunk.data);
          break;
        case 'error':
          ctx.fail(chunk.errorText ?? 'The assistant failed to respond.');
          break;
        default:
          break;
      }
    },
  });
}
