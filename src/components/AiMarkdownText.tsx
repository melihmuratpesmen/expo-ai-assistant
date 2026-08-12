import React, { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { fontSize } from '../theme/tokens';

type MarkdownComponent = React.ComponentType<{
  children: string;
  style?: Record<string, StyleProp<TextStyle>>;
}>;

let Markdown: MarkdownComponent | null = null;
let markdownResolved = false;

function resolveMarkdown(): MarkdownComponent | null {
  if (markdownResolved) return Markdown;
  markdownResolved = true;
  try {
    // Optional peer — only loads when installed by the host app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-markdown-display');
    Markdown = (mod.default ?? mod) as MarkdownComponent;
  } catch {
    Markdown = null;
  }
  return Markdown;
}

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
  const MarkdownView = resolveMarkdown();

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: theme.colors.text.DEFAULT,
        fontSize: fontSize.sm,
        lineHeight: 20,
        fontFamily: theme.fontFamily.regular,
      },
      strong: { fontFamily: theme.fontFamily.semibold },
      em: { fontStyle: 'italic' as const },
      link: { color: theme.colors.primary.DEFAULT },
      code_inline: {
        backgroundColor: theme.meta.isDark ? '#111827' : '#F3F4F6',
        fontFamily: theme.fontFamily.regular,
        fontSize: fontSize.xs,
      },
      fence: {
        backgroundColor: theme.meta.isDark ? '#111827' : '#F3F4F6',
        borderColor: theme.colors.border.DEFAULT,
        padding: 8,
        borderRadius: 8,
      },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
    }),
    [theme]
  );

  if (MarkdownView) {
    return <MarkdownView style={markdownStyles}>{children}</MarkdownView>;
  }

  return (
    <Text style={[styles.fallback, { color: theme.colors.text.DEFAULT }, style]}>
      {stripSimpleMarkdown(children)}
    </Text>
  );
}

export function isMarkdownRendererAvailable(): boolean {
  return resolveMarkdown() != null;
}

const styles = StyleSheet.create({
  fallback: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
