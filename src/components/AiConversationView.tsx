import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { AiChatController } from '../core/AiChatController';
import { useAiChatState } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import type { AiSuggestion } from '../types/aiContext';
import { AiEmptyStateSlot, type AiEmptyStateProps } from './AiEmptyState';
import { AiMessageList, type AiMessageListProps } from './AiMessageList';

export interface AiConversationViewProps extends Pick<
  AiMessageListProps,
  | 'ListHeaderComponent'
  | 'FlatListComponent'
  | 'showScrollToBottomButton'
  | 'contentContainerStyle'
  | 'listProps'
> {
  controller: AiChatController;
  suggestions: AiSuggestion[];
  /** Empty-state layout; see `AiEmptyState`. Default `full`. */
  emptyVariant?: AiEmptyStateProps['variant'];
}

/** Loading, empty and message states of one conversation. */
export function AiConversationView({
  controller,
  suggestions,
  emptyVariant = 'full',
  ListHeaderComponent,
  ...listProps
}: AiConversationViewProps) {
  const theme = useAiTheme();
  const { messages, isStreaming, isLoadingHistory } = useAiChatState(controller);

  const handleSelectSuggestion = useCallback(
    (suggestion: AiSuggestion) => {
      void controller.sendMessage(suggestion.prompt);
    },
    [controller]
  );

  if (isLoadingHistory && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  const emptyState = (
    <AiEmptyStateSlot
      suggestions={suggestions}
      onSelectSuggestion={handleSelectSuggestion}
      variant={emptyVariant}
    />
  );

  // The full-page empty state is its own scroll view; compact ones live inside the list.
  if (messages.length === 0 && emptyVariant === 'full' && !ListHeaderComponent) {
    return emptyState;
  }

  return (
    <AiMessageList
      {...listProps}
      messages={messages}
      isStreaming={isStreaming}
      onRegenerate={controller.regenerateLastResponse}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyState}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
