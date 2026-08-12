import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { spacing, radius, fontSize } from '../theme/tokens';

export interface AiChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** When true, shows a stop button instead of (or beside) send. */
  isStreaming?: boolean;
  onStop?: () => void;
  /** Inject a custom TextInput (e.g. BottomSheetTextInput from the bottom-sheet entry). */
  TextInputComponent?: React.ComponentType<TextInputProps>;
}

export const AiChatInput: React.FC<AiChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder: placeholderProp,
  autoFocus = false,
  isStreaming = false,
  onStop,
  TextInputComponent,
}) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const { isDark } = theme.meta;
  const [value, setValue] = useState('');
  const Input = TextInputComponent ?? TextInput;
  const placeholder = placeholderProp ?? strings.inputPlaceholder;

  const canSend = value.trim().length > 0 && !disabled && !isStreaming;
  const showStop = isStreaming && typeof onStop === 'function';

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <Input
        style={[
          styles.input,
          { color: theme.colors.text.DEFAULT, fontFamily: theme.fontFamily.regular },
        ]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text[500]}
        multiline
        autoFocus={autoFocus}
        onSubmitEditing={handleSend}
        editable={!disabled && !isStreaming}
      />
      {showStop ? (
        <Pressable
          onPress={onStop}
          style={[styles.sendButton, { backgroundColor: theme.colors.error.DEFAULT }]}
          accessibilityRole="button"
          accessibilityLabel={strings.stopGenerating}
        >
          <Ionicons name="stop" size={16} color={theme.colors.primary.onPrimary} />
        </Pressable>
      ) : (
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? theme.colors.primary.DEFAULT : theme.colors.text[300],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={strings.send}
        >
          <Ionicons name="arrow-up" size={20} color={theme.colors.primary.onPrimary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    paddingLeft: spacing[4],
    paddingRight: spacing[1.5],
    paddingVertical: spacing[1.5],
    marginHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    maxHeight: 120,
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    marginRight: spacing[2],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
