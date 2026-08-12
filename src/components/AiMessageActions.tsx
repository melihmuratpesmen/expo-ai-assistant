import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { copyTextToClipboard } from '../lib/clipboard';
import { AiText } from './AiText';
import type { AiChatMessage } from '../types/aiChat';

export interface AiMessageActionsProps {
  message: AiChatMessage;
  /** Show regenerate for the latest assistant message. */
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}

export function AiMessageActions({
  message,
  showRegenerate = false,
  onRegenerate,
}: AiMessageActionsProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(message.content);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [message.content]);

  if (message.status === 'streaming') return null;
  if (!message.content?.trim() && !showRegenerate) return null;

  return (
    <View style={styles.row}>
      {message.content?.trim() ? (
        <Pressable
          onPress={() => {
            void handleCopy();
          }}
          hitSlop={8}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={strings.copy}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={14}
            color={copied ? theme.colors.success.DEFAULT : theme.colors.text[500]}
          />
          <AiText
            variant="caption"
            style={{ color: copied ? theme.colors.success.DEFAULT : theme.colors.text[500] }}
          >
            {copied ? strings.copied : strings.copy}
          </AiText>
        </Pressable>
      ) : null}

      {showRegenerate && onRegenerate ? (
        <Pressable
          onPress={onRegenerate}
          hitSlop={8}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={strings.regenerate}
        >
          <Ionicons name="refresh-outline" size={14} color={theme.colors.text[500]} />
          <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
            {strings.regenerate}
          </AiText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[0.5],
  },
});
