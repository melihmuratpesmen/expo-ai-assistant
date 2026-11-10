import { Keyboard, type EmitterSubscription, type KeyboardEvent, type View } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import {
  computeMeasuredKeyboardLift,
  keyboardTopInWindow,
  useKeyboardLift,
} from '../useScreenBottomKeyboardLift';

// Reanimated's mock creates a new shared value on every render; keep it across renders so the
// lift written by a keyboard event is still there when the style is recomputed.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  const { useRef } = jest.requireActual('react');
  return {
    ...actual,
    useSharedValue: <T,>(init: T) => useRef({ value: init }).current,
  };
});

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider initialMetrics={safeAreaMetrics}>{children}</SafeAreaProvider>;
}

function keyboardEvent(screenY: number, height: number): KeyboardEvent {
  return {
    duration: 0,
    easing: 'keyboard',
    endCoordinates: { screenX: 0, screenY, width: 390, height },
  } as KeyboardEvent;
}

function translateYOf(style: unknown): number {
  const transform = (style as { transform: Array<{ translateY: number }> }).transform;
  return transform[0]!.translateY;
}

describe('computeMeasuredKeyboardLift', () => {
  it('lifts by the overlap, letting the safe-area padding go behind the keyboard', () => {
    // Bar ends at the screen bottom (844), keyboard top at 508, 34pt safe area.
    expect(computeMeasuredKeyboardLift(844, 508, 34)).toBe(302);
  });

  it('does not lift a bar the window already moved above the keyboard', () => {
    // adjustResize / a Modal window: the bar already ends at the keyboard top.
    expect(computeMeasuredKeyboardLift(508, 508, 34)).toBe(0);
    expect(computeMeasuredKeyboardLift(480, 508, 0)).toBe(0);
  });
});

describe('keyboardTopInWindow', () => {
  it('uses screenY on iOS, where the window is the screen', () => {
    expect(keyboardTopInWindow(keyboardEvent(508, 336), 844, 34, 'ios')).toBe(508);
  });

  it('derives the top from the window height on Android', () => {
    // Measured on an API 34 emulator in Expo Go: the root starts below the 24dp status bar,
    // so screenY (577.9) is 24dp off from measureInWindow coordinates.
    expect(keyboardTopInWindow(keyboardEvent(577.9, 312.4), 866.3, 0, 'android')).toBeCloseTo(
      553.9
    );
    // Edge-to-edge: the window also covers the 24dp navigation bar the event height leaves out.
    expect(keyboardTopInWindow(keyboardEvent(577.9, 312.4), 914.3, 24, 'android')).toBeCloseTo(
      577.9
    );
  });
});

describe('useKeyboardLift fallback (keyboard-controller events missing)', () => {
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  let addListener: jest.SpyInstance;

  beforeEach(() => {
    listeners.clear();
    addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      listener: (event: KeyboardEvent) => void
    ) => {
      listeners.set(name, listener);
      return { remove: () => listeners.delete(name) } as unknown as EmitterSubscription;
    }) as typeof Keyboard.addListener);
  });

  afterEach(() => addListener.mockRestore());

  function anchorAt(y: number, height: number) {
    const measureInWindow = jest.fn((callback: (...args: number[]) => void) =>
      callback(0, y, 390, height)
    );
    return { current: { measureInWindow } as unknown as View };
  }

  it('lifts the measured bar to the keyboard top and drops back on hide', async () => {
    const anchorRef = anchorAt(744, 100); // bar from 744 to 844
    const { result, rerender } = await renderHook(
      () => useKeyboardLift(true, undefined, anchorRef),
      {
        wrapper,
      }
    );
    expect(translateYOf(result.current.style)).toBe(-0);

    await act(async () => listeners.get('keyboardDidShow')!(keyboardEvent(508, 336)));
    await rerender({});
    expect(translateYOf(result.current.style)).toBe(-302);

    await act(async () => listeners.get('keyboardWillHide')!(keyboardEvent(844, 0)));
    await rerender({});
    expect(translateYOf(result.current.style)).toBe(-0);
  });

  it('re-measures when the window resized after the keyboard event', async () => {
    const anchorRef = anchorAt(744, 100);
    const { result, rerender } = await renderHook(
      () => useKeyboardLift(true, undefined, anchorRef),
      {
        wrapper,
      }
    );

    await act(async () => listeners.get('keyboardDidShow')!(keyboardEvent(508, 336)));
    // The window shrank: the untransformed bar now ends at the keyboard top.
    (anchorRef.current.measureInWindow as jest.Mock).mockImplementation(
      (callback: (...args: number[]) => void) => callback(0, 408, 390, 100)
    );
    await act(async () => result.current.onAnchorLayout());
    await rerender({});
    expect(translateYOf(result.current.style)).toBe(-0);
  });

  it('does nothing when disabled', async () => {
    await renderHook(() => useKeyboardLift(false, undefined, anchorAt(744, 100)), { wrapper });
    expect(listeners.has('keyboardDidShow')).toBe(false);
  });
});
