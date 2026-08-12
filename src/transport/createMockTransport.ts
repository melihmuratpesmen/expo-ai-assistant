import type { AiChatMessage, AiConversationSummary } from '../types/aiChat';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

export interface MockTransportOptions {
  /** Delay between streamed tokens (ms). */
  tokenDelayMs?: number;
  /** Custom reply builder (plain text path). */
  reply?: (userMessage: string, history: AiChatMessage[]) => string;
  /** Disable built-in tool / table demos. Default false (demos on). */
  disableToolDemos?: boolean;
}

const TABLE_TRIGGER = /\b(table|list|students?|rows?|data|tablo|liste|öğrenci)\b/i;
const SUMMARY_TRIGGER = /\b(summary|overview|stats?|özet)\b/i;

function sampleStudents() {
  return [
    { id: 1, name: 'Ada Lovelace', grade: '11-A', score: 96 },
    { id: 2, name: 'Alan Turing', grade: '12-B', score: 91 },
    { id: 3, name: 'Grace Hopper', grade: '10-C', score: 88 },
    { id: 4, name: 'Katherine Johnson', grade: '11-B', score: 94 },
  ];
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Offline / demo transport — no network. Useful for example apps and tests.
 * Emits tool cards + table/list `frontendData` for common demo prompts.
 */
export function createMockTransport(options: MockTransportOptions = {}): AiTransport {
  const tokenDelayMs = options.tokenDelayMs ?? 18;
  const sessions = new Map<string, AiChatMessage[]>();
  const toolDemos = options.disableToolDemos !== true;

  const replyFor =
    options.reply ??
    ((userMessage: string) =>
      `You said: “${userMessage}”. This is a mock reply from expo-ai-assistant.`);

  return {
    async streamChat(params: AiTransportStreamParams): Promise<AiTransportStreamResult> {
      const conversationId = params.conversationId ?? `mock-${Date.now()}`;
      const messageId = `msg-${Date.now()}`;
      const userMessage = params.userMessage;
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
          await sleep(Math.max(4, tokenDelayMs / 2), params.signal);
        }
      }

      if (toolDemos && TABLE_TRIGGER.test(userMessage)) {
        const toolId = `tool-list-${Date.now()}`;
        params.handlers.onToolStart?.({
          id: toolId,
          name: 'listStudents',
          label: 'List students',
          reasoning: 'Fetching a sample student roster…',
        });
        await sleep(450, params.signal);
        const rows = sampleStudents();
        params.handlers.onToolComplete?.({
          id: toolId,
          name: 'listStudents',
          frontendData: rows,
        });

        const full =
          'Here is a sample student table from the mock transport. ' +
          'In a real app your backend would stream the same `onToolStart` / `onToolComplete` events.';
        for (const char of full) {
          if (params.signal?.aborted) {
            throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
          }
          snapshot += char;
          params.handlers.onTextDelta?.(char, snapshot);
          if (tokenDelayMs > 0) await sleep(tokenDelayMs, params.signal);
        }
      } else if (toolDemos && SUMMARY_TRIGGER.test(userMessage)) {
        const toolId = `tool-summary-${Date.now()}`;
        params.handlers.onToolStart?.({
          id: toolId,
          name: 'getOverview',
          label: 'Today overview',
          reasoning: 'Aggregating demo stats…',
        });
        await sleep(400, params.signal);
        params.handlers.onToolComplete?.({
          id: toolId,
          name: 'getOverview',
          frontendData: {
            activeStudents: 128,
            openTasks: 7,
            averageScore: 87.4,
            status: 'On track',
          },
        });

        const full =
          'Mock overview card rendered via tool `frontendData` (key/value). ' +
          'Try “show students as a table” for the AiDataTable path.';
        for (const char of full) {
          if (params.signal?.aborted) {
            throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
          }
          snapshot += char;
          params.handlers.onTextDelta?.(char, snapshot);
          if (tokenDelayMs > 0) await sleep(tokenDelayMs, params.signal);
        }
      } else {
        const full = replyFor(userMessage, params.messages);
        for (const char of full) {
          if (params.signal?.aborted) {
            throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
          }
          snapshot += char;
          params.handlers.onTextDelta?.(char, snapshot);
          if (tokenDelayMs > 0) await sleep(tokenDelayMs, params.signal);
        }
      }

      const history = sessions.get(conversationId) ?? [...params.messages];
      history.push(
        {
          id: `user-${messageId}`,
          role: 'user',
          content: userMessage,
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
