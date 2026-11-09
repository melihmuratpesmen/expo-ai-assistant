export interface AiThemeColors {
  bg: { DEFAULT: string };
  text: {
    DEFAULT: string;
    300: string;
    400: string;
    500: string;
  };
  border: {
    DEFAULT: string;
    /** Hairlines inside cards and tables. */
    subtle: string;
  };
  /** Backgrounds layered on top of `bg`. */
  surface: {
    /** Suggestion tiles, history cards, the floating input bubble. */
    raised: string;
    /** Tool call cards and metric blocks. */
    card: string;
    /** Chat input field. */
    input: string;
    /** Code blocks and inline code. */
    code: string;
    /** Table headers, reasoning panel. */
    subtle: string;
    /** Alternate table rows. */
    stripe: string;
    /** Dimmed backdrop behind the modal card. */
    backdrop: string;
  };
  /** Message bubbles. User colors default to `primary`. */
  bubble: {
    user: string;
    userText: string;
    assistant: string;
    assistantText: string;
  };
  primary: {
    DEFAULT: string;
    600: string;
    onPrimary: string;
    subtle: string;
  };
  error: { DEFAULT: string; subtle: string };
  success: { DEFAULT: string; subtle: string };
  warning: { DEFAULT: string; subtle: string };
  info: { DEFAULT: string; subtle: string };
}

export interface AiThemeFontFamily {
  regular: string;
  medium: string;
  semibold: string;
  /** Code blocks. Defaults to the platform monospace font. */
  mono: string;
}

export interface AiTheme {
  colors: AiThemeColors;
  fontFamily: AiThemeFontFamily;
  meta: { isDark: boolean };
}

export type AiThemeOverride = {
  colors?: DeepPartial<AiThemeColors>;
  fontFamily?: Partial<AiThemeFontFamily>;
  meta?: Partial<AiTheme['meta']>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
