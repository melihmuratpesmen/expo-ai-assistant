import React, { createContext, useContext } from 'react';
import { defaultStrings, type AiStrings } from '../i18n/strings';

const AiStringsContext = createContext<AiStrings>(defaultStrings);

export function AiStringsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AiStrings;
}) {
  return <AiStringsContext.Provider value={value}>{children}</AiStringsContext.Provider>;
}

export function useAiStrings(): AiStrings {
  return useContext(AiStringsContext);
}
