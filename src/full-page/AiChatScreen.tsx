import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAiChatController } from '../hooks/useAiChat';
import { AiChatFooter } from '../components/AiChatFooter';
import { AiConversationView } from '../components/AiConversationView';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiSuggestion } from '../types/aiContext';

export interface AiChatScreenProps {
  /** Persisted conversation to open (loaded through `transport.getHistory`). */
  conversationId?: string | null;
  suggestions?: AiSuggestion[];
  title?: string;
  onBackPress?: () => void;
  onOpenHistory?: () => void;
  /** Space below the screen (e.g. a tab bar) that the keyboard lift should account for. */
  bottomInset?: number;
  /** Share the conversation with other surfaces using the same id. */
  chatId?: string;
}

export function AiChatScreen({
  conversationId = null,
  suggestions = DEFAULT_SUGGESTIONS,
  title: titleProp,
  onBackPress,
  onOpenHistory,
  bottomInset = 0,
  chatId,
}: AiChatScreenProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const controller = useAiChatController({ conversationId, chatId });
  const title = titleProp ?? strings.assistantTitle;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.DEFAULT }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, borderBottomColor: theme.colors.border.DEFAULT },
        ]}
      >
        <View style={styles.headerLeft}>
          {onBackPress ? (
            <Pressable
              onPress={onBackPress}
              hitSlop={8}
              style={styles.headerIcon}
              accessibilityRole="button"
              accessibilityLabel={strings.accessibilityBack}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text.DEFAULT} />
            </Pressable>
          ) : null}
          <AiText variant="title" weight="semibold" accessibilityRole="header">
            {title}
          </AiText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={controller.startNewConversation}
            hitSlop={8}
            style={styles.headerIcon}
            accessibilityRole="button"
            accessibilityLabel={strings.newConversation}
          >
            <Ionicons name="create-outline" size={22} color={theme.colors.text.DEFAULT} />
          </Pressable>
          {onOpenHistory ? (
            <Pressable
              onPress={onOpenHistory}
              hitSlop={8}
              style={styles.headerIcon}
              accessibilityRole="button"
              accessibilityLabel={strings.historyTitle}
            >
              <Ionicons name="time-outline" size={22} color={theme.colors.text.DEFAULT} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.flex}>
        <AiConversationView
          controller={controller}
          suggestions={suggestions}
          emptyVariant="full"
          contentContainerStyle={styles.listContent}
        />
      </View>

      <AiChatFooter controller={controller} bottomInset={bottomInset} />
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
  listContent: { paddingVertical: spacing[3] },
});
