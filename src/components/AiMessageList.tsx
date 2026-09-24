import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type FlatListProps,
  type LayoutChangeEvent,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useLatestRef } from '../lib/useLatestRef';
import { spacing } from '../theme/tokens';
import type { AiChatMessage } from '../types/aiChat';
import { AiMessageBubble } from './AiMessageBubble';

type MessageFlatListProps = FlatListProps<AiChatMessage>;

export interface AiMessageListProps {
  messages: AiChatMessage[];
  /** Hides regenerate while a reply is streaming. */
  isStreaming?: boolean;
  /** Shows a regenerate action under the latest assistant reply. */
  onRegenerate?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListHeaderComponent?: MessageFlatListProps['ListHeaderComponent'];
  ListFooterComponent?: MessageFlatListProps['ListFooterComponent'];
  ListEmptyComponent?: MessageFlatListProps['ListEmptyComponent'];
  /**
   * Replace the list implementation, e.g. `BottomSheetFlatList`. It must
   * accept FlatList props and expose `scrollToEnd` on its ref.
   */
  FlatListComponent?: React.ComponentType<MessageFlatListProps & { ref?: React.Ref<unknown> }>;
  /** Follow new content while the user is at the bottom. Default true. */
  autoScroll?: boolean;
  /** Show a "jump to latest" button after the user scrolls up. Default true. */
  showScrollToBottomButton?: boolean;
  /** Distance from the end (px) that still counts as "at the bottom". Default 96. */
  bottomThreshold?: number;
  /** Extra props forwarded to the list (e.g. `nestedScrollEnabled`). */
  listProps?: Partial<MessageFlatListProps>;
}

export interface AiMessageListHandle {
  scrollToEnd: (animated?: boolean) => void;
}

type ScrollableRef = {
  scrollToEnd: (options?: { animated?: boolean }) => void;
  scrollToOffset: (options: { offset: number; animated?: boolean }) => void;
} | null;

/**
 * Message list shared by every surface: memoized bubbles, stick-to-bottom
 * auto-scroll that pauses while the user reads older messages, and a
 * "jump to latest" button.
 */
