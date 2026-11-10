import { Dimensions, Keyboard, Platform, type KeyboardEvent, type View } from 'react-native';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  AndroidSoftInputModes,
  KeyboardController,
  useGenericKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IS_ANDROID = Platform.OS === 'android';
const FALLBACK_DURATION = 180;

/**
 * How far to lift a bar so that it ends at the keyboard's top edge.
 *
 * @param anchorBottom Bottom of the bar in window coordinates, without the lift applied.
 * @param keyboardTop Top of the keyboard in window coordinates.
 * @param hideable Padding at the bottom of the bar that may go behind the keyboard (safe area).
 */
export function computeMeasuredKeyboardLift(
  anchorBottom: number,
  keyboardTop: number,
  hideable: number
): number {
  return Math.max(anchorBottom - keyboardTop - hideable, 0);
}

/**
 * Top of the keyboard in the coordinates `measureInWindow` reports.
 *
 * On Android those are relative to the root view, which starts below the status bar unless
 * the app is edge-to-edge, while the event's `screenY` is in screen coordinates. Derive it
 * from the window height instead; the event height leaves out the navigation bar, which an
 * edge-to-edge window (safe-area bottom > 0) also covers.
 */
export function keyboardTopInWindow(
  event: KeyboardEvent,
  windowHeight: number,
  safeBottom: number,
  os: string = Platform.OS
): number {
  if (os !== 'android') return event.endCoordinates.screenY;
  return windowHeight - event.endCoordinates.height - safeBottom;
}

/**
 * Lifts a bottom-anchored bar with the keyboard (MyExamy `useScreenBottomKeyboardLift`).
 * Uses translateY, not padding — keyboard height minus the bar's existing bottom inset.
 *
 * @param bottomInset Extra space already below the bar (tab bar, etc.). Defaults to safe-area bottom.
 */
export function useScreenBottomKeyboardLift(enabled = true, bottomInset?: number) {
  return useKeyboardLift(enabled, bottomInset).style;
}

/**
 * `useScreenBottomKeyboardLift` plus a measured fallback for setups where
 * react-native-keyboard-controller events do not reach JS (Android in Expo Go,
 * for example). Pass `anchorRef` (an untransformed view around the lifted bar)
 * and call `onAnchorLayout` from its `onLayout`.
 *
 * @internal
 */
export function useKeyboardLift(
  enabled: boolean,
  bottomInset?: number,
  anchorRef?: RefObject<View | null>
) {
  const { bottom: safeBottom } = useSafeAreaInsets();
  const inset = bottomInset ?? safeBottom;
  // With an explicit bottomInset the space below the bar is measured, so nothing may hide.
  const hideable = bottomInset === undefined ? safeBottom : 0;
  const keyboardLift = useSharedValue(0);
  const controllerEvents = useSharedValue(false);
  const fallbackActive = useSharedValue(false);
  const fallback = useRef<{ keyboardTop: number; keyboardHeight: number } | null>(null);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

  useEffect(() => {
    if (!enabled || !IS_ANDROID) return;
    try {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING);
    } catch {
      // Expo Go / missing KeyboardProvider
    }
    return () => {
      try {
        KeyboardController.setDefaultMode();
      } catch {
        // ignore
      }
    };
  }, [enabled]);

  // No dependency array: Reanimated re-creates the reaction when `inset` (in the closure)
  // changes, and Reanimated 4.7+ warns that arrays are ignored on native.
  useAnimatedReaction(
    () => Math.max(-keyboardHeight.value - inset, 0),
    target => {
      if (!IS_ANDROID && !fallbackActive.value) keyboardLift.value = target;
    }
  );

  useGenericKeyboardHandler(
    {
      onStart: e => {
        'worklet';
        controllerEvents.value = true;
        if (!enabled || !IS_ANDROID) return;
        keyboardLift.value = Math.max(e.height - inset, 0);
      },
      onEnd: e => {
        'worklet';
        controllerEvents.value = true;
        if (!enabled || !IS_ANDROID) return;
        keyboardLift.value = Math.max(e.height - inset, 0);
      },
    },
    [enabled, inset]
  );

  const applyFallback = useCallback(() => {
    const keyboard = fallback.current;
    if (!keyboard) return;
    const animateTo = (lift: number) => {
      keyboardLift.value = withTiming(lift, { duration: FALLBACK_DURATION });
    };
    const anchor = anchorRef?.current;
    if (!anchor) {
      // Nothing to measure: assume the bar sits at the bottom of a window that does not resize.
      animateTo(Math.max(keyboard.keyboardHeight - inset, 0));
      return;
    }
    anchor.measureInWindow((_x, y, _width, height) => {
      const current = fallback.current;
      if (!current) return;
      animateTo(computeMeasuredKeyboardLift(y + height, current.keyboardTop, hideable));
    });
  }, [anchorRef, hideable, inset, keyboardLift]);

  // Fallback: when keyboard-controller events never arrived, size the lift from React
  // Native's own keyboard events and the bar's measured position. Measuring covers windows
  // that already shrink for the keyboard (Android adjustResize, a Modal's own window).
  useEffect(() => {
    if (!enabled) return;
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      if (controllerEvents.value || keyboardHeight.value !== 0) return;
      fallback.current = {
        keyboardTop: keyboardTopInWindow(event, Dimensions.get('window').height, safeBottom),
        keyboardHeight: event.endCoordinates.height,
      };
      fallbackActive.value = true;
      applyFallback();
    });
    const hide = Keyboard.addListener(IS_ANDROID ? 'keyboardDidHide' : 'keyboardWillHide', () => {
      if (!fallback.current) return;
      fallback.current = null;
      fallbackActive.value = false;
      keyboardLift.value = withTiming(0, { duration: FALLBACK_DURATION });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [
    applyFallback,
    controllerEvents,
    enabled,
    fallbackActive,
    keyboardHeight,
    keyboardLift,
    safeBottom,
  ]);

  /** Re-measure when the bar moves (the window resized after the keyboard event). */
  const onAnchorLayout = useCallback(() => {
    if (fallback.current) applyFallback();
  }, [applyFallback]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: enabled ? -keyboardLift.value : 0 }],
  }));

  return { style, onAnchorLayout };
}
