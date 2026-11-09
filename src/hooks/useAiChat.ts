import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAiChatRuntime, useAiTransport } from '../provider/AiAssistantProvider';
import type { AiChatController, AiChatState } from '../core/AiChatController';
import type { AiChatMessage } from '../types/aiChat';

export { toTransportHistory } from '../core/AiChatController';

export interface UseAiChatOptions {
  /** Persisted conversation to load through `transport.getHistory`. */
  conversationId?: string | null;
  /**
   * Share one conversation between every component / surface using the same
   * id. Shared conversations live as long as `AiAssistantProvider`.
   */
  chatId?: string;
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
  /** Underlying store — share it with other components or subscribe selectively. */
  controller: AiChatController;
}

/**
 * Creates a chat controller bound to the nearest `AiAssistantProvider`,
 * without subscribing the calling component to message updates.
 */
export function useAiChatController(options: UseAiChatOptions = {}): AiChatController {
  const runtime = useAiChatRuntime();
  const transport = useAiTransport();
  const { chatId, conversationId } = options;

  // Always created so hook order stays stable; unused while `chatId` is set.
  const [own] = useState(() => runtime.createController({ conversationId }));
  const controller = chatId ? runtime.getSharedController(chatId) : own;

  useEffect(() => {
    if (!conversationId) return;
    void controller.loadConversation(conversationId);
    return () => controller.cancelHistoryLoad();
  }, [controller, conversationId, transport]);

  // Shared controllers outlive their components.
  useEffect(() => () => own.dispose(), [own]);

  return controller;
}

/** Subscribe to the full chat state of a controller. */
export function useAiChatState(controller: AiChatController): AiChatState {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}

/**
 * Subscribe to a slice of chat state; the component re-renders only when the
 * selected value changes. Return primitives or existing references.
 *
 * @example const isStreaming = useAiChatSelector(controller, s => s.isStreaming);
 */
export function useAiChatSelector<T>(
  controller: AiChatController,
  selector: (state: AiChatState) => T
): T {
  const getSelected = () => selector(controller.getSnapshot());
  return useSyncExternalStore(controller.subscribe, getSelected, getSelected);
}

/** Bind state + actions of an existing controller (e.g. one shared through context). */
export function useAiChatFromController(controller: AiChatController): UseAiChatResult {
  const state = useAiChatState(controller);
  return useMemo(
    () => ({
      ...state,
      sendMessage: controller.sendMessage,
      regenerateLastResponse: controller.regenerateLastResponse,
      startNewConversation: controller.startNewConversation,
      cancelStreaming: controller.cancelStreaming,
      controller,
    }),
    [state, controller]
  );
}

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatResult {
  return useAiChatFromController(useAiChatController(options));
}
