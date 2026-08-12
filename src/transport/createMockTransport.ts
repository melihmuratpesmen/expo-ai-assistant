import type { AiChatMessage, AiConversationSummary } from '../types/aiChat';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

export interface MockTransportOptions {
  /** Delay between streamed tokens (ms). */
  tokenDelayMs?: number;
  /** Custom reply builder. */
  reply?: (userMessage: string, history: AiChatMessage[]) => string;
}

/**
 * Offline / demo transport — no network. Useful for example apps and tests.
 */
export function createMockTransport(options: MockTransportOptions = {}): AiTransport {
  const tokenDelayMs = options.tokenDelayMs ?? 18;
  const sessions = new Map<string, AiChatMessage[]>();

  const replyFor =
    options.reply ??
    ((userMessage: string) =>
      `You said: “${userMessage}”. This is a mock reply from expo-ai-assistant.`);

  return {
    async streamChat(params: AiTransportStreamParams): Promise<AiTransportStreamResult> {
      const conversationId = params.conversationId ?? `mock-${Date.now()}`;
      const messageId = `msg-${Date.now()}`;
      const full = replyFor(params.userMessage, params.messages);
      let snapshot = '';
      let reasoning = '';

      const thinking = 'Considering your question…';
      for (const char of thinking) {
        if (params.signal?.aborted) {
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        reasoning += char;
        params.handlers.onReasoningDelta?.(char, reasoning);
        if (tokenDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.max(4, tokenDelayMs / 2)));
        }
      }

      for (const char of full) {
        if (params.signal?.aborted) {
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        snapshot += char;
        params.handlers.onTextDelta?.(char, snapshot);
        if (tokenDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, tokenDelayMs));
        }
      }

      const history = sessions.get(conversationId) ?? [...params.messages];
      history.push(
        {
          id: `user-${messageId}`,
          role: 'user',
          content: params.userMessage,
          createdAt: Date.now(),
          status: 'sent',
        },
        {
          id: messageId,
          role: 'assistant',
          content: snapshot,
          createdAt: Date.now(),
          status: 'sent',
        }
      );
      sessions.set(conversationId, history);

      params.handlers.onDone?.({ text: snapshot, messageId, conversationId });
      return { text: snapshot, messageId, conversationId };
    },

    async listSessions(): Promise<AiConversationSummary[]> {
      return Array.from(sessions.entries()).map(([id, messages]) => {
        const last = messages[messages.length - 1];
        return {
          id,
          title: messages.find(m => m.role === 'user')?.content.slice(0, 40) || 'Chat',
          lastMessagePreview: last?.content.slice(0, 80),
          updatedAt: last?.createdAt ?? Date.now(),
          messageCount: messages.length,
        };
      });
    },

    async getHistory(sessionId) {
      return {
        sessionId,
        messages: sessions.get(sessionId) ?? [],
      };
    },

    async deleteSession(sessionId) {
      sessions.delete(sessionId);
    },
  };
}
