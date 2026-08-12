import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, Pressable, Keyboard, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius, fontSize } from '../theme/tokens';
import { useAiKeyboardLift } from './useAiKeyboardLift';
import { AI_BUTTON_SIZE, type AiButtonPoint } from './aiButtonPosition';

export interface AiInputBubbleProps {
  visible: boolean;
  anchor: AiButtonPoint;
  onSend: (text: string) => void;
  onExpand: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
}

const BUBBLE_WIDTH = 280;
const BUBBLE_HEIGHT = 48;
const BUBBLE_OFFSET_ABOVE_BUTTON = 56;

export const AiInputBubble: React.FC<AiInputBubbleProps> = ({
  visible,
  anchor,
  onSend,
  onExpand,
  onClose,
  placeholder: placeholderProp,
}) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const { isDark } = theme.meta;
  const placeholder = placeholderProp ?? strings.quickAskPlaceholder;
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = React.useState('');

  const anchorY = useSharedValue(anchor.y);

  useEffect(() => {
    anchorY.value = anchor.y;
  }, [anchor.y, anchorY]);

  const keyboardLiftStyle = useAiKeyboardLift(anchorY, visible);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
    setValue('');
    return undefined;
  }, [visible]);

  const layout = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const left = Math.min(
      Math.max(anchor.x + AI_BUTTON_SIZE - BUBBLE_WIDTH, spacing[4]),
      screenWidth - BUBBLE_WIDTH - spacing[4]
    );
    const top = Math.max(anchor.y - BUBBLE_OFFSET_ABOVE_BUTTON, spacing[4]);
    return { left, top };
  }, [anchor.x, anchor.y]);

  if (!visible) return null;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onSend(trimmed);
    setValue('');
  };

  const handleExpand = () => {
    Keyboard.dismiss();
    onExpand(value);
    setValue('');
  };

  return (
    <Animated.View
      style={[
        styles.bubble,
        keyboardLiftStyle,
        {
          left: layout.left,
          top: layout.top,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          { color: theme.colors.text.DEFAULT, fontFamily: theme.fontFamily.regular },
        ]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text[500]}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        multiline={false}
      />
      <Pressable
        onPress={handleExpand}
        hitSlop={8}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={strings.accessibilityExpand}
      >
        <Ionicons name="expand-outline" size={18} color={theme.colors.primary.DEFAULT} />
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={styles.iconButton}>
        <Ionicons name="close" size={18} color={theme.colors.text[500]} />
      </Pressable>
      <Pressable
        onPress={handleSend}
        disabled={!value.trim()}
        style={[
          styles.sendButton,
          { backgroundColor: value.trim() ? theme.colors.primary.DEFAULT : theme.colors.text[300] },
        ]}
      >
        <Ionicons name="arrow-up" size={16} color={theme.colors.primary.onPrimary} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    paddingLeft: spacing[3],
    paddingRight: spacing[1.5],
    paddingVertical: spacing[1.5],
    zIndex: 59,
    elevation: 59,
    gap: spacing[1],
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: spacing[1.5],
  },
  iconButton: {
    padding: spacing[1],
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
