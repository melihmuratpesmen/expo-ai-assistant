import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { fontSize } from '../theme/tokens';

type Variant = 'body' | 'caption' | 'title';

interface AiTextProps extends TextProps {
  variant?: Variant;
  weight?: 'regular' | 'medium' | 'semibold';
}

export function AiText({
  variant = 'body',
  weight = 'regular',
  style,
  ...rest
}: AiTextProps) {
  const theme = useAiTheme();
  const size =
    variant === 'title' ? fontSize.base : variant === 'caption' ? fontSize.xs : fontSize.sm;

  return (
    <Text
      style={[
        styles.base,
        {
          color: theme.colors.text.DEFAULT,
          fontSize: size,
          fontFamily: theme.fontFamily[weight],
        },
        style as TextStyle,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    lineHeight: 20,
  },
});
