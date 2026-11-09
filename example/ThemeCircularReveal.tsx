import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** ReplyZen: 700ms easeInOutCubic, circle from tap. */
const REVEAL_MS = 700;
const REVEAL_EASING = Easing.bezier(0.645, 0.045, 0.355, 1);

/**
 * Incoming theme UI expands from the tap. The live tree is not swapped until
 * the circle covers the screen, so the outside of the wave stays the old UI.
 */
export function useCircularThemeReveal(
  onSwapTheme: () => void,
  renderIncoming: () => ReactNode
) {
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(false);
  const busyRef = useRef(false);
  const maxRadiusRef = useRef(0);

  const radius = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const incomingNodeRef = useRef<ReactNode>(null);

  const finish = useCallback(() => {
    onSwapTheme();
    // Keep the full-size incoming overlay up until the live tree has painted.
    // Do not reset radius while mounted — that collapses the circle and flashes.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActive(false);
        busyRef.current = false;
        incomingNodeRef.current = null;
      });
    });
  }, [onSwapTheme]);

  useEffect(() => {
    if (!active) return;
    radius.value = 0;
    radius.value = withTiming(
      maxRadiusRef.current,
      { duration: REVEAL_MS, easing: REVEAL_EASING },
      finished => {
        if (finished) runOnJS(finish)();
      }
    );
  }, [active, finish, radius]);

  const onTogglePress = useCallback(
    (event: GestureResponderEvent) => {
      if (busyRef.current) return;
      busyRef.current = true;

      const { pageX, pageY } = event.nativeEvent;
      originX.value = pageX;
      originY.value = pageY;
      radius.value = 0;
      maxRadiusRef.current =
        Math.hypot(Math.max(pageX, width - pageX), Math.max(pageY, height - pageY)) + 24;
      incomingNodeRef.current = renderIncoming();
      setActive(true);
    },
    [height, originX, originY, radius, renderIncoming, width]
  );

  const circleStyle = useAnimatedStyle(() => ({
    width: radius.value * 2,
    height: radius.value * 2,
    borderRadius: radius.value,
    transform: [
      { translateX: originX.value - radius.value },
      { translateY: originY.value - radius.value },
    ],
  }));

  const incomingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: radius.value - originX.value },
      { translateY: radius.value - originY.value },
    ],
  }));

  const overlayNode = active ? (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.circle, circleStyle]}>
        <Animated.View style={[{ width, height }, incomingStyle]}>
          {incomingNodeRef.current}
        </Animated.View>
      </Animated.View>
    </View>
  ) : null;

  return { overlayNode, onTogglePress, revealing: active };
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  circle: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
});
