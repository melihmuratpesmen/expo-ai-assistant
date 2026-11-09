import React from 'react';
import { StyleSheet, type TextInputProps } from 'react-native';
import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { useAiQuickAsk } from './aiQuickAskContext';
import { AiChatInput, type AiChatInputProps } from '../components/AiChatInput';
import { AiConversationView } from '../components/AiConversationView';
import type { AiMessageListProps } from '../components/AiMessageList';
import { spacing } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiSuggestion } from '../types/aiContext';

/** Bottom padding that keeps the last message clear of the sheet footer. */
export const AI_QUICK_ASK_INPUT_OVERLAY_HEIGHT = 112;

export const AiBottomSheetTextInput =
  BottomSheetTextInput as unknown as React.ComponentType<TextInputProps>;

export interface AiQuickAskMessagesProps {
  suggestions?: AiSuggestion[];
  header?: React.ReactElement | null;
}

const sheetListProps: AiMessageListProps['listProps'] = {
  nestedScrollEnabled: true,
  bounces: true,
  showsVerticalScrollIndicator: true,
};

// Keeps the header (title, expand, close) reachable in long conversations.
const stickyHeaderListProps: AiMessageListProps['listProps'] = {
  ...sheetListProps,
  stickyHeaderIndices: [0],
};

/** Message list for the quick-ask sheet; must be rendered inside the gorhom `BottomSheet`. */
export const AiQuickAskMessages: React.FC<AiQuickAskMessagesProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  header = null,
}) => {
  const { controller } = useAiQuickAsk();
  return (
    <AiConversationView
      controller={controller}
      suggestions={suggestions}
      emptyVariant="compact"
      ListHeaderComponent={header}
      FlatListComponent={BottomSheetFlatList as unknown as AiMessageListProps['FlatListComponent']}
      // The sheet needs the scrollable as a direct child to keep its pan gestures.
      showScrollToBottomButton={false}
      contentContainerStyle={styles.listContent}
      listProps={header ? stickyHeaderListProps : sheetListProps}
    />
  );
};

/** `AiChatInput` wired to gorhom's keyboard-aware text input. */
export const AiBottomSheetChatInput: React.FC<
  Omit<AiChatInputProps, 'TextInputComponent'>
> = props => <AiChatInput {...props} TextInputComponent={AiBottomSheetTextInput} />;

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 0,
    paddingBottom: AI_QUICK_ASK_INPUT_OVERLAY_HEIGHT + spacing[2],
  },
});
