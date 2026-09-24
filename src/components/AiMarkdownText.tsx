import React, { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { fontSize } from '../theme/tokens';

type MarkdownComponent = React.ComponentType<{
  children: string;
  style?: Record<string, StyleProp<TextStyle>>;
}>;

function resolveMarkdown(): MarkdownComponent | null {
  try {
    // Optional peer — only loads when installed by the host app.
    const mod = require('react-native-markdown-display');
    return (mod.default ?? mod) as MarkdownComponent;
  } catch {
    return null;
  }
}

const Markdown = resolveMarkdown();

function stripSimpleMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export interface AiMarkdownTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders markdown when `react-native-markdown-display` is installed;
 * otherwise falls back to plain text with light markdown stripping.
 */
export function AiMarkdownText({ children, style }: AiMarkdownTextProps) {
  const theme = useAiTheme();

  const flatStyle = StyleSheet.flatten(style);
  const markdownStyles = useMemo(
    () => ({
      body: {
        color: theme.colors.text.DEFAULT,
        fontSize: fontSize.sm,
        lineHeight: 20,
        fontFamily: theme.fontFamily.regular,
        ...flatStyle,
      },
      strong: { fontFamily: theme.fontFamily.semibold },
      em: { fontStyle: 'italic' as const },
      link: { color: theme.colors.primary.DEFAULT },
      code_inline: {
        backgroundColor: theme.colors.surface.code,
        fontFamily: theme.fontFamily.mono,
        fontSize: fontSize.xs,
      },
      fence: {
        backgroundColor: theme.colors.surface.code,
        fontFamily: theme.fontFamily.mono,
        borderColor: theme.colors.border.DEFAULT,
        padding: 8,
        borderRadius: 8,
      },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
    }),
    [theme, flatStyle]
  );

  if (Markdown) {
    return <Markdown style={markdownStyles}>{children}</Markdown>;
  }

  return (
    <Text style={[styles.fallback, { color: theme.colors.text.DEFAULT }, style]}>
      {stripSimpleMarkdown(children)}
    </Text>
  );
}

export function isMarkdownRendererAvailable(): boolean {
  return Markdown != null;
}

const styles = StyleSheet.create({
  fallback: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
