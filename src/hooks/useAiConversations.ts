import { useCallback, useEffect, useState } from 'react';
import { useAiTransport } from '../provider/AiAssistantProvider';
import { useAiCallbacks } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useLatestRef } from '../lib/useLatestRef';
import type { AiConversationSummary } from '../types/aiChat';

export interface UseAiConversationsResult {
  conversations: AiConversationSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  remove: (sessionId: string) => Promise<void>;
  /** False when the transport has no `listSessions`. */
  supportsSessions: boolean;
}

/** Persisted conversation list through `transport.listSessions` / `deleteSession`. */
export function useAiConversations(): UseAiConversationsResult {
  const transport = useAiTransport();
  const callbacksRef = useLatestRef(useAiCallbacks());
  const stringsRef = useLatestRef(useAiStrings());
  const supportsSessions = typeof transport.listSessions === 'function';
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(supportsSessions);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(
    (signal?: AbortSignal) => {
      if (!transport.listSessions) return Promise.resolve();
      return transport.listSessions(signal).then(
        list => {
          if (signal?.aborted) return;
          setConversations(list);
          setError(null);
          setIsLoading(false);
        },
        (err: unknown) => {
          if (signal?.aborted || (err as Error)?.name === 'AbortError') return;
          const message = err instanceof Error ? err.message : stringsRef.current.errorSessions;
          setError(message);
          setIsLoading(false);
          callbacksRef.current.onError?.(message);
        }
      );
    },
    [callbacksRef, stringsRef, transport]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchSessions(controller.signal);
    return () => controller.abort();
  }, [fetchSessions]);

  const refetch = useCallback(async () => {
    if (!transport.listSessions) return;
    setIsLoading(true);
    await fetchSessions();
  }, [fetchSessions, transport]);

  const remove = useCallback(
    async (sessionId: string) => {
      if (!transport.deleteSession) {
        throw new Error('This transport does not support deleteSession.');
      }
      await transport.deleteSession(sessionId);
      setConversations(prev => prev.filter(item => item.id !== sessionId));
    },
    [transport]
  );

  return { conversations, isLoading, error, refetch, remove, supportsSessions };
}
