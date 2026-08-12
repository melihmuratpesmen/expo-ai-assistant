import React, { createContext, useContext } from 'react';
import type { UseAiChatResult } from '../hooks/useAiChat';

export interface AiQuickAskContextValue {
  isActive: boolean;
  chat: UseAiChatResult;
  open: (options?: { initialMessage?: string }) => void;
  close: () => void;
}

export const AiQuickAskContext = createContext<AiQuickAskContextValue | null>(null);

export function useAiQuickAskSession(): AiQuickAskContextValue {
  const ctx = useContext(AiQuickAskContext);
  if (!ctx) {
    throw new Error(
      'useAiQuickAskSession must be used within AiQuickAskProvider (expo-ai-assistant/bottom-sheet).'
    );
  }
  return ctx;
}
