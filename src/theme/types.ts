export interface AiThemeColors {
  bg: { DEFAULT: string };
  text: {
    DEFAULT: string;
    300: string;
    400: string;
    500: string;
  };
  border: { DEFAULT: string };
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
