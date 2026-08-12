import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAiTheme } from '../theme/AiThemeContext';
import { spacing } from '../theme/tokens';

function Dot({ delayMs, color }: { delayMs: number; color: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })),
        -1,
        false
      )
    );
  }, [delayMs, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Animated "assistant is typing" indicator. */
export function AiTypingIndicator() {
  const theme = useAiTheme();
  const color = theme.colors.text[500];

  return (
    <View style={styles.row} accessibilityLabel="Assistant is typing">
      <Dot delayMs={0} color={color} />
      <Dot delayMs={140} color={color} />
      <Dot delayMs={280} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[1],
    minHeight: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
