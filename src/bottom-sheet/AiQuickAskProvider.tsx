import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, Pressable, Modal } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useAiChat } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { AiText } from '../components/AiText';
import { AiQuickAskContext, type AiQuickAskContextValue } from './aiQuickAskContext';
import { AiQuickAskMessages, AiQuickAskInputOverlay } from './AiQuickAskMessages';

export interface AiQuickAskProviderProps {
  children: ReactNode;
  /** Host navigation to full-page chat. */
  onOpenFullPage?: (conversationId: string | null) => void;
  title?: string;
  snapPoints?: (string | number)[];
}

/**
 * Self-contained bottom-sheet quick-ask surface.
 * Requires peer `@gorhom/bottom-sheet` (only imported from this entry).
 */
export function AiQuickAskProvider({
  children,
  onOpenFullPage,
  title: titleProp,
  snapPoints = ['58%', '90%'],
}: AiQuickAskProviderProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const title = titleProp ?? strings.assistantTitle;
  const chat = useAiChat();
  const { sendMessage, startNewConversation, cancelStreaming, conversationId } = chat;
  const sheetRef = useRef<BottomSheet>(null);
  const [isActive, setIsActive] = useState(false);
  const sentInitialRef = useRef(false);

  const handleClose = useCallback(() => {
    setIsActive(false);
    cancelStreaming();
    sentInitialRef.current = false;
  }, [cancelStreaming]);

  const close = useCallback(() => {
    sheetRef.current?.close();
    handleClose();
  }, [handleClose]);

  const continueToFullChat = useCallback(() => {
    const id = conversationId;
    sheetRef.current?.close();
    handleClose();
    onOpenFullPage?.(id);
  }, [conversationId, handleClose, onOpenFullPage]);

  const open = useCallback(
    (options?: { initialMessage?: string }) => {
      startNewConversation();
      sentInitialRef.current = false;
      setIsActive(true);
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0);
      });

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

  const value = useMemo<AiQuickAskContextValue>(
    () => ({
      isActive,
      chat,
      open,
      close,
    }),
    [chat, close, isActive, open]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  return (
    <AiQuickAskContext.Provider value={value}>
      {children}
      <Modal
        visible={isActive}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            onClose={handleClose}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: theme.colors.bg.DEFAULT }}
            handleIndicatorStyle={{ backgroundColor: theme.colors.text[300] }}
            enableDynamicSizing={false}
            activeOffsetY={[-8, 8]}
            failOffsetX={[-16, 16]}
          >
            <BottomSheetView style={styles.sheetContent}>
              <View style={[styles.header, { borderBottomColor: theme.colors.border.DEFAULT }]}>
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
              <View style={styles.messages}>
                <AiQuickAskMessages />
              </View>
            </BottomSheetView>
          </BottomSheet>
          <AiQuickAskInputOverlay />
        </GestureHandlerRootView>
      </Modal>
    </AiQuickAskContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    minHeight: 360,
  },
  header: {
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
  messages: {
    flex: 1,
    minHeight: 240,
  },
});
