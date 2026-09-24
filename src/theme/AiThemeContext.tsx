import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, lightTheme } from './defaultTheme';
import type { AiTheme, AiThemeColors, AiThemeOverride } from './types';

const AiThemeContext = createContext<AiTheme>(lightTheme);

export function mergeTheme(base: AiTheme, override?: AiThemeOverride): AiTheme {
  if (!override) return base;
  const overrideColors = override.colors ?? {};

  const colors = Object.fromEntries(
    Object.entries(base.colors).map(([group, values]) => [
      group,
      { ...values, ...(overrideColors[group as keyof AiThemeColors] as object | undefined) },
    ])
  ) as unknown as AiThemeColors;

  // Bubbles follow an overridden primary / text color unless set explicitly.
  const bubble = overrideColors.bubble ?? {};
  if (overrideColors.primary?.DEFAULT && !bubble.user) {
    colors.bubble.user = colors.primary.DEFAULT;
  }
  if (overrideColors.primary?.onPrimary && !bubble.userText) {
    colors.bubble.userText = colors.primary.onPrimary;
  }
  if (overrideColors.text?.DEFAULT && !bubble.assistantText) {
    colors.bubble.assistantText = colors.text.DEFAULT;
  }

  return {
    meta: { ...base.meta, ...override.meta },
    fontFamily: { ...base.fontFamily, ...override.fontFamily },
    colors,
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
