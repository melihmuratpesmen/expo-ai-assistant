import { Platform } from 'react-native';
import { useEffect } from 'react';
import {
  AndroidSoftInputModes,
  KeyboardController,
  useGenericKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IS_ANDROID = Platform.OS === 'android';

/**
 * Lifts a bottom-anchored bar with the keyboard (MyExamy `useScreenBottomKeyboardLift`).
 * Uses translateY, not padding — keyboard height minus the bar's existing bottom inset.
 *
 * @param bottomInset Extra space already below the bar (tab bar, etc.). Defaults to safe-area bottom.
 */
export function useScreenBottomKeyboardLift(enabled = true, bottomInset?: number) {
  const { bottom: safeBottom } = useSafeAreaInsets();
  const inset = bottomInset ?? safeBottom;
  const keyboardLift = useSharedValue(0);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

  useEffect(() => {
    if (!enabled || !IS_ANDROID) return;
    KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING);
    return () => KeyboardController.setDefaultMode();
  }, [enabled]);

  useAnimatedReaction(
    () => Math.max(-keyboardHeight.value - inset, 0),
    target => {
      if (!IS_ANDROID) keyboardLift.value = target;
    },
    [inset]
  );

  useGenericKeyboardHandler(
    {
      onStart: e => {
        'worklet';
        if (!enabled || !IS_ANDROID) return;
        keyboardLift.value = Math.max(e.height - inset, 0);
      },
      onEnd: e => {
        'worklet';
        if (!enabled || !IS_ANDROID) return;
        keyboardLift.value = Math.max(e.height - inset, 0);
      },
    },
    [enabled, inset]
  );

  return useAnimatedStyle(() => ({
    transform: [{ translateY: enabled ? -keyboardLift.value : 0 }],
  }));
}
