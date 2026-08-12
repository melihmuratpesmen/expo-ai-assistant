import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiTransport } from '../provider/AiAssistantProvider';
import { useAiCallbacks } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import type { AiChatMessage, AiFunctionCall } from '../types/aiChat';

let messageCounter = 0;
function nextLocalId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

export interface UseAiChatOptions {
  conversationId?: string | null;
}

export interface UseAiChatResult {
  messages: AiChatMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  /** Re-run the last user turn (replaces the last assistant reply). */
  regenerateLastResponse: () => Promise<void>;
  startNewConversation: () => void;
  cancelStreaming: () => void;
}

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatResult {
  const transport = useAiTransport();
  const callbacks = useAiCallbacks();
  const strings = useAiStrings();

  const [conversationId, setConversationId] = useState<string | null>(
    options.conversationId ?? null
  );
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  const activeFunctionCallsRef = useRef<AiFunctionCall[]>([]);
  const messagesRef = useRef<AiChatMessage[]>([]);
  const conversationIdRef = useRef<string | null>(conversationId);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    const sessionId = options.conversationId;
    if (!sessionId || !transport.getHistory) return;
    if (loadedSessionRef.current === sessionId) return;

    let cancelled = false;
    setIsLoadingHistory(true);
    transport
      .getHistory(sessionId)
      .then(history => {
        if (cancelled) return;
        loadedSessionRef.current = sessionId;
        setMessages(history.messages);
        setConversationId(history.sessionId);
      })
      .catch(err => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : strings.errorHistory;
        setError(message);
        callbacks.onError?.(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transport, options.conversationId, strings.errorHistory, callbacks]);

  const patchMessage = useCallback((id: string, patch: Partial<AiChatMessage>) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index < 0) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const updateFunctionCalls = useCallback(
    (id: string, updater: (current: AiFunctionCall[]) => AiFunctionCall[]) => {
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === id);
        if (index < 0) return prev;
        const current = prev[index];
        const nextCalls = updater(current.functionCalls ?? []);
        activeFunctionCallsRef.current = nextCalls;
        const next = [...prev];
        next[index] = {
          ...current,
          functionCalls: nextCalls.length > 0 ? nextCalls : undefined,
        };
        return next;
      });
    },
    []
  );

  const runAssistantStream = useCallback(
    async (params: {
      priorMessages: AiChatMessage[];
      userMessageText: string;
      assistantId: string;
      appendUserMessage?: AiChatMessage;
    }) => {
      const { priorMessages, userMessageText, assistantId, appendUserMessage } = params;
      const currentConversationId = conversationIdRef.current;

      activeFunctionCallsRef.current = [];
      setError(null);

      if (appendUserMessage) {
        setMessages(prev => [
          ...prev,
          appendUserMessage,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            status: 'streaming',
          },
        ]);
      } else {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === assistantId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = {
              ...next[index],
              content: '',
              reasoning: undefined,
              blocks: undefined,
              functionCalls: undefined,
              status: 'streaming',
            };
            return next;
          }
          return [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: '',
              createdAt: Date.now(),
              status: 'streaming',
            },
          ];
        });
      }

      setIsStreaming(true);
      streamingAssistantIdRef.current = assistantId;
      callbacks.onMessageSent?.(userMessageText, currentConversationId);
      callbacks.onStreamStart?.(currentConversationId);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await transport.streamChat({
          messages: priorMessages,
          userMessage: userMessageText,
          conversationId: currentConversationId,
          signal: controller.signal,
          handlers: {
            onTextDelta: (_delta, snapshot) => {
              patchMessage(assistantId, { content: snapshot });
            },
            onReasoningDelta: (_delta, snapshot) => {
              patchMessage(assistantId, { reasoning: snapshot });
            },
            onToolStart: tool => {
              if (!tool.id || !tool.name) return;
              updateFunctionCalls(assistantId, current => {
                if (current.some(fc => fc.id === tool.id)) return current;
                return [
                  ...current,
                  {
                    id: tool.id,
                    name: tool.name,
                    label: tool.label,
                    status: 'executing',
                    reasoning: tool.reasoning,
                  },
                ];
              });
            },
            onToolComplete: tool => {
              if (!tool.id) return;
              updateFunctionCalls(assistantId, current => {
                const next = current.map(fc =>
                  fc.id === tool.id
                    ? {
                        ...fc,
                        status: 'completed' as const,
                        frontendData: tool.frontendData,
                      }
                    : fc
                );
                const completed = next.find(fc => fc.id === tool.id);
                if (completed) callbacks.onToolComplete?.(completed);
                return next;
              });
            },
            onError: errMessage => {
              setError(errMessage);
              callbacks.onError?.(errMessage);
            },
          },
        });

        if (result.conversationId && result.conversationId !== currentConversationId) {
          setConversationId(result.conversationId);
          loadedSessionRef.current = result.conversationId;
          if (!currentConversationId) {
            callbacks.onConversationCreated?.(result.conversationId);
          }
        }

        // If user aborted, cancelStreaming already finalized status.
        if (controller.signal.aborted) return;

        patchMessage(assistantId, {
          status: 'sent',
          id: result.messageId ?? assistantId,
          content: result.text,
          functionCalls:
            activeFunctionCallsRef.current.length > 0
              ? activeFunctionCallsRef.current
              : undefined,
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : strings.errorGeneric;
        setError(message);
        callbacks.onError?.(message);
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === assistantId);
          if (index < 0) return prev;
          const current = prev[index];
          const hasPartialContent = !!current.content?.trim();
          const hasFunctionCalls = !!current.functionCalls?.length;
          const next = [...prev];
          next[index] = {
            ...current,
            status: 'error',
            content:
              hasPartialContent || hasFunctionCalls ? current.content : strings.errorStream,
          };
          return next;
        });
      } finally {
        if (streamingAssistantIdRef.current === assistantId) {
          streamingAssistantIdRef.current = null;
        }
        setIsStreaming(false);
        abortRef.current = null;
        callbacks.onStreamEnd?.(conversationIdRef.current);
      }
    },
    [callbacks, patchMessage, strings.errorGeneric, strings.errorStream, transport, updateFunctionCalls]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreamingRef.current) return;

      const priorMessages = messagesRef.current;
      const userMessage: AiChatMessage = {
        id: nextLocalId('user'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        status: 'sent',
      };
      const assistantId = nextLocalId('assistant');

      await runAssistantStream({
        priorMessages,
        userMessageText: trimmed,
        assistantId,
        appendUserMessage: userMessage,
      });
    },
    [runAssistantStream]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isStreamingRef.current) return;

    const current = messagesRef.current;
    let lastAssistantIndex = -1;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i].role === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }
    if (lastAssistantIndex < 0) return;

    let lastUserIndex = -1;
    for (let i = lastAssistantIndex - 1; i >= 0; i -= 1) {
      if (current[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return;

    const userMessageText = current[lastUserIndex].content;
    const priorMessages = current.slice(0, lastUserIndex);
    const assistantId = nextLocalId('assistant');

    setMessages(prev => {
      // Drop trailing assistant (and anything after last user) then insert fresh assistant placeholder via runAssistantStream
      return prev.slice(0, lastUserIndex + 1);
    });

    await runAssistantStream({
      priorMessages,
      userMessageText,
      assistantId,
    });
  }, [runAssistantStream]);

  const cancelStreaming = useCallback(() => {
    const assistantId = streamingAssistantIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    streamingAssistantIdRef.current = null;

    if (assistantId) {
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === assistantId);
        if (index < 0) return prev;
        const current = prev[index];
        const next = [...prev];
        next[index] = {
          ...current,
          status: current.content?.trim() || current.functionCalls?.length ? 'stopped' : 'stopped',
        };
        return next;
      });
    }
  }, []);

  const startNewConversation = useCallback(() => {
    cancelStreaming();
    setMessages([]);
    setConversationId(null);
    setError(null);
    loadedSessionRef.current = null;
    activeFunctionCallsRef.current = [];
  }, [cancelStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return useMemo(
    () => ({
      messages,
      isStreaming,
      isLoadingHistory,
      error,
      conversationId,
      sendMessage,
      regenerateLastResponse,
      startNewConversation,
      cancelStreaming,
    }),
    [
      messages,
      isStreaming,
      isLoadingHistory,
      error,
      conversationId,
      sendMessage,
      regenerateLastResponse,
      startNewConversation,
      cancelStreaming,
    ]
  );
}
