import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AiFloatingButton } from './AiFloatingButton';
import { AiInputBubble } from './AiInputBubble';
import { AiFloatingChatPanel } from './AiFloatingChatPanel';
import {
  getDefaultAiButtonPosition,
  isKeyboardShrink,
  type AiButtonPoint,
  type AiOverlayLayout,
} from './aiButtonPosition';
import { useAiKeyboardLift } from './useAiKeyboardLift';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useAiChatController } from '../hooks/useAiChat';
import { absoluteFill } from '../lib/styles';

/** A layout shrink this close before keyboardDidShow is treated as the keyboard resize. */
const KEYBOARD_RESIZE_WINDOW_MS = 1000;

export interface AiFloatingOverlayProps {
  /** When false, overlay is hidden (host RBAC / prefs). Default true. */
  visible?: boolean;
  /**
   * Called when the user expands from the bubble or long-presses the FAB.
   * Host may open bottom-sheet / modal / full-page. If omitted, the built-in
   * floating chat panel opens instead (independent surface).
   */
  onExpand?: (draft?: string) => void;
  /** Optional navigation to full-page chat from the floating panel. */
  onOpenFullPage?: (conversationId: string | null) => void;
  /** Share the built-in panel's conversation with other surfaces using the same id. */
  chatId?: string;
}

/**
 * Independent floating surface: FAB + quick input bubble + compact chat panel.
 * Does not import @gorhom/bottom-sheet.
 */
export function AiFloatingOverlay({
  visible = true,
  onExpand,
  onOpenFullPage,
  chatId,
}: AiFloatingOverlayProps) {
  const insets = useSafeAreaInsets();
  const strings = useAiStrings();
  const [overlayLayout, setOverlayLayout] = useState<AiOverlayLayout | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const controller = useAiChatController({ chatId });
  const [buttonAnchor, setButtonAnchor] = useState<AiButtonPoint>(() =>
    getDefaultAiButtonPosition(insets)
  );
  const anchorY = useSharedValue(buttonAnchor.y);

  useEffect(() => {
    anchorY.value = buttonAnchor.y;
  }, [anchorY, buttonAnchor.y]);

  const clusterLiftStyle = useAiKeyboardLift(anchorY, bubbleVisible, overlayLayout?.height ?? null);

  const keyboardShownRef = useRef(false);
  // Last two measured layouts, to undo a keyboard resize measured just before keyboardDidShow.
  const layoutsRef = useRef<{
    current: AiOverlayLayout | null;
    previous: AiOverlayLayout | null;
    at: number;
  }>({ current: null, previous: null, at: 0 });

  const handleOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const { current } = layoutsRef.current;
    // Keep laying out against the full height while the keyboard is open: the cluster lift
    // already subtracts the keyboard, and a shorter overlay would also reset the FAB position.
    if (isKeyboardShrink(current, { width, height }, keyboardShownRef.current)) return;
    layoutsRef.current = { previous: current, current: { width, height }, at: Date.now() };
    setOverlayLayout(prev =>
      prev && prev.width === width && prev.height === height ? prev : { width, height }
    );
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      keyboardShownRef.current = true;
      const { previous, current, at } = layoutsRef.current;
      if (previous && Date.now() - at < KEYBOARD_RESIZE_WINDOW_MS) {
        if (isKeyboardShrink(previous, current, true)) {
          layoutsRef.current = { previous: null, current: previous, at: 0 };
          setOverlayLayout(previous);
        }
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardShownRef.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const closeBubble = useCallback(() => setBubbleVisible(false), []);

  const openExpanded = useCallback(
    (draft?: string) => {
      closeBubble();
      const trimmed = draft?.trim();
      if (onExpand) {
        onExpand(trimmed || undefined);
        return;
      }
      if (!chatId) controller.startNewConversation();
      if (trimmed) void controller.sendMessage(trimmed);
      setPanelVisible(true);
    },
    [chatId, closeBubble, controller, onExpand]
  );

  const closePanel = useCallback(() => {
    setPanelVisible(false);
    if (!chatId) controller.cancelStreaming();
  }, [chatId, controller]);

  const handleBubbleSend = useCallback(
    (text: string) => {
      openExpanded(text);
    },
    [openExpanded]
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none" onLayout={handleOverlayLayout}>
      {bubbleVisible || panelVisible ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            closeBubble();
            closePanel();
          }}
          accessibilityRole="button"
          accessibilityLabel={strings.accessibilityClose}
        />
      ) : null}

      <AiFloatingChatPanel
        controller={controller}
        visible={panelVisible && !onExpand}
        anchor={buttonAnchor}
        onClose={closePanel}
        onExpandFullPage={onOpenFullPage}
      />

      <Animated.View style={[styles.cluster, clusterLiftStyle]} pointerEvents="box-none">
        <AiInputBubble
          visible={bubbleVisible}
          anchor={buttonAnchor}
          layout={overlayLayout}
          liftWithKeyboard={false}
          onSend={handleBubbleSend}
          onExpand={openExpanded}
          onClose={closeBubble}
        />

        <AiFloatingButton
          active={bubbleVisible || panelVisible}
          layout={overlayLayout}
          liftWithKeyboard={false}
          onPress={() => setBubbleVisible(prev => !prev)}
          onLongPress={() => openExpanded()}
          onPositionChange={setButtonAnchor}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...absoluteFill,
    zIndex: 55,
    elevation: 55,
  },
  // Above the backdrop (56) so the bubble's buttons and the FAB stay tappable.
  cluster: {
    ...absoluteFill,
    zIndex: 59,
    elevation: 59,
  },
  backdrop: {
    ...absoluteFill,
    zIndex: 56,
    elevation: 56,
  },
});
