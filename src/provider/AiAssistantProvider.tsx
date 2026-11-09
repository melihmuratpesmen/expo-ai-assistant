import React, { createContext, useContext, useMemo } from 'react';
import { AiThemeProvider } from '../theme/AiThemeContext';
import { AiStringsProvider } from '../i18n/AiStringsContext';
import { mergeStrings } from '../i18n/strings';
import { createOpenAICompatibleTransport } from '../transport/openaiCompatible';
import { useLatestRef } from '../lib/useLatestRef';
import type { AiTransport } from '../transport/types';
import { AiChatController } from '../core/AiChatController';
import { AiCallbacksProvider, AiSlotsProvider, type AiAssistantCallbacks } from './slots';
import type { AiAssistantConfig, AiAssistantProviderProps } from './types';

const AiTransportContext = createContext<AiTransport | null>(null);

/** Creates controllers bound to the provider and keeps the shared (`chatId`) ones. */
export interface AiChatRuntime {
  createController: (options?: { conversationId?: string | null }) => AiChatController;
  /** The controller for `chatId`, created on first use; lives as long as the provider. */
  getSharedController: (chatId: string) => AiChatController;
}

const AiChatRuntimeContext = createContext<AiChatRuntime | null>(null);
const NO_CALLBACKS: AiAssistantCallbacks = {};

export function useAiChatRuntime(): AiChatRuntime {
  const runtime = useContext(AiChatRuntimeContext);
  if (!runtime) {
    throw new Error('useAiChat / surfaces must be rendered inside AiAssistantProvider.');
  }
  return runtime;
}

export function useAiTransport(): AiTransport {
  const transport = useContext(AiTransportContext);
  if (!transport) {
    throw new Error(
      'AiAssistantProvider is missing a transport. Pass config.transport or config.openai.'
    );
  }
  return transport;
}

/**
 * The transport stays stable across renders even when `config` / `config.openai`
 * are inline objects; OpenAI options are read at request time.
 */
function useResolvedTransport(config: AiAssistantConfig): AiTransport {
  const openaiRef = useLatestRef(config.openai);
  const hasOpenai = !!config.openai;
  const customTransport = config.transport;

  return useMemo(() => {
    if (customTransport) return customTransport;
    if (hasOpenai) {
      return {
        streamChat: params => {
          const options = openaiRef.current;
          if (!options) throw new Error('AiAssistantProvider: config.openai was removed.');
          return createOpenAICompatibleTransport(options).streamChat(params);
        },
      };
    }
    throw new Error(
      'AiAssistantProvider requires config.transport or config.openai (OpenAI-compatible default).'
    );
  }, [customTransport, hasOpenai, openaiRef]);
}

export function AiAssistantProvider({
  children,
  config,
  theme,
  colorScheme = 'light',
  strings,
  callbacks,
  slots,
  context,
}: AiAssistantProviderProps) {
  const transport = useResolvedTransport(config);
  const mergedStrings = useMemo(() => mergeStrings(strings), [strings]);

  const transportRef = useLatestRef(transport);
  const callbacksRef = useLatestRef(callbacks ?? NO_CALLBACKS);
  const stringsRef = useLatestRef(mergedStrings);
  const contextRef = useLatestRef(context);

  // Controllers read the latest provider values through refs at request time.
  const runtime = useMemo<AiChatRuntime>(() => {
    const create = (conversationId?: string | null) =>
      new AiChatController({
        getTransport: () => transportRef.current,
        getCallbacks: () => callbacksRef.current,
        getStrings: () => stringsRef.current,
        getContext: () => {
          const value = contextRef.current;
          return typeof value === 'function' ? value() : value;
        },
        conversationId,
      });
    const shared = new Map<string, AiChatController>();
    return {
      createController: options => create(options?.conversationId),
      getSharedController: chatId => {
        let controller = shared.get(chatId);
        if (!controller) {
          controller = create(null);
          shared.set(chatId, controller);
        }
        return controller;
      },
    };
  }, [callbacksRef, contextRef, stringsRef, transportRef]);

  return (
    <AiChatRuntimeContext.Provider value={runtime}>
      <AiTransportContext.Provider value={transport}>
        <AiCallbacksProvider value={callbacks}>
          <AiSlotsProvider value={slots}>
            <AiStringsProvider value={mergedStrings}>
              <AiThemeProvider theme={theme} colorScheme={colorScheme}>
                {children}
              </AiThemeProvider>
            </AiStringsProvider>
          </AiSlotsProvider>
        </AiCallbacksProvider>
      </AiTransportContext.Provider>
    </AiChatRuntimeContext.Provider>
  );
}
