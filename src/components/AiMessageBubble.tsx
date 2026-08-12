import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiSlots } from '../provider/slots';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius, fontSize } from '../theme/tokens';
import type { AiChatMessage } from '../types/aiChat';
import { AiFunctionCallCard } from './AiFunctionCallCard';
import { AiMessageContent } from './AiMessageContent';
import { AiMarkdownText } from './AiMarkdownText';
import { AiTypingIndicator } from './AiTypingIndicator';
import { AiMessageActions } from './AiMessageActions';
import { AiReasoningBadge } from './AiReasoningBadge';
import { AiText } from './AiText';

interface AiMessageBubbleProps {
  message: AiChatMessage;
  /** Show regenerate control (typically last assistant message). */
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}

function computeTrailingText(content: string, hasBlocks: boolean): string | undefined {
  if (!hasBlocks || !content) return undefined;
  const lastNewline = content.lastIndexOf('\n');
  const tail = content.substring(lastNewline + 1).trim();
  return tail.length > 0 ? tail : undefined;
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  message,
  showRegenerate = false,
  onRegenerate,
}) => {
  const theme = useAiTheme();
  const slots = useAiSlots();
  const strings = useAiStrings();
  const { isDark } = theme.meta;

  if (slots.renderMessage) {
    return <>{slots.renderMessage(message)}</>;
  }

  const isUser = message.role === 'user';
  const hasFunctionCalls = !!message.functionCalls?.length;
  const hasBlocks = !!message.blocks?.length;
  const hasText = !!message.content?.trim();
  const hasReasoning = !!message.reasoning?.trim();
  const showTypingDots =
    !isUser && message.status === 'streaming' && !hasText && !hasBlocks && !hasFunctionCalls;
  const isWide = hasFunctionCalls || hasBlocks;
  const trailingText =
    message.status === 'streaming' ? computeTrailingText(message.content, hasBlocks) : undefined;

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={styles.userColumn}>
          <View
            style={[
              styles.bubble,
              styles.userBubble,
              { backgroundColor: theme.colors.primary.DEFAULT },
            ]}
          >
            <AiText
              variant="body"
              style={[styles.text, { color: theme.colors.primary.onPrimary }]}
            >
              {message.content}
            </AiText>
          </View>
          <AiMessageActions message={message} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <View style={[styles.avatar, { backgroundColor: theme.colors.primary.subtle }]}>
        <Ionicons name="sparkles" size={16} color={theme.colors.primary.DEFAULT} />
      </View>
      <View style={[styles.assistantColumn, isWide && styles.assistantColumnWide]}>
        {hasReasoning ? (
          <AiReasoningBadge
            reasoning={message.reasoning!}
            defaultExpanded={message.status === 'streaming'}
          />
        ) : null}

        {(hasText || hasBlocks || showTypingDots) && (
          <View
            style={[
              styles.bubble,
              styles.assistantBubble,
              isWide && styles.assistantBubbleWide,
              {
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                borderColor:
                  message.status === 'error' ? theme.colors.error.DEFAULT : 'transparent',
                borderWidth: message.status === 'error' ? 1 : 0,
              },
            ]}
          >
            {showTypingDots ? (
              <AiTypingIndicator />
            ) : hasBlocks ? (
              slots.renderContentBlocks ? (
                <>{slots.renderContentBlocks(message.blocks!, trailingText)}</>
              ) : (
                <AiMessageContent blocks={message.blocks!} trailingText={trailingText} />
              )
            ) : (
              <AiMarkdownText style={[styles.text, { color: theme.colors.text.DEFAULT }]}>
                {message.content}
              </AiMarkdownText>
            )}
          </View>
        )}

        {message.status === 'stopped' ? (
          <AiText variant="caption" style={{ color: theme.colors.text[400] }}>
            {strings.stoppedGenerating}
          </AiText>
        ) : null}

        {hasFunctionCalls && (
          <View style={styles.functionCalls}>
            {message.functionCalls!.map(fc =>
              slots.renderFunctionCall ? (
                <React.Fragment key={fc.id}>{slots.renderFunctionCall(fc)}</React.Fragment>
              ) : (
                <AiFunctionCallCard key={fc.id} functionCall={fc} />
              )
            )}
          </View>
        )}

        <AiMessageActions
          message={message}
          showRegenerate={showRegenerate}
          onRegenerate={onRegenerate}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  userColumn: {
    maxWidth: '80%',
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
    marginTop: 2,
  },
  assistantColumn: {
    flex: 1,
    maxWidth: '80%',
    gap: spacing[2],
  },
  assistantColumnWide: {
    maxWidth: '92%',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderRadius: radius['2xl'],
    flexGrow: 0,
  },
  userBubble: {
    maxWidth: '100%',
    borderBottomRightRadius: radius.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
    flexGrow: 0,
  },
  assistantBubbleWide: {
    maxWidth: '100%',
  },
  functionCalls: {
    gap: spacing[2],
    width: '100%',
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
