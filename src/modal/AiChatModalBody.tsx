import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiChatModal } from './aiChatModalContext';
import { AiChatFooter } from '../components/AiChatFooter';
import { AiConversationView } from '../components/AiConversationView';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { DEFAULT_SUGGESTIONS } from '../constants/aiAssistant.constants';
import type { AiSuggestion } from '../types/aiContext';

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
  const title = titleProp ?? strings.assistantTitle;
  const { controller } = useAiChatModal();

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
          <AiText weight="semibold" accessibilityRole="header">
            {title}
          </AiText>
          <View style={styles.headerActions}>
            {onOpenFullPage ? (
              <Pressable
                onPress={onOpenFullPage}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={strings.accessibilityExpand}
              >
                <Ionicons name="expand-outline" size={22} color={theme.colors.primary.DEFAULT} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={strings.accessibilityClose}
            >
              <Ionicons name="close" size={22} color={theme.colors.text[500]} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <AiConversationView
        controller={controller}
        suggestions={suggestions}
        emptyVariant="compact"
        contentContainerStyle={styles.listContent}
      />

      <AiChatFooter
        controller={controller}
        placeholder={strings.continuePlaceholder}
        bordered
        bottomPadding={showHeader ? Math.max(insets.bottom, spacing[2]) : spacing[2]}
      />
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
  listContent: {
    flexGrow: 1,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
});
