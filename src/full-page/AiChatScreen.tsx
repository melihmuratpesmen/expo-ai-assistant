import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAiChat } from '../hooks/useAiChat';
import { AiMessageBubble } from '../components/AiMessageBubble';
import { AiSuggestionGrid } from '../components/AiSuggestionGrid';
import { AiChatInput } from '../components/AiChatInput';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useAiSlots } from '../provider/slots';
import { spacing, fontSize } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiChatMessage } from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';

export interface AiChatScreenProps {
  conversationId?: string | null;
  suggestions?: AiSuggestion[];
  title?: string;
  onBackPress?: () => void;
  onOpenHistory?: () => void;
  bottomInset?: number;
}

export function AiChatScreen({
  conversationId = null,
  suggestions = DEFAULT_SUGGESTIONS,
  title: titleProp,
  onBackPress,
  onOpenHistory,
  bottomInset = 0,
}: AiChatScreenProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const slots = useAiSlots();
  const insets = useSafeAreaInsets();
  const title = titleProp ?? strings.assistantTitle;
  const {
    messages,
    isStreaming,
    isLoadingHistory,
    error,
    sendMessage,
    regenerateLastResponse,
    startNewConversation,
    cancelStreaming,
  } = useAiChat({ conversationId });

  const listRef = useRef<FlatList<AiChatMessage>>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, scrollToEnd);
    return () => sub.remove();
  }, [scrollToEnd]);

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text);
      scrollToEnd();
    },
    [sendMessage, scrollToEnd]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: AiSuggestion) => {
      handleSend(suggestion.prompt);
    },
    [handleSend]
  );

  const isEmpty = messages.length === 0 && !isLoadingHistory;

  const defaultEmpty = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.emptyContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.welcomeIcon, { backgroundColor: theme.colors.primary.subtle }]}>
        <Ionicons name="sparkles" size={28} color={theme.colors.primary.DEFAULT} />
      </View>
      <AiText variant="title" weight="semibold" style={styles.welcomeTitle}>
        {strings.welcomeTitle}
      </AiText>
      <AiText style={[styles.welcomeSubtitle, { color: theme.colors.text[500] }]}>
        {strings.welcomeSubtitle}
      </AiText>
      <AiSuggestionGrid suggestions={suggestions} onSelect={handleSelectSuggestion} />
    </ScrollView>
  );

  const emptyContent =
    slots.renderEmpty?.({
      suggestions,
      onSelectSuggestion: handleSelectSuggestion,
    }) ?? defaultEmpty;

  const inputContent =
    slots.renderInput?.({
      onSend: handleSend,
      disabled: false,
      isStreaming,
      onStop: cancelStreaming,
    }) ?? (
      <AiChatInput
        onSend={handleSend}
        disabled={false}
        isStreaming={isStreaming}
        onStop={cancelStreaming}
      />
    );

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.DEFAULT }]}>
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: theme.colors.border.DEFAULT }]}>
        <View style={styles.headerLeft}>
          {onBackPress ? (
            <Pressable onPress={onBackPress} hitSlop={8} style={styles.headerIcon}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text.DEFAULT} />
            </Pressable>
          ) : null}
          <AiText variant="title" weight="semibold">
            {title}
          </AiText>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={startNewConversation} hitSlop={8} style={styles.headerIcon}>
            <Ionicons name="create-outline" size={22} color={theme.colors.text.DEFAULT} />
          </Pressable>
          {onOpenHistory ? (
            <Pressable onPress={onOpenHistory} hitSlop={8} style={styles.headerIcon}>
              <Ionicons name="time-outline" size={22} color={theme.colors.text.DEFAULT} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.flex}>
        {isLoadingHistory ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary.DEFAULT} />
          </View>
        ) : isEmpty ? (
          emptyContent
        ) : (
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) =>
              slots.renderMessage ? (
                <>{slots.renderMessage(item)}</>
              ) : (
                <AiMessageBubble
                  message={item}
                  showRegenerate={!isStreaming && item.role === 'assistant' && item.id === lastAssistantId}
                  onRegenerate={() => {
                    void regenerateLastResponse();
                    scrollToEnd();
                  }}
                />
              )
            }
            contentContainerStyle={styles.listContent}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {error ? (
        <AiText style={[styles.error, { color: theme.colors.error.DEFAULT }]}>{error}</AiText>
      ) : null}

      <View style={{ paddingBottom: Math.max(insets.bottom, spacing[2]) + bottomInset }}>
        {inputContent}
        <AiText style={[styles.disclaimer, { color: theme.colors.text[400] }]}>
          {strings.disclaimer}
        </AiText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerIcon: { padding: spacing[1] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  welcomeTitle: { textAlign: 'center' },
  welcomeSubtitle: { textAlign: 'center', marginBottom: spacing[3] },
  listContent: { paddingVertical: spacing[3] },
  error: { textAlign: 'center', marginBottom: spacing[1], fontSize: fontSize.xs },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[1.5],
    fontSize: fontSize.xxs,
  },
});
