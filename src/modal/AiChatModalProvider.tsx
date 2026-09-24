import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiChatController } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius } from '../theme/tokens';
import { AiText } from '../components/AiText';
import {
  AiChatModalContext,
  type AiChatModalControls,
  type AiChatModalOpenOptions,
} from './aiChatModalContext';
import { AiChatModalBody } from './AiChatModalBody';
import type { AiSuggestion } from '../types/aiContext';

export interface AiChatModalProviderProps {
  children: ReactNode;
  /** Host navigation to full-page chat. */
  onOpenFullPage?: (conversationId: string | null) => void;
  title?: string;
  /**
   * `card` — centered sheet-like card (default).
   * `fullscreen` — edge-to-edge modal.
   */
  presentation?: 'card' | 'fullscreen';
  /** Empty-state suggestions (defaults to `DEFAULT_SUGGESTIONS`). */
  suggestions?: AiSuggestion[];
}

/**
 * Modal quick-ask surface using React Native `Modal`.
 * Independent from `./bottom-sheet` — no `@gorhom/bottom-sheet` import.
 */
export function AiChatModalProvider({
  children,
  onOpenFullPage,
  title: titleProp,
  presentation = 'card',
  suggestions,
}: AiChatModalProviderProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const title = titleProp ?? strings.assistantTitle;
  const controller = useAiChatController();
  const [isActive, setIsActive] = useState(false);

  const close = useCallback(() => {
    setIsActive(false);
    controller.cancelStreaming();
  }, [controller]);

  const continueToFullChat = useCallback(() => {
    const { conversationId } = controller.getSnapshot();
    close();
    onOpenFullPage?.(conversationId);
  }, [close, controller, onOpenFullPage]);

  const open = useCallback(
    (options?: AiChatModalOpenOptions) => {
      controller.startNewConversation();
      setIsActive(true);
      const initialMessage = options?.initialMessage?.trim();
      if (initialMessage) void controller.sendMessage(initialMessage);
    },
    [controller]
  );

  const value = useMemo<AiChatModalControls>(
    () => ({ isActive, open, close, controller }),
    [close, controller, isActive, open]
  );

  const isFullscreen = presentation === 'fullscreen';

  return (
    <AiChatModalContext.Provider value={value}>
      {children}
      <Modal
        visible={isActive}
        transparent={!isFullscreen}
        animationType={isFullscreen ? 'slide' : 'fade'}
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* Modal content is a separate native root; gestures (e.g. table scroll) need their own handler root on Android. */}
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View
            style={[
              styles.backdrop,
              !isFullscreen && { backgroundColor: theme.colors.surface.backdrop },
              isFullscreen && { backgroundColor: theme.colors.bg.DEFAULT },
            ]}
          >
            {!isFullscreen ? (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={close}
                accessibilityLabel={strings.accessibilityClose}
              />
            ) : null}

            <View
              style={[
                isFullscreen ? styles.fullHost : styles.cardHost,
                {
                  backgroundColor: theme.colors.bg.DEFAULT,
                  ...(isFullscreen
                    ? {}
                    : {
                        marginTop: insets.top + spacing[4],
                        marginBottom: Math.max(insets.bottom, spacing[4]),
                        borderColor: theme.colors.border.DEFAULT,
                      }),
                },
              ]}
            >
              {isFullscreen ? (
                <AiChatModalBody
                  suggestions={suggestions}
                  title={title}
                  onClose={close}
                  onOpenFullPage={onOpenFullPage ? continueToFullChat : undefined}
                  showHeader
                />
              ) : (
                <View style={styles.cardInner}>
                  <View
                    style={[styles.cardHeader, { borderBottomColor: theme.colors.border.DEFAULT }]}
                  >
                    <AiText weight="semibold">{title}</AiText>
                    <View style={styles.headerActions}>
                      {onOpenFullPage ? (
                        <Pressable
                          onPress={continueToFullChat}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={strings.accessibilityExpand}
                        >
                          <Ionicons
                            name="expand-outline"
                            size={22}
                            color={theme.colors.primary.DEFAULT}
                          />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={close}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={strings.accessibilityClose}
                      >
                        <Ionicons name="close" size={22} color={theme.colors.text[500]} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <AiChatModalBody suggestions={suggestions} onClose={close} showHeader={false} />
                  </View>
                </View>
              )}
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </AiChatModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  fullHost: {
    flex: 1,
  },
  cardHost: {
    marginHorizontal: spacing[4],
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxHeight: '88%',
    minHeight: 420,
    flex: 1,
  },
  cardInner: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cardBody: {
    flex: 1,
  },
});
