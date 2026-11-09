import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useAiSlots } from '../provider/slots';
import { spacing } from '../theme/tokens';
import type { AiSuggestion } from '../types/aiContext';
import { AiSuggestionGrid } from './AiSuggestionGrid';
import { AiText } from './AiText';

export interface AiEmptyStateProps {
  suggestions: AiSuggestion[];
  onSelectSuggestion: (suggestion: AiSuggestion) => void;
  /**
   * `full` fills the screen with the welcome at the top and suggestions above
   * the composer; `compact` stacks both (modals, sheets); `minimal` is a single
   * prompt line (floating panel).
   */
  variant?: 'full' | 'compact' | 'minimal';
}

/** Welcome copy plus suggestion tiles for an empty conversation. */
export function AiEmptyState({
  suggestions,
  onSelectSuggestion,
  variant = 'full',
}: AiEmptyStateProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();

  if (variant === 'minimal') {
    return (
      <AiText style={[styles.minimal, { color: theme.colors.text[500] }]}>
        {strings.emptyFloatingPrompt}
      </AiText>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compact}>
        <View style={styles.compactIntro}>
          <AiText weight="semibold" style={styles.centerText}>
            {strings.welcomeTitle}
          </AiText>
          <AiText style={[styles.centerText, { color: theme.colors.text[500] }]}>
            {strings.welcomeSubtitle}
          </AiText>
        </View>
        <AiSuggestionGrid suggestions={suggestions.slice(0, 4)} onSelect={onSelectSuggestion} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.fullContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.fullIntro}>
        <View style={[styles.welcomeIcon, { backgroundColor: theme.colors.primary.subtle }]}>
          <Ionicons name="sparkles" size={28} color={theme.colors.primary.DEFAULT} />
        </View>
        <AiText variant="title" weight="semibold" style={styles.centerText}>
          {strings.welcomeTitle}
        </AiText>
        <AiText style={[styles.centerText, { color: theme.colors.text[500] }]}>
          {strings.welcomeSubtitle}
        </AiText>
      </View>
      <AiSuggestionGrid suggestions={suggestions} onSelect={onSelectSuggestion} />
    </ScrollView>
  );
}

/** `slots.renderEmpty` when provided, otherwise `AiEmptyState`. */
export function AiEmptyStateSlot(props: AiEmptyStateProps) {
  const { renderEmpty } = useAiSlots();
  if (renderEmpty) {
    return (
      <>
        {renderEmpty({
          suggestions: props.suggestions,
          onSelectSuggestion: props.onSelectSuggestion,
        })}
      </>
    );
  }
  return <AiEmptyState {...props} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  fullContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: spacing[2],
  },
  fullIntro: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  minimal: {
    textAlign: 'center',
    padding: spacing[4],
  },
  compact: {
    paddingVertical: spacing[4],
    gap: spacing[4],
  },
  compactIntro: {
    paddingHorizontal: spacing[4],
    gap: spacing[1],
  },
});
