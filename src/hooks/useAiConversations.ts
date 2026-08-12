import { useCallback, useEffect, useState } from 'react';
import { useAiTransport } from '../provider/AiAssistantProvider';
import { useAiCallbacks } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import type { AiConversationSummary } from '../types/aiChat';

export function useAiConversations() {
  const transport = useAiTransport();
  const callbacks = useAiCallbacks();
  const strings = useAiStrings();
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supportsSessions = typeof transport.listSessions === 'function';

  const refetch = useCallback(async () => {
    if (!transport.listSessions) {
      setConversations([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await transport.listSessions();
      setConversations(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : strings.errorSessions;
      setError(message);
      callbacks.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [transport, strings.errorSessions, callbacks]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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
