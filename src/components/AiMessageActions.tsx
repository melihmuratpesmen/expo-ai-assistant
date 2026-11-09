import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { copyTextToClipboard } from '../lib/clipboard';
import { AiText } from './AiText';
import type { AiChatMessage, AiMessageFeedback } from '../types/aiChat';

export interface AiMessageActionsProps {
  message: AiChatMessage;
  /** Show regenerate (or retry, for a failed reply) on the latest assistant message. */
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  /** Shows "Edit" on user messages. */
  onEdit?: (message: AiChatMessage) => void;
  /** Shows 👍 / 👎 on assistant messages. */
  onFeedback?: (message: AiChatMessage, feedback: AiMessageFeedback) => void;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function ActionButton({
  icon,
  label,
  color,
  onPress,
  showLabel = true,
  selected,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  showLabel?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      <Ionicons name={icon} size={14} color={color} />
      {showLabel ? (
        <AiText variant="caption" style={{ color }}>
          {label}
        </AiText>
      ) : null}
    </Pressable>
  );
}

export function AiMessageActions({
  message,
  showRegenerate = false,
  onRegenerate,
  onEdit,
  onFeedback,
}: AiMessageActionsProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(message.content);
    if (!ok) return;
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1200);
  }, [message.content]);

  if (message.status === 'streaming') return null;

  const muted = theme.colors.text[500];
  const hasText = !!message.content?.trim();
  const isUser = message.role === 'user';
  const canRegenerate = showRegenerate && !!onRegenerate;
  const canEdit = isUser && !!onEdit;
  const canRate = !isUser && !!onFeedback && hasText && message.status !== 'error';
  if (!hasText && !canRegenerate && !canEdit) return null;

  const failed = message.status === 'error';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {hasText ? (
        <ActionButton
          icon={copied ? 'checkmark' : 'copy-outline'}
          label={copied ? strings.copied : strings.copy}
          color={copied ? theme.colors.success.DEFAULT : muted}
          onPress={() => void handleCopy()}
        />
      ) : null}

      {canEdit ? (
        <ActionButton
          icon="create-outline"
          label={strings.edit}
          color={muted}
          onPress={() => onEdit(message)}
        />
      ) : null}

      {canRegenerate ? (
        <ActionButton
          icon={failed ? 'reload-outline' : 'refresh-outline'}
          label={failed ? strings.retry : strings.regenerate}
          color={failed ? theme.colors.error.DEFAULT : muted}
          onPress={onRegenerate}
        />
      ) : null}

      {canRate ? (
        <>
          <ActionButton
            icon={message.feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
            label={strings.feedbackGood}
            color={message.feedback === 'up' ? theme.colors.primary.DEFAULT : muted}
            onPress={() => onFeedback(message, 'up')}
            showLabel={false}
            selected={message.feedback === 'up'}
          />
          <ActionButton
            icon={message.feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
            label={strings.feedbackBad}
            color={message.feedback === 'down' ? theme.colors.primary.DEFAULT : muted}
            onPress={() => onFeedback(message, 'down')}
            showLabel={false}
            selected={message.feedback === 'down'}
          />
        </>
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
  rowUser: {
    justifyContent: 'flex-end',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[0.5],
  },
});
