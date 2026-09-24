import React, { createContext, useContext, useMemo } from 'react';
import { AiThemeProvider } from '../theme/AiThemeContext';
import { AiStringsProvider } from '../i18n/AiStringsContext';
import { mergeStrings } from '../i18n/strings';
import { createOpenAICompatibleTransport } from '../transport/openaiCompatible';
import { useLatestRef } from '../lib/useLatestRef';
import type { AiTransport } from '../transport/types';
import { AiCallbacksProvider, AiSlotsProvider } from './slots';
import type { AiAssistantConfig, AiAssistantProviderProps } from './types';

const AiTransportContext = createContext<AiTransport | null>(null);

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
}: AiAssistantProviderProps) {
  const transport = useResolvedTransport(config);
  const mergedStrings = useMemo(() => mergeStrings(strings), [strings]);

  return (
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
  );
}
