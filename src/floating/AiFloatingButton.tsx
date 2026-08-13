import React, { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import {
  AI_BUTTON_SIZE,
  getDefaultAiButtonPosition,
  type AiButtonPoint,
  type AiOverlayLayout,
} from './aiButtonPosition';
import { computeAiKeyboardLift } from './useAiKeyboardLift';
import { useKeyboardOpenHeight } from './useKeyboardOpenHeight';

export interface AiFloatingButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  onPositionChange?: (point: AiButtonPoint) => void;
  active?: boolean;
  /** Overlay size; defaults to the window when omitted. */
  layout?: AiOverlayLayout | null;
}

export const AiFloatingButton: React.FC<AiFloatingButtonProps> = ({
  onPress,
  onLongPress,
  onPositionChange,
  active = false,
  layout = null,
}) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();

  const defaultPosition = useMemo(
    () => getDefaultAiButtonPosition(insets, layout),
    [insets.top, insets.bottom, insets.left, insets.right, layout?.width, layout?.height]
  );

  const translateX = useSharedValue(defaultPosition.x);
  const translateY = useSharedValue(defaultPosition.y);
  const startX = useSharedValue(defaultPosition.x);
  const startY = useSharedValue(defaultPosition.y);

  const minX = useSharedValue(8);
  const maxX = useSharedValue(300);
  const minY = useSharedValue(8);
  const maxY = useSharedValue(600);
  const snapLeft = useSharedValue(16);
  const snapRight = useSharedValue(300);
  const screenCenterX = useSharedValue(200);
  const screenHeight = useSharedValue(Dimensions.get('window').height);

  useEffect(() => {
    const window = Dimensions.get('window');
    const width = layout?.width || window.width;
    const height = layout?.height || window.height;
    const nested = !!layout && layout.height > 0;
    const leftInset = nested ? 0 : insets.left;
    const rightInset = nested ? 0 : insets.right;
    const topInset = nested ? 0 : insets.top;
    const bottomInset = nested ? 0 : insets.bottom;

    minX.value = leftInset + 8;
    maxX.value = width - AI_BUTTON_SIZE - rightInset - 8;
    minY.value = topInset + 8;
    maxY.value = height - AI_BUTTON_SIZE - bottomInset - 8;
    snapLeft.value = leftInset + 16;
    snapRight.value = width - AI_BUTTON_SIZE - rightInset - 16;
    screenCenterX.value = width / 2;
    screenHeight.value = nested ? height : window.height;

    translateX.value = defaultPosition.x;
    translateY.value = defaultPosition.y;
    startX.value = defaultPosition.x;
    startY.value = defaultPosition.y;
    onPositionChange?.(defaultPosition);
  }, [
    defaultPosition.x,
    defaultPosition.y,
    layout?.width,
    layout?.height,
    insets.left,
    insets.right,
    insets.top,
    insets.bottom,
    minX,
    maxX,
    minY,
    maxY,
    snapLeft,
    snapRight,
    screenCenterX,
    screenHeight,
    translateX,
    translateY,
    startX,
    startY,
    onPositionChange,
  ]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.();
  }, [onLongPress]);

  const handleDragEnd = useCallback(
    (x: number, y: number) => {
      onPositionChange?.({ x, y });
    },
    [onPositionChange]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(10)
        .onBegin(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;
        })
        .onUpdate(event => {
          'worklet';
          translateX.value = Math.min(
            Math.max(startX.value + event.translationX, minX.value),
            maxX.value
          );
          translateY.value = Math.min(
            Math.max(startY.value + event.translationY, minY.value),
            maxY.value
          );
        })
        .onEnd(() => {
          'worklet';
          const centerX = translateX.value + AI_BUTTON_SIZE / 2;
          const snappedX = centerX < screenCenterX.value ? snapLeft.value : snapRight.value;
          const snappedY = Math.min(Math.max(translateY.value, minY.value), maxY.value);
          translateX.value = withSpring(snappedX, { damping: 18, stiffness: 180 });
          translateY.value = withSpring(snappedY, { damping: 18, stiffness: 180 });
          runOnJS(handleDragEnd)(snappedX, snappedY);
        }),
    [
      handleDragEnd,
      maxX,
      maxY,
      minX,
      minY,
      screenCenterX,
      snapLeft,
      snapRight,
      startX,
      startY,
      translateX,
      translateY,
    ]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(handlePress)();
      }),
    [handlePress]
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(450)
        .onStart(() => {
          runOnJS(handleLongPress)();
        }),
    [handleLongPress]
  );

  const composedGesture = useMemo(
    () => Gesture.Exclusive(panGesture, Gesture.Exclusive(longPressGesture, tapGesture)),
    [longPressGesture, panGesture, tapGesture]
  );

  const keyboardOpenHeight = useKeyboardOpenHeight();

  const animatedStyle = useAnimatedStyle(() => {
    const keyboardLift = computeAiKeyboardLift(
      translateY.value,
      keyboardOpenHeight.value,
      screenHeight.value,
      active
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value - keyboardLift },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: active ? theme.colors.primary[600] : theme.colors.primary.DEFAULT,
              shadowColor: '#000',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={strings.accessibilityAssistant}
        >
          <Ionicons name="sparkles" size={24} color={theme.colors.primary.onPrimary} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 60,
    elevation: 60,
  },
  button: {
    width: AI_BUTTON_SIZE,
    height: AI_BUTTON_SIZE,
    borderRadius: AI_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 8,
  },
});
