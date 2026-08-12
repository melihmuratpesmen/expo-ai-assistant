import { Keyboard, Platform } from 'react-native';
import { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';

/** Keyboard open height via RN Keyboard API (no keyboard-controller peer). */
export function useKeyboardOpenHeight() {
  const keyboardOpenHeight = useSharedValue(0);

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
