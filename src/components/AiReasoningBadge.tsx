import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { fontSize, radius, spacing } from '../theme/tokens';
import { AiText } from './AiText';

export interface AiReasoningBadgeProps {
  reasoning: string;
  /** Expand by default while streaming. */
  defaultExpanded?: boolean;
}

export function AiReasoningBadge({
  reasoning,
  defaultExpanded = false,
}: AiReasoningBadgeProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!reasoning.trim()) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.meta.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={strings.reasoning}
      >
        <Ionicons name="sparkles-outline" size={14} color={theme.colors.text[500]} />
        <AiText variant="caption" style={{ color: theme.colors.text[500], flex: 1 }}>
          {strings.reasoning}
        </AiText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={theme.colors.text[500]}
        />
      </Pressable>
      {expanded ? (
        <AiText variant="caption" style={[styles.body, { color: theme.colors.text[500] }]}>
          {reasoning}
        </AiText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  body: {
    paddingHorizontal: spacing[2.5],
    paddingBottom: spacing[2.5],
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});
