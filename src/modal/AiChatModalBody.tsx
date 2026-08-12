import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiChatModalSession } from './aiChatModalContext';
import { AiMessageBubble } from '../components/AiMessageBubble';
import { AiSuggestionGrid } from '../components/AiSuggestionGrid';
import { AiChatInput } from '../components/AiChatInput';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import {
  chatInputBottomPadding,
  useKeyboardBottomInset,
} from '../hooks/useKeyboardBottomInset';
import { spacing, fontSize } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiSuggestion } from '../types/aiContext';
import type { AiChatMessage } from '../types/aiChat';

export interface AiChatModalBodyProps {
  suggestions?: AiSuggestion[];
  onOpenFullPage?: () => void;
  title?: string;
  onClose: () => void;
  /** When false, header is omitted (parent chrome owns it). Default true. */
  showHeader?: boolean;
}

/** Chat body rendered inside the modal surface (no gorhom). */
export function AiChatModalBody({
  suggestions = DEFAULT_SUGGESTIONS,
  onOpenFullPage,
  title: titleProp,
  onClose,
  showHeader = true,
}: AiChatModalBodyProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const title = titleProp ?? strings.assistantTitle;
  const { chat } = useAiChatModalSession();
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    regenerateLastResponse,
    cancelStreaming,
  } = chat;

  const listRef = useRef<FlatList<AiChatMessage>>(null);
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, scrollToEnd);
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
    <View style={[styles.root, { backgroundColor: theme.colors.bg.DEFAULT }]}>
      {showHeader ? (
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, spacing[3]),
              borderBottomColor: theme.colors.border.DEFAULT,
            },
          ]}
        >
          <AiText weight="semibold">{title}</AiText>
          <View style={styles.headerActions}>
            {onOpenFullPage ? (
              <Pressable
                onPress={onOpenFullPage}
                hitSlop={8}
                accessibilityLabel={strings.accessibilityExpand}
              >
                <Ionicons name="expand-outline" size={22} color={theme.colors.primary.DEFAULT} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={strings.accessibilityClose}>
              <Ionicons name="close" size={22} color={theme.colors.text[500]} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AiMessageBubble
            message={item}
            showRegenerate={
              !isStreaming && item.role === 'assistant' && item.id === lastAssistantId
            }
            onRegenerate={() => {
              void regenerateLastResponse();
              scrollToEnd();
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: showHeader
              ? chatInputBottomPadding(keyboardHeight, insets.bottom, spacing[2])
              : chatInputBottomPadding(keyboardHeight, 0, spacing[2]),
            borderTopColor: theme.colors.border.DEFAULT,
            backgroundColor: theme.colors.bg.DEFAULT,
          },
        ]}
      >
        <AiChatInput
          onSend={text => {
            void sendMessage(text);
            scrollToEnd();
          }}
          isStreaming={isStreaming}
          onStop={cancelStreaming}
          placeholder={strings.continuePlaceholder}
        />
        <AiText style={[styles.disclaimer, { color: theme.colors.text[400] }]}>
          {strings.disclaimer}
        </AiText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  list: { flex: 1 },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  suggestionsWrap: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  error: { textAlign: 'center', marginBottom: spacing[1] },
  emptyWelcome: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
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
