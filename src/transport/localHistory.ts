import type { AiChatMessage, AiConversationSummary, AiFunctionCall } from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

/**
 * Minimal async key-value store. `@react-native-async-storage/async-storage`
 * matches it directly; wrap MMKV or SecureStore in a small adapter.
 */
export interface AiKeyValueStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/** In-memory storage (tests, previews). */
export function createMemoryStorage(): AiKeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: key => {
      map.delete(key);
    },
  };
}

export interface LocalHistoryOptions {
  storage: AiKeyValueStorage;
  /** Key prefix. Default `expo-ai-assistant`. */
  namespace?: string;
  /** Keep at most this many conversations; the oldest are dropped. Default 50. */
  maxConversations?: number;
  /** Conversation title. Default: the first user message (60 chars). */
  getTitle?: (messages: AiChatMessage[]) => string;
}

interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AiChatMessage[];
}

let localCounter = 0;
function localId(prefix: string) {
  localCounter += 1;
  return `${prefix}-${Date.now()}-${localCounter}`;
}

function defaultTitle(messages: AiChatMessage[]): string {
  const first = messages.find(m => m.role === 'user')?.content.trim() ?? '';
  return first.length > 60 ? `${first.slice(0, 57)}…` : first || 'Chat';
}

/**
 * Adds on-device conversation history to any transport: completed replies are
 * saved to `storage`, and `listSessions` / `getHistory` / `deleteSession` read
 * from it (so `AiConversationHistoryScreen` works without a backend).
 *
 * @example
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * const transport = withLocalHistory(createOpenAICompatibleTransport({ … }), {
 *   storage: AsyncStorage,
 * });
 */
export function withLocalHistory(
  transport: AiTransport,
  options: LocalHistoryOptions
): AiTransport {
  const { storage } = options;
  const namespace = options.namespace ?? 'expo-ai-assistant';
  const maxConversations = options.maxConversations ?? 50;
  const getTitle = options.getTitle ?? defaultTitle;
  const indexKey = `${namespace}:index`;
  const conversationKey = (id: string) => `${namespace}:conversation:${id}`;

  // Serialize read-modify-write cycles on the index.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const readJson = async <T>(key: string): Promise<T | null> => {
    const raw = await storage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const readIndex = async () => (await readJson<AiConversationSummary[]>(indexKey)) ?? [];

  const save = (conversation: StoredConversation) =>
    enqueue(async () => {
      await storage.setItem(conversationKey(conversation.id), JSON.stringify(conversation));
      const last = [...conversation.messages].reverse().find(m => m.role === 'assistant');
      const summary: AiConversationSummary = {
        id: conversation.id,
        title: conversation.title,
        lastMessagePreview: last?.content.slice(0, 80),
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
      };
      const index = [summary, ...(await readIndex()).filter(item => item.id !== conversation.id)];
      const kept = index.slice(0, maxConversations);
      for (const dropped of index.slice(maxConversations)) {
        await storage.removeItem(conversationKey(dropped.id));
      }
      await storage.setItem(indexKey, JSON.stringify(kept));
    });

  return {
    async streamChat(params: AiTransportStreamParams): Promise<AiTransportStreamResult> {
      const startedAt = Date.now();
      let reasoning: string | undefined;
      let suggestions: AiSuggestion[] | undefined;
      const calls = new Map<string, AiFunctionCall>();
      const { handlers } = params;

      const result = await transport.streamChat({
        ...params,
        handlers: {
          ...handlers,
          onReasoningDelta: (delta, snapshot) => {
            reasoning = snapshot;
            handlers.onReasoningDelta?.(delta, snapshot);
          },
          onToolStart: tool => {
            calls.set(tool.id, { ...tool, status: 'executing' });
            handlers.onToolStart?.(tool);
          },
          onToolComplete: tool => {
            calls.set(tool.id, { ...calls.get(tool.id), ...tool, status: 'completed' });
            handlers.onToolComplete?.(tool);
          },
          onToolError: tool => {
            calls.set(tool.id, {
              ...calls.get(tool.id),
              id: tool.id,
              name: tool.name,
              status: 'error',
              error: tool.error,
            });
            handlers.onToolError?.(tool);
          },
          onSuggestions: value => {
            suggestions = value;
            handlers.onSuggestions?.(value);
          },
        },
      });
      // Failed or cancelled replies throw above, so only completed ones are saved.

      const conversationId = result.conversationId ?? params.conversationId ?? localId('local');
      const existing = await readJson<StoredConversation>(conversationKey(conversationId));
      const now = Date.now();
      const messages: AiChatMessage[] = [
        ...params.messages,
        {
          id: localId('user'),
          role: 'user',
          content: params.userMessage,
          createdAt: startedAt,
          status: 'sent',
        },
        {
          id: result.messageId ?? localId('assistant'),
          role: 'assistant',
          content: result.text,
          createdAt: now,
          status: 'sent',
          reasoning,
          suggestions,
          usage: result.usage,
          functionCalls: calls.size > 0 ? [...calls.values()] : undefined,
        },
      ];
      await save({
        id: conversationId,
        title: existing?.title ?? getTitle(messages),
        createdAt: existing?.createdAt ?? startedAt,
        updatedAt: now,
        messages,
      });

      return { ...result, conversationId };
    },

    async listSessions() {
      await queue;
      const index = await readIndex();
      return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async getHistory(sessionId, signal) {
      await queue;
      const stored = await readJson<StoredConversation>(conversationKey(sessionId));
      if (stored) return { sessionId, messages: stored.messages };
      if (transport.getHistory) return transport.getHistory(sessionId, signal);
      return { sessionId, messages: [] };
    },

    deleteSession(sessionId) {
      return enqueue(async () => {
        await storage.removeItem(conversationKey(sessionId));
        const index = await readIndex();
        await storage.setItem(
          indexKey,
          JSON.stringify(index.filter(item => item.id !== sessionId))
        );
      });
    },
  };
}
