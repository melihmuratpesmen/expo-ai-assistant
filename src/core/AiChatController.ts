import type { AiStrings } from '../i18n/strings';
import type { AiAssistantCallbacks } from '../provider/slots';
import type { AiTransport } from '../transport/types';
import type { AiChatMessage, AiFunctionCall } from '../types/aiChat';

export interface AiChatState {
  messages: AiChatMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  conversationId: string | null;
}

export interface AiChatControllerOptions {
  /** Read lazily so the controller always uses the provider's current transport. */
  getTransport: () => AiTransport;
  getCallbacks?: () => AiAssistantCallbacks;
  getStrings: () => AiStrings;
  conversationId?: string | null;
  /**
   * Schedules a flush of buffered stream deltas. Deltas are applied at most
   * once per call (default: once per animation frame).
   */
  scheduleFlush?: (flush: () => void) => void;
}

let messageCounter = 0;
function nextLocalId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

function isAbortError(error: unknown): boolean {
  return (error as Error | undefined)?.name === 'AbortError';
}

const defaultScheduleFlush = (flush: () => void) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => flush());
  } else {
    setTimeout(flush, 16);
  }
};

function patchById(
  messages: AiChatMessage[],
  id: string,
  patch: Partial<AiChatMessage>
): AiChatMessage[] {
  const index = messages.findIndex(m => m.id === id);
  if (index < 0) return messages;
  const next = [...messages];
  next[index] = { ...next[index], ...patch };
  return next;
}

/**
 * Prior turns the model should see: assistant turns that produced nothing
 * (failed or stopped before any output) are dropped.
 */
export function toTransportHistory(messages: AiChatMessage[]): AiChatMessage[] {
  return messages.filter(message => {
    if (message.role !== 'assistant') return true;
    if (message.status === 'streaming') return false;
    return !!message.content.trim() || !!message.blocks?.length || !!message.functionCalls?.length;
  });
}

/**
 * Framework-agnostic chat state machine behind `useAiChat`.
 *
 * Holds messages and streaming state outside React so several components can
 * share one conversation and subscribe only to what they render
 * (`useAiChatState` / `useAiChatSelector`). Streamed text is buffered and
 * applied once per frame instead of once per token.
 */
export class AiChatController {
  private state: AiChatState;
  private readonly listeners = new Set<() => void>();
  private readonly options: AiChatControllerOptions;
  private abortController: AbortController | null = null;
  private streamingAssistantId: string | null = null;
  private historyAbort: AbortController | null = null;
  private loadedSessionId: string | null = null;
  /** Bumped whenever the conversation is replaced; late results from older streams are ignored. */
  private epoch = 0;
  private pendingPatches = new Map<string, Partial<AiChatMessage>>();
  private flushScheduled = false;

  constructor(options: AiChatControllerOptions) {
    this.options = options;
    this.state = {
      messages: [],
      isStreaming: false,
      isLoadingHistory: false,
      error: null,
      conversationId: options.conversationId ?? null,
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AiChatState => this.state;

  sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || this.state.isStreaming) return;

    this.foldPending();
    const userMessage: AiChatMessage = {
      id: nextLocalId('user'),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
      status: 'sent',
    };

    await this.runStream({
      priorMessages: this.state.messages,
      userMessageText: trimmed,
      assistantId: nextLocalId('assistant'),
      appendUserMessage: userMessage,
    });
  };

  /** Re-run the last user turn, replacing the reply after it. */
  regenerateLastResponse = async (): Promise<void> => {
    if (this.state.isStreaming) return;

    this.foldPending();
    const current = this.state.messages;
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
    this.update({ messages: current.slice(0, lastUserIndex + 1) });

    await this.runStream({
      priorMessages: current.slice(0, lastUserIndex),
      userMessageText: current[lastUserIndex].content,
      assistantId: nextLocalId('assistant'),
    });
  };

  cancelStreaming = (): void => {
    const controller = this.abortController;
    const assistantId = this.streamingAssistantId;
    if (!controller && !this.state.isStreaming) return;

    this.abortController = null;
    this.streamingAssistantId = null;
    controller?.abort();

    this.update(state => {
      if (!assistantId) return { isStreaming: false };
      const message = state.messages.find(m => m.id === assistantId);
      if (message?.status !== 'streaming') return { isStreaming: false };
      return {
        isStreaming: false,
        messages: patchById(state.messages, assistantId, { status: 'stopped' }),
      };
    });
  };

  startNewConversation = (): void => {
    this.epoch += 1;
    this.cancelStreaming();
    this.abortHistoryLoad();
    this.pendingPatches.clear();
    this.loadedSessionId = null;
    this.update({ messages: [], conversationId: null, error: null, isLoadingHistory: false });
  };

  /** Load a persisted conversation through `transport.getHistory` (no-op if already loaded). */
  loadConversation = async (sessionId: string): Promise<void> => {
    const transport = this.options.getTransport();
    if (!transport.getHistory || this.loadedSessionId === sessionId) return;

    this.abortHistoryLoad();
    const controller = new AbortController();
    this.historyAbort = controller;
    this.update({ isLoadingHistory: true });

    try {
      const history = await transport.getHistory(sessionId, controller.signal);
      if (controller.signal.aborted) return;
      this.epoch += 1;
      this.cancelStreaming();
      this.pendingPatches.clear();
      this.loadedSessionId = sessionId;
      this.update({ messages: history.messages, conversationId: history.sessionId, error: null });
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      const message = err instanceof Error ? err.message : this.options.getStrings().errorHistory;
      this.update({ error: message });
      this.callbacks.onError?.(message);
    } finally {
      if (this.historyAbort === controller) {
        this.historyAbort = null;
        this.update({ isLoadingHistory: false });
      }
    }
  };

