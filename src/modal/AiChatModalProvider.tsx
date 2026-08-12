import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiChat } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius } from '../theme/tokens';
import { AiText } from '../components/AiText';
import { AiChatModalContext, type AiChatModalContextValue } from './aiChatModalContext';
import { AiChatModalBody } from './AiChatModalBody';

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
}: AiChatModalProviderProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const title = titleProp ?? strings.assistantTitle;
  const chat = useAiChat();
  const { sendMessage, startNewConversation, cancelStreaming, conversationId } = chat;
  const [isActive, setIsActive] = useState(false);
  const sentInitialRef = useRef(false);

  const handleClose = useCallback(() => {
    setIsActive(false);
    cancelStreaming();
    sentInitialRef.current = false;
  }, [cancelStreaming]);

  const close = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const continueToFullChat = useCallback(() => {
    const id = conversationId;
    handleClose();
    onOpenFullPage?.(id);
  }, [conversationId, handleClose, onOpenFullPage]);

  const open = useCallback(
    (options?: { initialMessage?: string }) => {
      startNewConversation();
      sentInitialRef.current = false;
      setIsActive(true);

      const initialMessage = options?.initialMessage?.trim();
      if (initialMessage) {
        setTimeout(() => {
          if (sentInitialRef.current) return;
          sentInitialRef.current = true;
          void sendMessage(initialMessage);
        }, 120);
      }
    },
    [sendMessage, startNewConversation]
  );

  const value = useMemo<AiChatModalContextValue>(
    () => ({
      isActive,
      chat,
      open,
      close,
    }),
    [chat, close, isActive, open]
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
        <View
          style={[
            styles.backdrop,
            !isFullscreen && { backgroundColor: 'rgba(0,0,0,0.45)' },
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
                      <Pressable onPress={continueToFullChat} hitSlop={8}>
                        <Ionicons
                          name="expand-outline"
                          size={22}
                          color={theme.colors.primary.DEFAULT}
                        />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={close} hitSlop={8}>
                      <Ionicons name="close" size={22} color={theme.colors.text[500]} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <AiChatModalBody onClose={close} showHeader={false} />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AiChatModalContext.Provider>
  );
}

const styles = StyleSheet.create({
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
