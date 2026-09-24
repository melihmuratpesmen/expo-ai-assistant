import React, { useCallback } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';
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

/** `slots.renderInput` when provided, otherwise `AiChatInput`. */
export function AiComposer(props: AiInputSlotProps) {
  const { renderInput } = useAiSlots();
  if (renderInput) return <>{renderInput(props)}</>;
  return <AiChatInput {...props} />;
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
  const keyboardLiftStyle = useScreenBottomKeyboardLift(
    liftWithKeyboard,
    bottomInset && bottomInset > 0 ? bottomInset : undefined
  );

  const handleSend = useCallback(
    (text: string) => {
      void controller.sendMessage(text);
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
        <AiComposer
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
