import type { ViewStyle } from 'react-native';

/**
 * Fills the parent, on every React Native version.
 *
 * Use this instead of `StyleSheet.absoluteFillObject`: React Native 0.88 (Expo SDK 58)
 * removed it, and spreading the missing value silently drops the layout.
 */
export const absoluteFill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const satisfies ViewStyle;
