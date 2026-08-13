import { Keyboard, Platform } from 'react-native';
import { useEffect } from 'react';
import {
  useGenericKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

/** Keyboard open height (px). iOS + Android, matching MyExamy. */
export function useKeyboardOpenHeight() {
  const keyboardOpenHeight = useSharedValue(0);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

  useAnimatedReaction(
    () => {
      const h = keyboardHeight.value;
      if (h === 0) return 0;
      return Math.abs(h);
    },
    value => {
      if (Platform.OS === 'ios') {
        keyboardOpenHeight.value = value;
      }
    },
    []
  );

  useGenericKeyboardHandler(
    {
      onStart: e => {
        'worklet';
        keyboardOpenHeight.value = e.height;
      },
      onMove: e => {
        'worklet';
        keyboardOpenHeight.value = e.height;
      },
      onEnd: e => {
        'worklet';
        keyboardOpenHeight.value = e.height;
      },
    },
    []
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      keyboardOpenHeight.value = event.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOpenHeight.value = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOpenHeight]);

  return keyboardOpenHeight;
}
