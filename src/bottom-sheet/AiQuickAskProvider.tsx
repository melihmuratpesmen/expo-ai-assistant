import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { useAiChatController } from '../hooks/useAiChat';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing } from '../theme/tokens';
import { AiChatFooter } from '../components/AiChatFooter';
import { AiText } from '../components/AiText';
import type { AiChatController } from '../core/AiChatController';
import type { AiSuggestion } from '../types/aiContext';
import {
  AiQuickAskContext,
  type AiQuickAskControls,
  type AiQuickAskOpenOptions,
} from './aiQuickAskContext';
import { AiQuickAskMessages, AiBottomSheetTextInput } from './AiQuickAskMessages';

export interface AiQuickAskProviderProps {
  children: ReactNode;
  /** Host navigation to full-page chat. */
  onOpenFullPage?: (conversationId: string | null) => void;
  title?: string;
  snapPoints?: (string | number)[];
  /** Empty-state suggestions (defaults to `DEFAULT_SUGGESTIONS`). */
  suggestions?: AiSuggestion[];
  /**
   * Expand to the highest snap point when a message is sent, so the reply is
   * not hidden (gorhom locks list scrolling below the top snap point). Default true.
   */
  expandOnSend?: boolean;
  /**
   * Share the conversation with other surfaces using the same id (e.g. an
   * `AiChatScreen` with `chatId="main"`): opening continues it, closing does not
   * stop a streaming reply, and "open full page" keeps the stream going.
   */
  chatId?: string;
}

const DEFAULT_SNAP_POINTS = ['58%', '90%'];

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
  snapPoints = DEFAULT_SNAP_POINTS,
  suggestions,
  expandOnSend = true,
  chatId,
}: AiQuickAskProviderProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const title = titleProp ?? strings.assistantTitle;
  const controller = useAiChatController({ chatId });
  const shared = !!chatId;
  const sheetRef = useRef<BottomSheet>(null);
  const [isActive, setIsActive] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const topIndex = snapPoints.length - 1;

  const handleClose = useCallback(() => {
    setIsActive(false);
    // A shared conversation keeps streaming for the other surfaces.
    if (!shared) controller.cancelStreaming();
  }, [controller, shared]);

  const close = useCallback(() => {
    sheetRef.current?.close();
    handleClose();
  }, [handleClose]);

  const continueToFullChat = useCallback(() => {
    const { conversationId } = controller.getSnapshot();
    sheetRef.current?.close();
    handleClose();
    onOpenFullPage?.(conversationId);
  }, [controller, handleClose, onOpenFullPage]);

  const open = useCallback(
    (options?: AiQuickAskOpenOptions) => {
      if (options?.reset ?? !shared) controller.startNewConversation();
      const initialMessage = options?.initialMessage?.trim();
      setInitialIndex(initialMessage && expandOnSend ? topIndex : 0);
      setIsActive(true);
      if (initialMessage) void controller.sendMessage(initialMessage);
    },
    [controller, expandOnSend, shared, topIndex]
  );

  useEffect(() => {
    if (!isActive || !expandOnSend) return;
    let count = controller.getSnapshot().messages.length;
    return controller.subscribe(() => {
      const next = controller.getSnapshot().messages.length;
      if (next > count) sheetRef.current?.snapToIndex(topIndex);
      count = next;
    });
  }, [controller, expandOnSend, isActive, topIndex]);

  const value = useMemo<AiQuickAskControls>(
    () => ({ isActive, open, close, controller }),
    [close, controller, isActive, open]
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
        <SheetFooter controller={controller} />
      </BottomSheetFooter>
    ),
    [controller]
  );

  const listHeader = (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.bg.DEFAULT,
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
            index={initialIndex}
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
            <AiQuickAskMessages header={listHeader} suggestions={suggestions} />
          </BottomSheet>
        </View>
      ) : null}
    </AiQuickAskContext.Provider>
  );
}

/** gorhom handles the keyboard for the sheet, so the footer does not lift itself. */
function SheetFooter({ controller }: { controller: AiChatController }) {
  const strings = useAiStrings();
  return (
    <AiChatFooter
      controller={controller}
      placeholder={strings.continuePlaceholder}
      liftWithKeyboard={false}
      bordered
      TextInputComponent={AiBottomSheetTextInput}
    />
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
});
