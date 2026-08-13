import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import {
  Canvas,
  Group,
  Image,
  Skia,
  makeImageFromView,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const REVEAL_MS = 560;

export type ThemeOrigin = { x: number; y: number };

interface OverlayState {
  image: SkImage;
  origin: ThemeOrigin;
}

/**
 * Telegram-style circular theme reveal: snapshot the current UI, swap theme
 * underneath, then punch an expanding hole through the snapshot.
 */
export function useCircularThemeReveal(onSwapTheme: () => void) {
  const captureRef = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const busyRef = useRef(false);

  const radius = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const clearOverlay = useCallback(() => {
    setOverlay(null);
    busyRef.current = false;
  }, []);

  const clip = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addRect(Skia.XYWHRect(0, 0, width, height));
    path.addCircle(originX.value, originY.value, radius.value);
    path.setFillType(1);
    return path;
  });

  const startReveal = useCallback(
    async (origin: ThemeOrigin) => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const snapshot = await makeImageFromView(captureRef);
        if (!snapshot) {
          onSwapTheme();
          busyRef.current = false;
          return;
        }

        originX.value = origin.x;
        originY.value = origin.y;
        radius.value = 0;
        setOverlay({ image: snapshot, origin });

        requestAnimationFrame(() => {
          onSwapTheme();
          const maxRadius =
            Math.hypot(
              Math.max(origin.x, width - origin.x),
              Math.max(origin.y, height - origin.y)
            ) + 24;
          radius.value = withTiming(
            maxRadius,
            { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) },
            finished => {
              if (finished) runOnJS(clearOverlay)();
            }
          );
        });
      } catch {
        onSwapTheme();
        busyRef.current = false;
      }
    },
    [clearOverlay, height, onSwapTheme, originX, originY, radius, width]
  );

  const onTogglePress = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      void startReveal({ x: pageX, y: pageY });
    },
    [startReveal]
  );

  const overlayNode = overlay ? (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group clip={clip}>
        <Image image={overlay.image} x={0} y={0} width={width} height={height} fit="cover" />
      </Group>
    </Canvas>
  ) : null;

  return { captureRef, overlayNode, onTogglePress, revealing: overlay !== null };
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
});
