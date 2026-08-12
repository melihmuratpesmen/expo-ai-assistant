import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { spacing, radius, fontSize } from '../theme/tokens';
import type { AiSuggestion } from '../types/aiContext';
import { AiText } from './AiText';

interface AiSuggestionGridProps {
  suggestions: AiSuggestion[];
  onSelect: (suggestion: AiSuggestion) => void;
}

export const AiSuggestionGrid: React.FC<AiSuggestionGridProps> = ({ suggestions, onSelect }) => {
  const theme = useAiTheme();
  const { isDark } = theme.meta;

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.grid}>
      {suggestions.map(suggestion => (
        <Pressable
          key={suggestion.id}
          onPress={() => onSelect(suggestion)}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: theme.colors.border.DEFAULT,
            },
          ]}
        >
          {suggestion.icon ? (
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary.subtle }]}>
              <Ionicons
                name={suggestion.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={theme.colors.primary.DEFAULT}
              />
            </View>
          ) : null}
          <AiText
            variant="body"
            weight="medium"
            numberOfLines={2}
            style={[styles.label, { color: theme.colors.text.DEFAULT }]}
          >
            {suggestion.label}
          </AiText>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  card: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[3.5],
    minHeight: 88,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  label: {
    fontSize: fontSize.sm,
  },
});