export const AiMessageList = forwardRef<AiMessageListHandle, AiMessageListProps>(
  function AiMessageList(
    {
      messages,
      isStreaming = false,
      onRegenerate,
      style,
      contentContainerStyle,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      FlatListComponent,
      autoScroll = true,
      showScrollToBottomButton = true,
      bottomThreshold = 96,
      listProps,
    },
    ref
  ) {
    const theme = useAiTheme();
    const strings = useAiStrings();
    const listRef = useRef<ScrollableRef>(null);
    const contentHeightRef = useRef(0);
    const viewportHeightRef = useRef(0);
    const atBottomRef = useRef(true);
    /** True from the user's drag until its momentum settles; programmatic scrolls are ignored. */
    const userScrollingRef = useRef(false);
    const followedCountRef = useRef(messages.length);
    const messageCountRef = useLatestRef(messages.length);
    const onRegenerateRef = useLatestRef(onRegenerate);
    const [showJumpButton, setShowJumpButton] = useState(false);

    // FlatList.scrollToEnd ignores contentContainerStyle padding (it measures the
    // last cell + footer), which hides the end of the list under overlaid footers.
    // Scroll to the measured content end instead.
    const scrollToEnd = useCallback((animated = true) => {
      requestAnimationFrame(() => {
        const list = listRef.current;
        if (!list) return;
        const viewport = viewportHeightRef.current;
        if (viewport > 0 && contentHeightRef.current > 0) {
          list.scrollToOffset({
            offset: Math.max(0, contentHeightRef.current - viewport),
            animated,
          });
        } else {
          list.scrollToEnd({ animated });
        }
      });
    }, []);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
    }, []);

    useImperativeHandle(ref, () => ({ scrollToEnd }), [scrollToEnd]);

    const jumpToLatest = useCallback(() => {
      atBottomRef.current = true;
      setShowJumpButton(false);
      scrollToEnd(true);
    }, [scrollToEnd]);

    useEffect(() => {
      if (!autoScroll) return;
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const sub = Keyboard.addListener(showEvent, () => {
        if (atBottomRef.current) scrollToEnd(true);
      });
      return () => sub.remove();
    }, [autoScroll, scrollToEnd]);

    const handleContentSizeChange = useCallback(
      (_width: number, height: number) => {
        contentHeightRef.current = height;
        if (!autoScroll) return;
        const count = messageCountRef.current;
        // A new turn (sent message, suggestion, regenerate) always brings the list back down.
        const isNewTurn = count > followedCountRef.current;
        followedCountRef.current = count;
        if (isNewTurn) {
          atBottomRef.current = true;
          setShowJumpButton(false);
        }
        // Animate new turns; jump while a reply grows so the list does not lag behind.
        if (atBottomRef.current) scrollToEnd(isNewTurn);
      },
      [autoScroll, messageCountRef, scrollToEnd]
    );

    // Only user-driven scrolling decides whether we keep following: iOS also
    // reports momentum events for our own animated scrollToEnd, and the reply
    // may have grown by the time they arrive.
    const updateAtBottom = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        const atBottom = distanceFromEnd <= bottomThreshold;
        atBottomRef.current = atBottom;
        if (showScrollToBottomButton) {
          setShowJumpButton(prev => (prev === !atBottom ? prev : !atBottom));
        }
      },
      [bottomThreshold, showScrollToBottomButton]
    );

    const handleScrollBeginDrag = useCallback(() => {
      userScrollingRef.current = true;
    }, []);

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (userScrollingRef.current) updateAtBottom(event);
      },
      [updateAtBottom]
    );

    const handleScrollEndDrag = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        updateAtBottom(event);
        // No fling: there will be no momentum end to wait for.
        if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) userScrollingRef.current = false;
      },
      [updateAtBottom]
    );

    const handleMomentumScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!userScrollingRef.current) return;
        userScrollingRef.current = false;
        updateAtBottom(event);
      },
      [updateAtBottom]
    );

    const lastAssistantId = useMemo(() => {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].role === 'assistant') return messages[i].id;
      }
      return undefined;
    }, [messages]);

    const handleRegenerate = useCallback(() => {
      atBottomRef.current = true;
      void onRegenerateRef.current?.();
    }, [onRegenerateRef]);

    const canRegenerate = !!onRegenerate && !isStreaming;
    const renderItem = useCallback<ListRenderItem<AiChatMessage>>(
      ({ item }) => (
        <AiMessageBubble
          message={item}
          showRegenerate={canRegenerate && item.id === lastAssistantId}
          onRegenerate={handleRegenerate}
        />
      ),
      [canRegenerate, handleRegenerate, lastAssistantId]
    );

    const List = (FlatListComponent ?? FlatList) as React.ComponentType<
      MessageFlatListProps & { ref?: React.Ref<unknown> }
    >;

    const list = (
      <List
        showsVerticalScrollIndicator={false}
        {...listProps}
        ref={listRef as React.Ref<unknown>}
        style={showScrollToBottomButton ? styles.list : [styles.list, style]}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        // Custom lists (bottom sheet) own onScroll; end-of-drag events are enough there.
        onScroll={FlatListComponent ? undefined : handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    );

    // Without the jump button the list is rendered bare, so containers that
    // expect a direct scrollable child (bottom sheet) keep working.
    if (!showScrollToBottomButton) return list;

    return (
      <View style={[styles.container, style]}>
        {list}
        {showJumpButton && messages.length > 0 ? (
          <Pressable
            onPress={jumpToLatest}
            style={[
              styles.jumpButton,
              {
                backgroundColor: theme.colors.surface.raised,
                borderColor: theme.colors.border.DEFAULT,
              },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.scrollToBottom}
          >
            <Ionicons name="arrow-down" size={18} color={theme.colors.text.DEFAULT} />
          </Pressable>
        ) : null}
      </View>
    );
  }
);

function keyExtractor(item: AiChatMessage) {
  return item.id;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  jumpButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing[3],
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
