import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAiChat } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, fontSize } from '../theme/tokens';
import { AiText } from '../components/AiText';
import { AiQuickAskContext, type AiQuickAskContextValue } from './aiQuickAskContext';
import { AiQuickAskMessages, AiBottomSheetChatInput } from './AiQuickAskMessages';

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
 *
 * Input lives in `footerComponent` so list/sheet pan gestures stay with gorhom.
 */
export function AiQuickAskProvider({
  children,
  onOpenFullPage,
  title: titleProp,
  snapPoints = ['58%', '90%'],
}: AiQuickAskProviderProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const title = titleProp ?? strings.assistantTitle;
  const chat = useAiChat();
  const { sendMessage, startNewConversation, cancelStreaming, conversationId, isStreaming } = chat;
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
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.colors.bg.DEFAULT,
              paddingBottom: Math.max(insets.bottom, spacing[2]),
              borderTopColor: theme.colors.border.DEFAULT,
            },
          ]}
        >
          <AiBottomSheetChatInput
            onSend={text => {
              void sendMessage(text);
            }}
            isStreaming={isStreaming}
            onStop={cancelStreaming}
            placeholder={strings.continuePlaceholder}
          />
          <AiText style={[styles.disclaimer, { color: theme.colors.text[400] }]}>
            {strings.disclaimer}
          </AiText>
        </View>
      </BottomSheetFooter>
    ),
    [
      cancelStreaming,
      insets.bottom,
      isStreaming,
      sendMessage,
      strings.continuePlaceholder,
      theme.colors.bg.DEFAULT,
      theme.colors.border.DEFAULT,
      theme.colors.text[400],
    ]
  );

  const listHeader = (
    <View style={[styles.header, { borderBottomColor: theme.colors.border.DEFAULT }]}>
      <AiText weight="semibold">{title}</AiText>
      <View style={styles.headerActions}>
        {onOpenFullPage ? (
          <Pressable
            onPress={continueToFullChat}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.accessibilityExpand}
          >
            <Ionicons name="expand-outline" size={22} color={theme.colors.primary.DEFAULT} />
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
  );

  return (
    <AiQuickAskContext.Provider value={value}>
      {children}
      {isActive ? (
        <View style={styles.sheetHost}>
          <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            enableHandlePanningGesture
            enableContentPanningGesture
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            onClose={handleClose}
            backdropComponent={renderBackdrop}
            footerComponent={renderFooter}
            backgroundStyle={{ backgroundColor: theme.colors.bg.DEFAULT }}
            handleIndicatorStyle={{ backgroundColor: theme.colors.text[300] }}
            enableDynamicSizing={false}
          >
            <AiQuickAskMessages header={listHeader} />
          </BottomSheet>
        </View>
      ) : null}
    </AiQuickAskContext.Provider>
  );
}

const styles = StyleSheet.create({
  sheetHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
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
  inputBar: {
    paddingTop: spacing[2],
    gap: spacing[1.5],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    fontSize: fontSize.xxs,
  },
});
