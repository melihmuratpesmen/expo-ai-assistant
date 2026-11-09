import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AiChatController } from '../core/AiChatController';
import { useAiChatSelector } from '../hooks/useAiChat';
import { useScreenBottomKeyboardLift } from '../hooks/useScreenBottomKeyboardLift';
import { useAiStrings } from '../i18n/AiStringsContext';
import { useAiSlots, type AiInputSlotProps } from '../provider/slots';
import { useAiTheme } from '../theme/AiThemeContext';
import { fontSize, spacing } from '../theme/tokens';
import { AiChatInput } from './AiChatInput';
import { AiText } from './AiText';

/** `slots.renderInput` when provided, otherwise `AiChatInput` (with `renderInputAccessory`). */
export function AiComposer(props: AiInputSlotProps) {
  const { renderInput, renderInputAccessory } = useAiSlots();
  if (renderInput) return <>{renderInput(props)}</>;
  const isStreaming = !!props.isStreaming;
  return (
    <AiChatInput
      {...props}
      leftAccessory={renderInputAccessory?.({ side: 'left', isStreaming })}
      rightAccessory={renderInputAccessory?.({ side: 'right', isStreaming })}
    />
  );
}

export interface AiChatFooterProps {
  controller: AiChatController;
  placeholder?: string;
  /** Padding under the composer. Defaults to the safe-area bottom inset (min 8). */
  bottomPadding?: number;
  /** Space already below the footer (tab bar…), used by the keyboard lift. */
  bottomInset?: number;
  /** Lift above the keyboard with translateY. Default true. */
  liftWithKeyboard?: boolean;
  /** Hairline above the footer. */
  bordered?: boolean;
  showDisclaimer?: boolean;
  TextInputComponent?: React.ComponentType<TextInputProps>;
}

/**
 * Composer area shared by the surfaces: error line, input (or `renderInput`
 * slot), disclaimer and keyboard lift. Subscribes only to `isStreaming` and
 * `error`, so streamed tokens do not re-render it.
 */
export function AiChatFooter({
  controller,
  placeholder,
  bottomPadding,
  bottomInset,
  liftWithKeyboard = true,
  bordered = false,
  showDisclaimer = true,
  TextInputComponent,
}: AiChatFooterProps) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const insets = useSafeAreaInsets();
  const isStreaming = useAiChatSelector(controller, state => state.isStreaming);
  const error = useAiChatSelector(controller, state => state.error);
  const editing = useAiChatSelector(controller, state => state.editing);
  const keyboardLiftStyle = useScreenBottomKeyboardLift(
    liftWithKeyboard,
    bottomInset && bottomInset > 0 ? bottomInset : undefined
  );

  const handleSend = useCallback(
    (text: string) => {
      // submitEdit falls back to sendMessage when nothing is being edited.
      void controller.submitEdit(text);
    },
    [controller]
  );

  return (
    <Animated.View style={[{ backgroundColor: theme.colors.bg.DEFAULT }, keyboardLiftStyle]}>
      <View
        style={[
          styles.footer,
          bordered && [styles.bordered, { borderTopColor: theme.colors.border.DEFAULT }],
          {
            backgroundColor: theme.colors.bg.DEFAULT,
            paddingBottom: bottomPadding ?? Math.max(insets.bottom, spacing[2]),
          },
        ]}
      >
        {error ? (
          <AiText
            accessibilityLiveRegion="polite"
            style={[styles.error, { color: theme.colors.error.DEFAULT }]}
          >
            {error}
          </AiText>
        ) : null}
        {editing ? (
          <View style={styles.editingBar}>
            <Ionicons name="create-outline" size={14} color={theme.colors.primary.DEFAULT} />
            <AiText
              variant="caption"
              numberOfLines={1}
              style={[styles.editingText, { color: theme.colors.text[500] }]}
            >
              {strings.editingMessage}
            </AiText>
            <Pressable
              onPress={controller.cancelEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={strings.cancelEdit}
            >
              <Ionicons name="close" size={16} color={theme.colors.text[500]} />
            </Pressable>
          </View>
        ) : null}
        <AiComposer
          // Remount with the edited text as the new starting value.
          key={editing?.messageId ?? 'compose'}
          defaultValue={editing?.text}
          autoFocus={!!editing}
          onSend={handleSend}
          disabled={false}
          placeholder={placeholder}
          isStreaming={isStreaming}
          onStop={controller.cancelStreaming}
          TextInputComponent={TextInputComponent}
        />
        {showDisclaimer ? (
          <AiText style={[styles.disclaimer, { color: theme.colors.text[400] }]}>
            {strings.disclaimer}
          </AiText>
        ) : null}
      </View>
      {liftWithKeyboard ? (
        // Opaque fill so the lifted footer never shows the chat through the keyboard gap.
        <View
          pointerEvents="none"
          style={[styles.keyboardFill, { backgroundColor: theme.colors.bg.DEFAULT }]}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: spacing[2],
    gap: spacing[1.5],
  },
  bordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[1],
  },
  editingText: {
    flex: 1,
  },
  error: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    fontSize: fontSize.xs,
  },
  keyboardFill: {
    height: 420,
    marginBottom: -420,
  },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    fontSize: fontSize.xxs,
  },
});
