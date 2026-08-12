import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AiFloatingButton } from './AiFloatingButton';
import { AiInputBubble } from './AiInputBubble';
import { AiFloatingChatPanel } from './AiFloatingChatPanel';
import { getDefaultAiButtonPosition, type AiButtonPoint } from './aiButtonPosition';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
}

/**
 * Independent floating surface: FAB + quick input bubble + compact chat panel.
 * Does not import @gorhom/bottom-sheet.
 */
export function AiFloatingOverlay({
  visible = true,
  onExpand,
  onOpenFullPage,
}: AiFloatingOverlayProps) {
  const insets = useSafeAreaInsets();
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelInitialMessage, setPanelInitialMessage] = useState<string | null>(null);
  const [buttonAnchor, setButtonAnchor] = useState<AiButtonPoint>(() =>
    getDefaultAiButtonPosition(insets)
  );

  const closeBubble = useCallback(() => setBubbleVisible(false), []);

  const openExpanded = useCallback(
    (draft?: string) => {
      closeBubble();
      const trimmed = draft?.trim();
      if (onExpand) {
        onExpand(trimmed || undefined);
        return;
      }
      setPanelInitialMessage(trimmed || null);
      setPanelVisible(true);
    },
    [closeBubble, onExpand]
  );

  const handleBubbleSend = useCallback(
    (text: string) => {
      openExpanded(text);
    },
    [openExpanded]
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {bubbleVisible || panelVisible ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            closeBubble();
            setPanelVisible(false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />
      ) : null}

      <AiFloatingChatPanel
        visible={panelVisible && !onExpand}
        anchor={buttonAnchor}
        initialMessage={panelInitialMessage}
        onClose={() => setPanelVisible(false)}
        onExpandFullPage={onOpenFullPage}
      />

      <AiInputBubble
        visible={bubbleVisible}
        anchor={buttonAnchor}
        onSend={handleBubbleSend}
        onExpand={openExpanded}
        onClose={closeBubble}
      />

      <AiFloatingButton
        active={bubbleVisible || panelVisible}
        onPress={() => setBubbleVisible(prev => !prev)}
        onLongPress={() => openExpanded()}
        onPositionChange={setButtonAnchor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    elevation: 55,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 56,
    elevation: 56,
  },
});
