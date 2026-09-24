import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Keyboard, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  BottomSheetFlatList,
  BottomSheetTextInput,
  type BottomSheetFlatListMethods,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiQuickAskSession } from './aiQuickAskContext';
import { AiMessageBubble } from '../components/AiMessageBubble';
import { AiSuggestionGrid } from '../components/AiSuggestionGrid';
import { AiChatInput } from '../components/AiChatInput';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useScreenBottomKeyboardLift } from '../hooks/useScreenBottomKeyboardLift';
import { spacing, fontSize } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiSuggestion } from '../types/aiContext';
import type { AiChatMessage } from '../types/aiChat';

export const AI_QUICK_ASK_INPUT_OVERLAY_HEIGHT = 96;

export interface AiQuickAskMessagesProps {
  suggestions?: AiSuggestion[];
  header?: React.ReactElement | null;
}

export const AiQuickAskMessages: React.FC<AiQuickAskMessagesProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  header = null,
}) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const { chat } = useAiQuickAskSession();
  const { messages, isStreaming, error, sendMessage, regenerateLastResponse } = chat;
  const listRef = useRef<BottomSheetFlatListMethods>(null);
  const nearBottomRef = useRef(true);
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  const scrollToEnd = useCallback((force = false) => {
    if (!force && !nearBottomRef.current) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    nearBottomRef.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 96;
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => scrollToEnd(true));
    return () => sub.remove();
  }, [scrollToEnd]);

  const handleSuggestion = useCallback(
    (suggestion: AiSuggestion) => {
      void sendMessage(suggestion.prompt);
      scrollToEnd();
    },
    [sendMessage, scrollToEnd]
  );

  const showEmptyWelcome = messages.length === 0 && !isStreaming;

  const listFooter = useMemo(
    () => (
      <View>
        {messages.length === 0 && !isStreaming ? (
          <View style={styles.suggestionsWrap}>
            <AiSuggestionGrid
              suggestions={suggestions.slice(0, 4)}
              onSelect={handleSuggestion}
            />
          </View>
        ) : null}
        {error ? (
          <AiText style={[styles.error, { color: theme.colors.error.DEFAULT }]}>{error}</AiText>
        ) : null}
      </View>
    ),
    [error, handleSuggestion, isStreaming, messages.length, suggestions, theme.colors.error.DEFAULT]
  );

  return (
    <BottomSheetFlatList<AiChatMessage>
      ref={listRef}
      style={styles.list}
      data={messages}
      keyExtractor={(item: AiChatMessage) => item.id}
      renderItem={({ item }: { item: AiChatMessage }) => (
        <AiMessageBubble
          message={item}
          showRegenerate={!isStreaming && item.role === 'assistant' && item.id === lastAssistantId}
          onRegenerate={() => {
            void regenerateLastResponse();
            scrollToEnd();
          }}
        />
      )}
      ListHeaderComponent={header}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: AI_QUICK_ASK_INPUT_OVERLAY_HEIGHT },
      ]}
      onScrollEndDrag={handleScroll}
      onMomentumScrollEnd={handleScroll}
      onContentSizeChange={() => scrollToEnd()}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator
      nestedScrollEnabled
      bounces
      ListFooterComponent={listFooter}
      ListEmptyComponent={
        showEmptyWelcome ? (
          <View style={styles.emptyWelcome}>
            <AiText weight="semibold" style={{ textAlign: 'center' }}>
              {strings.welcomeTitle}
            </AiText>
            <AiText
              style={{
                color: theme.colors.text[500],
                textAlign: 'center',
                marginTop: spacing[1],
              }}
            >
              {strings.welcomeSubtitle}
            </AiText>
          </View>
        ) : (
          <AiText
            style={{ color: theme.colors.text[500], textAlign: 'center', padding: spacing[4] }}
          >
            {strings.preparingReply}
          </AiText>
        )
      }
    />
  );
};

export const AiBottomSheetChatInput: React.FC<{
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onStop?: () => void;
}> = ({ onSend, disabled, placeholder, isStreaming, onStop }) => (
  <AiChatInput
    onSend={onSend}
    disabled={disabled}
    placeholder={placeholder}
    isStreaming={isStreaming}
    onStop={onStop}
    TextInputComponent={BottomSheetTextInput as never}
  />
);

export const AiQuickAskInputOverlay: React.FC = () => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const { isActive, chat } = useAiQuickAskSession();
  const { isStreaming, sendMessage, cancelStreaming } = chat;
  const keyboardLiftStyle = useScreenBottomKeyboardLift(isActive);

  if (!isActive) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.overlayRoot, keyboardLiftStyle]}>
      <View
        pointerEvents="auto"
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.colors.bg.DEFAULT,
            paddingBottom: Math.max(insets.bottom, spacing[2]),
            borderTopColor: theme.colors.border.DEFAULT,
          },
        ]}
      >
        <AiChatInput
          onSend={text => {
            void sendMessage(text);
          }}
          isStreaming={isStreaming}
          onStop={cancelStreaming}
          placeholder={strings.continuePlaceholder}
        />
        <AiText style={[styles.disclaimer, { color: theme.colors.text[400] }]}>
          {strings.disclaimer}
        </AiText>
      </View>
      <View
        pointerEvents="none"
        style={[styles.keyboardFill, { backgroundColor: theme.colors.bg.DEFAULT }]}
      />
    </Animated.View>
  );
};

/** @deprecated Use AiQuickAskInputOverlay — input lives outside the sheet. */
export const AiQuickAskInputBar = AiQuickAskInputOverlay;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: spacing[2],
  },
  suggestionsWrap: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  emptyWelcome: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  overlayRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  keyboardFill: {
    height: 420,
    marginBottom: -420,
  },
  inputBar: {
    paddingTop: spacing[2],
    gap: spacing[1.5],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    fontSize: fontSize.xxs,
  },
});
