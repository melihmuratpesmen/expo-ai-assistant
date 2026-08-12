import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAiConversations } from '../hooks/useAiConversations';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius } from '../theme/tokens';
import type { AiConversationSummary } from '../types/aiChat';

export interface AiConversationHistoryScreenProps {
  onBackPress?: () => void;
  onOpenConversation: (conversationId: string) => void;
  title?: string;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export function AiConversationHistoryScreen({
  onBackPress,
  onOpenConversation,
  title: titleProp,
}: AiConversationHistoryScreenProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const title = titleProp ?? strings.historyTitle;
  const { conversations, isLoading, refetch, remove } = useAiConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (item: AiConversationSummary) => {
      Alert.alert(strings.deleteConversationTitle, strings.deleteConversationMessage(item.title), [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: () => {
            setDeletingId(item.id);
            void remove(item.id).finally(() => setDeletingId(null));
          },
        },
      ]);
    },
    [remove, strings]
  );

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
            <Pressable onPress={onBackPress} hitSlop={8} style={styles.headerIcon}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text.DEFAULT} />
            </Pressable>
          ) : null}
          <AiText variant="title" weight="semibold">
            {title}
          </AiText>
        </View>
      </View>

      {isLoading && conversations.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={() => {
            void refetch();
          }}
          ListEmptyComponent={
            <AiText style={[styles.empty, { color: theme.colors.text[500] }]}>
              {strings.emptyHistory}
            </AiText>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.meta.isDark ? '#1F2937' : '#FFFFFF',
                  borderColor: theme.colors.border.DEFAULT,
                },
              ]}
            >
              <Pressable
                onPress={() => onOpenConversation(item.id)}
                disabled={deletingId === item.id}
                style={styles.cardPressable}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary.subtle }]}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={theme.colors.primary.DEFAULT}
                  />
                </View>
                <View style={styles.cardBody}>
                  <AiText weight="medium" numberOfLines={1}>
                    {item.title}
                  </AiText>
                  {item.lastMessagePreview ? (
                    <AiText
                      variant="caption"
                      numberOfLines={1}
                      style={{ color: theme.colors.text[500] }}
                    >
                      {item.lastMessagePreview}
                    </AiText>
                  ) : null}
                  <AiText variant="caption" style={{ color: theme.colors.text[400] }}>
                    {formatDate(item.updatedAt)}
                  </AiText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.id}
                hitSlop={8}
                style={styles.deleteButton}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.error.DEFAULT} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error.DEFAULT} />
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  headerIcon: { padding: spacing[1] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[4], gap: spacing[3] },
  empty: { textAlign: 'center', marginTop: spacing[4] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.xl,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  cardPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  deleteButton: { paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
});
