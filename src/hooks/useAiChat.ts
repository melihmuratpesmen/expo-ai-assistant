import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAiTransport } from '../provider/AiAssistantProvider';
import { useAiCallbacks } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useLatestRef } from '../lib/useLatestRef';
import { AiChatController, type AiChatState } from '../core/AiChatController';
import type { AiChatMessage } from '../types/aiChat';

export { toTransportHistory } from '../core/AiChatController';

export interface UseAiChatOptions {
  /** Persisted conversation to load through `transport.getHistory`. */
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
  /** Underlying store — share it with other components or subscribe selectively. */
  controller: AiChatController;
}

/**
 * Creates a chat controller bound to the nearest `AiAssistantProvider`,
 * without subscribing the calling component to message updates.
 */
export function useAiChatController(options: UseAiChatOptions = {}): AiChatController {
  const transport = useAiTransport();
  const transportRef = useLatestRef(transport);
  const callbacksRef = useLatestRef(useAiCallbacks());
  const stringsRef = useLatestRef(useAiStrings());

  // The getters run only from actions and effects, never during render.
  /* eslint-disable react-hooks/refs */
  const [controller] = useState(
    () =>
      new AiChatController({
        getTransport: () => transportRef.current,
        getCallbacks: () => callbacksRef.current,
        getStrings: () => stringsRef.current,
        conversationId: options.conversationId,
      })
  );
  /* eslint-enable react-hooks/refs */

  const { conversationId } = options;
  useEffect(() => {
    if (!conversationId) return;
    void controller.loadConversation(conversationId);
    return () => controller.cancelHistoryLoad();
  }, [controller, conversationId, transport]);

  useEffect(() => () => controller.dispose(), [controller]);

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
