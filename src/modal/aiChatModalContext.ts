import { createContext, useContext, useMemo } from 'react';
import type { AiChatController } from '../core/AiChatController';
import { useAiChatFromController, type UseAiChatResult } from '../hooks/useAiChat';

export interface AiChatModalOpenOptions {
  /** Sent as the first user message after the modal opens. */
  initialMessage?: string;
}

/** Modal controls without chat state — components using it do not re-render while replies stream. */
export interface AiChatModalControls {
  isActive: boolean;
  open: (options?: AiChatModalOpenOptions) => void;
  close: () => void;
  /** The modal's conversation store. */
  controller: AiChatController;
}

export interface AiChatModalContextValue extends Omit<AiChatModalControls, 'controller'> {
  chat: UseAiChatResult;
}

export const AiChatModalContext = createContext<AiChatModalControls | null>(null);

/** Open / close the modal. Prefer this over `useAiChatModalSession` for buttons. */
export function useAiChatModal(): AiChatModalControls {
  const ctx = useContext(AiChatModalContext);
  if (!ctx) {
    throw new Error(
      'useAiChatModal must be used within AiChatModalProvider (expo-ai-assistant/modal).'
    );
  }
  return ctx;
}

/** Controls plus live chat state (re-renders on every streamed update). */
export function useAiChatModalSession(): AiChatModalContextValue {
  const { isActive, open, close, controller } = useAiChatModal();
  const chat = useAiChatFromController(controller);
  return useMemo(() => ({ isActive, open, close, chat }), [chat, close, isActive, open]);
}
