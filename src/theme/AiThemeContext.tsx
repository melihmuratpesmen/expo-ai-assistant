import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, lightTheme } from './defaultTheme';
import type { AiTheme, AiThemeOverride } from './types';

const AiThemeContext = createContext<AiTheme>(lightTheme);

function mergeTheme(base: AiTheme, override?: AiThemeOverride): AiTheme {
  if (!override) return base;
  return {
    meta: { ...base.meta, ...override.meta },
    fontFamily: { ...base.fontFamily, ...override.fontFamily },
    colors: {
      bg: { ...base.colors.bg, ...override.colors?.bg },
      text: { ...base.colors.text, ...override.colors?.text },
      border: { ...base.colors.border, ...override.colors?.border },
      primary: { ...base.colors.primary, ...override.colors?.primary },
      error: { ...base.colors.error, ...override.colors?.error },
      success: { ...base.colors.success, ...override.colors?.success },
      warning: { ...base.colors.warning, ...override.colors?.warning },
      info: { ...base.colors.info, ...override.colors?.info },
    },
  };
}

export function AiThemeProvider({
  children,
  theme,
  colorScheme = 'light',
}: {
  children: React.ReactNode;
  theme?: AiThemeOverride;
  colorScheme?: 'light' | 'dark';
}) {
  const value = useMemo(
    () => mergeTheme(colorScheme === 'dark' ? darkTheme : lightTheme, theme),
    [colorScheme, theme]
  );
  return <AiThemeContext.Provider value={value}>{children}</AiThemeContext.Provider>;
}

export function useAiTheme(): AiTheme {
  return useContext(AiThemeContext);
}
