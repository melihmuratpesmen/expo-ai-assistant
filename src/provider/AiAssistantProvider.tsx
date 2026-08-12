import React, { createContext, useContext, useMemo } from 'react';
import { AiThemeProvider } from '../theme/AiThemeContext';
import { AiStringsProvider } from '../i18n/AiStringsContext';
import { mergeStrings } from '../i18n/strings';
import { createOpenAICompatibleTransport } from '../transport/openaiCompatible';
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

/** @deprecated Use useAiTransport — kept as alias for smoother upgrades. */
export function useAiAssistantConfig(): { transport: AiTransport } {
  return { transport: useAiTransport() };
}

function resolveTransport(config: AiAssistantConfig): AiTransport {
  if (config.transport) return config.transport;
  if (config.openai) return createOpenAICompatibleTransport(config.openai);
  throw new Error(
    'AiAssistantProvider requires config.transport or config.openai (OpenAI-compatible default).'
  );
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
  const transport = useMemo(() => resolveTransport(config), [config]);
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
