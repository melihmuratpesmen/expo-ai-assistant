import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AI_BUTTON_SIZE } from './aiButtonPosition';
import { useKeyboardOpenHeight } from './useKeyboardOpenHeight';

export const AI_KEYBOARD_GAP = 24;

export function computeAiKeyboardLift(
  anchorY: number,
  keyboardHeight: number,
  screenHeight: number,
  enabled: boolean
): number {
  'worklet';
  if (!enabled || keyboardHeight <= 0) return 0;

  const clusterBottom = anchorY + AI_BUTTON_SIZE;
  const visibleBottom = screenHeight - keyboardHeight;
  return Math.max(0, clusterBottom + AI_KEYBOARD_GAP - visibleBottom);
}

export function useAiKeyboardLift(anchorY: SharedValue<number>, enabled: boolean) {
  const keyboardOpenHeight = useKeyboardOpenHeight();
  const screenHeight = useSharedValue(Dimensions.get('window').height);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      screenHeight.value = window.height;
    });
    return () => subscription.remove();
  }, [screenHeight]);

  return useAnimatedStyle(() => {
    const lift = computeAiKeyboardLift(
      anchorY.value,
      keyboardOpenHeight.value,
      screenHeight.value,
      enabled
    );

    return { transform: [{ translateY: -lift }] };
  });
}