  /** Stop an in-flight `loadConversation` without touching the current messages. */
  cancelHistoryLoad = (): void => {
    if (!this.historyAbort) return;
    this.abortHistoryLoad();
    this.update({ isLoadingHistory: false });
  };

  /** Abort in-flight work. The controller stays usable (React may remount in StrictMode). */
  dispose = (): void => {
    this.epoch += 1;
    this.cancelStreaming();
    this.abortHistoryLoad();
  };

  private get callbacks(): AiAssistantCallbacks {
    return this.options.getCallbacks?.() ?? {};
  }

  private abortHistoryLoad() {
    const controller = this.historyAbort;
    this.historyAbort = null;
    controller?.abort();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  /** Fold buffered stream deltas into state without notifying listeners. */
  private foldPending() {
    if (this.pendingPatches.size === 0) return;
    let messages = this.state.messages;
    for (const [id, patch] of this.pendingPatches) {
      messages = patchById(messages, id, patch);
    }
    this.pendingPatches = new Map();
    this.state = { ...this.state, messages };
  }

  private update(patch: Partial<AiChatState> | ((state: AiChatState) => Partial<AiChatState>)) {
    this.foldPending();
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private patchMessage(id: string, patch: Partial<AiChatMessage>) {
    this.update(state => ({ messages: patchById(state.messages, id, patch) }));
  }

  /** Buffer a high-frequency patch (text / reasoning deltas) until the next flush. */
  private queuePatch(id: string, patch: Partial<AiChatMessage>) {
    const previous = this.pendingPatches.get(id);
    this.pendingPatches.set(id, previous ? { ...previous, ...patch } : patch);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    (this.options.scheduleFlush ?? defaultScheduleFlush)(() => {
      this.flushScheduled = false;
      if (this.pendingPatches.size === 0) return;
      this.foldPending();
      this.emit();
    });
  }

  private async runStream(params: {
    priorMessages: AiChatMessage[];
    userMessageText: string;
    assistantId: string;
    appendUserMessage?: AiChatMessage;
  }) {
    const { priorMessages, userMessageText, assistantId, appendUserMessage } = params;
    const epoch = this.epoch;
    const currentConversationId = this.state.conversationId;
    const controller = new AbortController();
    const isStale = () => controller.signal.aborted || this.epoch !== epoch;

    this.abortController = controller;
    this.streamingAssistantId = assistantId;

    const placeholder: AiChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'streaming',
    };
    this.update(state => {
      if (appendUserMessage) {
        return {
          isStreaming: true,
          error: null,
          messages: [...state.messages, appendUserMessage, placeholder],
        };
      }
      const exists = state.messages.some(m => m.id === assistantId);
      return {
        isStreaming: true,
        error: null,
        messages: exists
          ? state.messages.map(m => (m.id === assistantId ? placeholder : m))
          : [...state.messages, placeholder],
      };
    });

    this.callbacks.onMessageSent?.(userMessageText, currentConversationId);
    this.callbacks.onStreamStart?.(currentConversationId);

    let functionCalls: AiFunctionCall[] = [];
    let reportedError = false;
    const reportError = (message: string) => {
      this.update({ error: message });
      // Transports may report through the handler and then throw; notify once.
      if (reportedError) return;
      reportedError = true;
      this.callbacks.onError?.(message);
    };

    try {
      const result = await this.options.getTransport().streamChat({
        messages: toTransportHistory(priorMessages),
        userMessage: userMessageText,
        conversationId: currentConversationId,
        signal: controller.signal,
        handlers: {
          onTextDelta: (_delta, snapshot) => {
            if (isStale()) return;
            this.queuePatch(assistantId, { content: snapshot });
          },
          onReasoningDelta: (_delta, snapshot) => {
            if (isStale()) return;
            this.queuePatch(assistantId, { reasoning: snapshot });
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
            this.patchMessage(assistantId, { functionCalls });
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
            this.patchMessage(assistantId, { functionCalls });
            this.callbacks.onToolComplete?.(completed);
          },
          onError: message => {
            if (isStale()) return;
            reportError(message);
          },
        },
      });

      // A newer conversation replaced this one; drop the late result.
      if (this.epoch !== epoch) return;

      if (result.conversationId && result.conversationId !== currentConversationId) {
        this.loadedSessionId = result.conversationId;
        this.update({ conversationId: result.conversationId });
        if (!currentConversationId) {
          this.callbacks.onConversationCreated?.(result.conversationId);
        }
      }

      // If the user stopped the stream, cancelStreaming already finalized the message.
      if (controller.signal.aborted) return;

      this.patchMessage(assistantId, {
        status: 'sent',
        id: result.messageId ?? assistantId,
        content: result.text,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      });
    } catch (err) {
      if (isAbortError(err) || isStale()) return;
      const message =
        err instanceof Error && err.message ? err.message : this.options.getStrings().errorGeneric;
      reportError(message);
      // Keep whatever the model produced; the bubble renders a fallback for empty errors.
      this.patchMessage(assistantId, { status: 'error' });
    } finally {
      if (this.abortController === controller) {
        this.abortController = null;
        this.streamingAssistantId = null;
        this.update({ isStreaming: false });
      }
      this.callbacks.onStreamEnd?.(this.state.conversationId);
    }
  }
}
