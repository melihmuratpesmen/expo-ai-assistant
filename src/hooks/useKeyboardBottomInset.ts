import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Bottom inset equal to the open keyboard height.
 * When the keyboard is closed, returns 0 so callers can fall back to safe-area padding.
 *
 * Prefer this over KeyboardAvoidingView inside RN Modal / custom chat footers —
 * Expo Go and modal surfaces often do not resize the window on Android.
 */
export function useKeyboardBottomInset(enabled = true): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      setHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled]);

  return enabled ? height : 0;
}

/** Padding under a bottom chat input: keyboard height when open, else safe-area. */
export function chatInputBottomPadding(keyboardHeight: number, safeBottom: number, min = 8): number {
  if (keyboardHeight > 0) {
    return keyboardHeight + min;
  }
  return Math.max(safeBottom, min);
}
