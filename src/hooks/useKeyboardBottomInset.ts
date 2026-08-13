import { useScreenBottomKeyboardLift } from './useScreenBottomKeyboardLift';

/**
 * @deprecated Use `useScreenBottomKeyboardLift` (translateY, MyExamy pattern).
 * Kept so existing imports continue to typecheck.
 */
export function useKeyboardBottomInset(_enabled = true): number {
  return 0;
}

/** @deprecated Footer padding should stay as safe-area only; keyboard lift is translateY. */
export function chatInputBottomPadding(
  _keyboardHeight: number,
  safeBottom: number,
  min = 8
): number {
  return Math.max(safeBottom, min);
}

export { useScreenBottomKeyboardLift };
