import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiTransport } from '../provider/AiAssistantProvider';
import { useAiCallbacks } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useLatestRef } from '../lib/useLatestRef';
import type { AiChatMessage, AiFunctionCall } from '../types/aiChat';

let messageCounter = 0;
function nextLocalId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

function isAbortError(error: unknown): boolean {
  return (error as Error | undefined)?.name === 'AbortError';
}

/**
 * Prior turns the model should see: assistant turns that produced nothing
 * (failed or stopped before any output) are dropped.
 */
export function toTransportHistory(messages: AiChatMessage[]): AiChatMessage[] {
  return messages.filter(message => {
    if (message.role !== 'assistant') return true;
    if (message.status === 'streaming') return false;
    return (
      !!message.content.trim() || !!message.blocks?.length || !!message.functionCalls?.length
    );
  });
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
  const callbacksRef = useLatestRef(useAiCallbacks());
  const stringsRef = useLatestRef(useAiStrings());

  const [conversationId, setConversationIdState] = useState<string | null>(
    options.conversationId ?? null
  );
  const [messages, setMessagesState] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreamingState] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs mirror state synchronously so actions called in the same tick
  // (e.g. startNewConversation + sendMessage) see the latest values.
  const messagesRef = useRef<AiChatMessage[]>([]);
  const conversationIdRef = useRef<string | null>(conversationId);
  const isStreamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  /** Bumped whenever the conversation is replaced; late results from older streams are ignored. */
  const epochRef = useRef(0);

  const updateMessages = useCallback(
    (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => {
      const next = updater(messagesRef.current);
      if (next === messagesRef.current) return;
      messagesRef.current = next;
      setMessagesState(next);
    },
    []
  );

  const patchMessage = useCallback(
    (id: string, patch: Partial<AiChatMessage>) => {
      updateMessages(prev => {
        const index = prev.findIndex(m => m.id === id);
        if (index < 0) return prev;
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    },
    [updateMessages]
  );

  const setConversationId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationIdState(id);
  }, []);

  const setStreaming = useCallback((value: boolean) => {
    isStreamingRef.current = value;
    setIsStreamingState(value);
  }, []);

  const cancelStreaming = useCallback(() => {
    const controller = abortRef.current;
    const assistantId = streamingAssistantIdRef.current;
    abortRef.current = null;
    streamingAssistantIdRef.current = null;
    controller?.abort();
    setStreaming(false);

    if (assistantId) {
      updateMessages(prev => {
        const index = prev.findIndex(m => m.id === assistantId);
        if (index < 0 || prev[index].status !== 'streaming') return prev;
        const next = [...prev];
        next[index] = { ...next[index], status: 'stopped' };
        return next;
      });
    }
  }, [setStreaming, updateMessages]);

  useEffect(() => {
    const sessionId = options.conversationId;
    if (!sessionId || !transport.getHistory) return;
    if (loadedSessionRef.current === sessionId) return;

    let cancelled = false;
    const controller = new AbortController();
    setIsLoadingHistory(true);
    transport
      .getHistory(sessionId, controller.signal)
      .then(history => {
        if (cancelled) return;
        epochRef.current += 1;
        cancelStreaming();
        loadedSessionRef.current = sessionId;
        updateMessages(() => history.messages);
        setConversationId(history.sessionId);
        setError(null);
      })
      .catch(err => {
        if (cancelled || isAbortError(err)) return;
        const message = err instanceof Error ? err.message : stringsRef.current.errorHistory;
        setError(message);
        callbacksRef.current.onError?.(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      setIsLoadingHistory(false);
    };
  }, [
    transport,
    options.conversationId,
    cancelStreaming,
    updateMessages,
    setConversationId,
    callbacksRef,
    stringsRef,
  ]);

  const runAssistantStream = useCallback(
    async (params: {
      priorMessages: AiChatMessage[];
      userMessageText: string;
      assistantId: string;
      appendUserMessage?: AiChatMessage;
    }) => {
      const { priorMessages, userMessageText, assistantId, appendUserMessage } = params;
      const epoch = epochRef.current;
      const currentConversationId = conversationIdRef.current;
      const controller = new AbortController();
      const isStale = () => controller.signal.aborted || epochRef.current !== epoch;

      abortRef.current = controller;
      streamingAssistantIdRef.current = assistantId;
      setStreaming(true);
      setError(null);

      const placeholder: AiChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      };
      updateMessages(prev => {
        if (appendUserMessage) return [...prev, appendUserMessage, placeholder];
        const index = prev.findIndex(m => m.id === assistantId);
        if (index < 0) return [...prev, placeholder];
        const next = [...prev];
        next[index] = placeholder;
        return next;
      });

      callbacksRef.current.onMessageSent?.(userMessageText, currentConversationId);
      callbacksRef.current.onStreamStart?.(currentConversationId);

      let functionCalls: AiFunctionCall[] = [];
      let reportedError = false;
      const reportError = (message: string) => {
        setError(message);
        // Transports may report through the handler and then throw; notify once.
        if (reportedError) return;
        reportedError = true;
        callbacksRef.current.onError?.(message);
      };

      try {
        const result = await transport.streamChat({
          messages: toTransportHistory(priorMessages),
          userMessage: userMessageText,
          conversationId: currentConversationId,
          signal: controller.signal,
          handlers: {
            onTextDelta: (_delta, snapshot) => {
              if (isStale()) return;
              patchMessage(assistantId, { content: snapshot });
            },
            onReasoningDelta: (_delta, snapshot) => {
              if (isStale()) return;
              patchMessage(assistantId, { reasoning: snapshot });
            },
            onToolStart: tool => {
              if (isStale() || !tool.id || !tool.name) return;
              if (functionCalls.some(fc => fc.id === tool.id)) return;
              functionCalls = [
                ...functionCalls,
                {
                  id: tool.id,
                  name: tool.name,
                  label: tool.label,
                  status: 'executing',
                  reasoning: tool.reasoning,
                },
              ];
              patchMessage(assistantId, { functionCalls });
            },
            onToolComplete: tool => {
              if (isStale() || !tool.id) return;
              const existing = functionCalls.find(fc => fc.id === tool.id);
              const completed: AiFunctionCall = existing
                ? { ...existing, status: 'completed', frontendData: tool.frontendData }
                : {
                    id: tool.id,
                    name: tool.name,
                    status: 'completed',
                    frontendData: tool.frontendData,
                  };
              functionCalls = existing
                ? functionCalls.map(fc => (fc.id === tool.id ? completed : fc))
                : [...functionCalls, completed];
              patchMessage(assistantId, { functionCalls });
              callbacksRef.current.onToolComplete?.(completed);
            },
            onError: message => {
              if (isStale()) return;
              reportError(message);
            },
          },
        });

        // A newer conversation replaced this one; drop the late result.
        if (epochRef.current !== epoch) return;

        if (result.conversationId && result.conversationId !== currentConversationId) {
          loadedSessionRef.current = result.conversationId;
          setConversationId(result.conversationId);
          if (!currentConversationId) {
            callbacksRef.current.onConversationCreated?.(result.conversationId);
          }
        }

        // If the user stopped the stream, cancelStreaming already finalized the message.
        if (controller.signal.aborted) return;

        patchMessage(assistantId, {
          status: 'sent',
          id: result.messageId ?? assistantId,
          content: result.text,
          functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        });
      } catch (err) {
        if (isAbortError(err) || isStale()) return;
        const message =
          err instanceof Error && err.message ? err.message : stringsRef.current.errorGeneric;
        reportError(message);
        // Keep whatever the model produced; the bubble renders a fallback for empty errors.
        patchMessage(assistantId, { status: 'error' });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          streamingAssistantIdRef.current = null;
          setStreaming(false);
        }
        callbacksRef.current.onStreamEnd?.(conversationIdRef.current);
      }
    },
    [callbacksRef, patchMessage, setConversationId, setStreaming, stringsRef, transport, updateMessages]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreamingRef.current) return;

      const userMessage: AiChatMessage = {
        id: nextLocalId('user'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        status: 'sent',
      };

      await runAssistantStream({
        priorMessages: messagesRef.current,
        userMessageText: trimmed,
        assistantId: nextLocalId('assistant'),
        appendUserMessage: userMessage,
      });
    },
    [runAssistantStream]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isStreamingRef.current) return;

    const current = messagesRef.current;
    let lastUserIndex = -1;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0 || !current.slice(lastUserIndex).some(m => m.role === 'assistant')) {
      return;
    }

    // Drop the reply (and anything after the last user turn); the stream adds a fresh placeholder.
    updateMessages(prev => prev.slice(0, lastUserIndex + 1));

    await runAssistantStream({
      priorMessages: current.slice(0, lastUserIndex),
      userMessageText: current[lastUserIndex].content,
      assistantId: nextLocalId('assistant'),
    });
  }, [runAssistantStream, updateMessages]);

  const startNewConversation = useCallback(() => {
    epochRef.current += 1;
    cancelStreaming();
    updateMessages(() => []);
    setConversationId(null);
    setError(null);
    loadedSessionRef.current = null;
  }, [cancelStreaming, setConversationId, updateMessages]);

  useEffect(() => {
    return () => {
      epochRef.current += 1;
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
