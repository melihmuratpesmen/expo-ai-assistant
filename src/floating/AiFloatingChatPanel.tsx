import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAiChatController } from '../hooks/useAiChat';
import { AiChatFooter } from '../components/AiChatFooter';
import { AiConversationView } from '../components/AiConversationView';
import { AiText } from '../components/AiText';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useKeyboardOpenHeight } from './useKeyboardOpenHeight';
import { spacing, radius } from '../theme/tokens';
import type { AiChatController } from '../core/AiChatController';
import type { AiButtonPoint } from './aiButtonPosition';
import { AI_BUTTON_SIZE } from './aiButtonPosition';

const PANEL_MAX_WIDTH = 360;
const PANEL_HEIGHT = 420;
const NO_SUGGESTIONS: never[] = [];

export interface AiFloatingChatPanelProps {
  visible: boolean;
  anchor: AiButtonPoint;
  /** Standalone mode only: sent when the panel opens. */
  initialMessage?: string | null;
  onClose: () => void;
  onExpandFullPage?: (conversationId: string | null) => void;
  /**
   * Conversation to show. When omitted, the panel owns one and starts a new
   * conversation (sending `initialMessage`) each time it opens.
   */
  controller?: AiChatController;
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
  controller: controllerProp,
}: AiFloatingChatPanelProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const ownController = useAiChatController();
  const controller = controllerProp ?? ownController;
  const openedRef = useRef(false);
  const keyboardOpenHeight = useKeyboardOpenHeight();
  const screen = useWindowDimensions();
  const panelWidth = Math.min(PANEL_MAX_WIDTH, screen.width - 32);
  const screenHeight = screen.height;
  const panelLeft = Math.min(
    Math.max(anchor.x + AI_BUTTON_SIZE - panelWidth, spacing[4]),
    screen.width - panelWidth - spacing[4]
  );
  const panelTop = Math.max(
    Math.min(anchor.y - PANEL_HEIGHT - 12, screen.height - PANEL_HEIGHT - 24),
    48
  );
  const panelBottom = panelTop + PANEL_HEIGHT;
  const keyboardLiftStyle = useAnimatedStyle(() => {
    if (!visible) return { transform: [{ translateY: 0 }] };
    const visibleBottom = screenHeight - keyboardOpenHeight.value;
    const lift = Math.max(0, panelBottom + 12 - visibleBottom);
    return { transform: [{ translateY: -lift }] };
  });

  // Standalone mode: a fresh conversation per opening. The ref keeps this
  // idempotent when effects run twice (StrictMode).
  useEffect(() => {
    if (controllerProp) return;
    if (!visible) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    ownController.startNewConversation();
    const text = initialMessage?.trim();
    if (text) void ownController.sendMessage(text);
  }, [controllerProp, initialMessage, ownController, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.panel,
        keyboardLiftStyle,
        {
          left: panelLeft,
          top: panelTop,
          width: panelWidth,
          backgroundColor: theme.colors.bg.DEFAULT,
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border.DEFAULT }]}>
        <AiText weight="semibold" accessibilityRole="header">
          {strings.assistantTitle}
        </AiText>
        <View style={styles.headerActions}>
          {onExpandFullPage ? (
            <Pressable
              onPress={() => onExpandFullPage(controller.getSnapshot().conversationId)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={strings.accessibilityExpand}
            >
              <Ionicons name="expand-outline" size={20} color={theme.colors.primary.DEFAULT} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.accessibilityClose}
          >
            <Ionicons name="close" size={20} color={theme.colors.text[500]} />
          </Pressable>
        </View>
      </View>

      <AiConversationView
        controller={controller}
        suggestions={NO_SUGGESTIONS}
        emptyVariant="minimal"
        contentContainerStyle={styles.listContent}
        showScrollToBottomButton={false}
      />

      <AiChatFooter
        controller={controller}
        placeholder={strings.continuePlaceholder}
        liftWithKeyboard={false}
        showDisclaimer={false}
        bottomPadding={spacing[2]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
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
  listContent: { flexGrow: 1, paddingVertical: spacing[2] },
});
