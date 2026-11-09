import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { radius, spacing } from '../theme/tokens';
import type { AiSuggestion } from '../types/aiContext';
import { AiText } from './AiText';

export interface AiFollowUpSuggestionsProps {
  suggestions: AiSuggestion[];
  onSelect: (suggestion: AiSuggestion) => void;
}

/** Follow-up prompt chips under an assistant reply. */
export function AiFollowUpSuggestions({ suggestions, onSelect }: AiFollowUpSuggestionsProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.row} accessibilityLabel={strings.followUpSuggestions}>
      {suggestions.map(suggestion => (
        <Pressable
          key={suggestion.id}
          onPress={() => onSelect(suggestion)}
          accessibilityRole="button"
          style={[
            styles.chip,
            {
              borderColor: theme.colors.primary.DEFAULT,
              backgroundColor: theme.colors.primary.subtle,
            },
          ]}
        >
          <AiText variant="caption" weight="medium" style={{ color: theme.colors.primary.DEFAULT }}>
            {suggestion.label}
          </AiText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
});
