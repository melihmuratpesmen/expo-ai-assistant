import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiChat } from '../hooks/useAiChat';
import { AiMessageBubble } from '../components/AiMessageBubble';
import { AiChatInput } from '../components/AiChatInput';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius } from '../theme/tokens';
import type { AiChatMessage } from '../types/aiChat';
import type { AiButtonPoint } from './aiButtonPosition';
import { AI_BUTTON_SIZE } from './aiButtonPosition';

const PANEL_WIDTH = Math.min(360, Dimensions.get('window').width - 32);
const PANEL_HEIGHT = 420;

export interface AiFloatingChatPanelProps {
  visible: boolean;
  anchor: AiButtonPoint;
  initialMessage?: string | null;
  onClose: () => void;
  onExpandFullPage?: (conversationId: string | null) => void;
}

/**
 * Self-contained floating chat surface — no bottom-sheet / gorhom dependency.
 */
export function AiFloatingChatPanel({
  visible,
  anchor,
  initialMessage,
  onClose,
  onExpandFullPage,
}: AiFloatingChatPanelProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const chat = useAiChat();
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    regenerateLastResponse,
    startNewConversation,
    cancelStreaming,
    conversationId,
  } = chat;
  const listRef = useRef<FlatList<AiChatMessage>>(null);
  const sentInitialRef = useRef(false);
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  useEffect(() => {
    if (!visible) {
      sentInitialRef.current = false;
      return;
    }
    startNewConversation();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible || !initialMessage?.trim() || sentInitialRef.current) return;
    sentInitialRef.current = true;
    const timer = setTimeout(() => {
      void sendMessage(initialMessage.trim());
    }, 80);
    return () => clearTimeout(timer);
  }, [visible, initialMessage, sendMessage]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, scrollToEnd);
    return () => sub.remove();
  }, [scrollToEnd]);

  if (!visible) return null;

  const screen = Dimensions.get('window');
  const left = Math.min(
    Math.max(anchor.x + AI_BUTTON_SIZE - PANEL_WIDTH, spacing[4]),
    screen.width - PANEL_WIDTH - spacing[4]
  );
  const top = Math.max(Math.min(anchor.y - PANEL_HEIGHT - 12, screen.height - PANEL_HEIGHT - 24), 48);

  return (
    <View
      style={[
        styles.panel,
        {
          left,
          top,
          backgroundColor: theme.colors.bg.DEFAULT,
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border.DEFAULT }]}>
        <AiText weight="semibold">{strings.assistantTitle}</AiText>
        <View style={styles.headerActions}>
          {onExpandFullPage ? (
            <Pressable
              onPress={() => onExpandFullPage(conversationId)}
              hitSlop={8}
              accessibilityLabel={strings.accessibilityExpand}
            >
              <Ionicons name="expand-outline" size={20} color={theme.colors.primary.DEFAULT} />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={strings.accessibilityClose}>
            <Ionicons name="close" size={20} color={theme.colors.text[500]} />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AiMessageBubble
            message={item}
            showRegenerate={!isStreaming && item.role === 'assistant' && item.id === lastAssistantId}
            onRegenerate={() => {
              void regenerateLastResponse();
              scrollToEnd();
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AiText style={[styles.empty, { color: theme.colors.text[500] }]}>
            {strings.emptyFloatingPrompt}
          </AiText>
        }
      />

      {error ? (
        <AiText style={[styles.error, { color: theme.colors.error.DEFAULT }]}>{error}</AiText>
      ) : null}

      <View style={styles.inputWrap}>
        <AiChatInput
          onSend={text => {
            void sendMessage(text);
            scrollToEnd();
          }}
          isStreaming={isStreaming}
          onStop={cancelStreaming}
          placeholder={strings.continuePlaceholder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 58,
    elevation: 58,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing[2] },
  empty: { textAlign: 'center', padding: spacing[4] },
  error: { textAlign: 'center', paddingHorizontal: spacing[3], marginBottom: spacing[1] },
  inputWrap: { paddingBottom: spacing[2] },
});
