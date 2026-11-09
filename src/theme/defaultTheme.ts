import { defaultFontFamily } from './tokens';
import type { AiTheme } from './types';

export const lightTheme: AiTheme = {
  meta: { isDark: false },
  fontFamily: { ...defaultFontFamily },
  colors: {
    bg: { DEFAULT: '#FFFFFF' },
    text: {
      DEFAULT: '#111827',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
    },
    border: { DEFAULT: '#E5E7EB', subtle: 'rgba(0,0,0,0.08)' },
    surface: {
      raised: '#FFFFFF',
      card: '#FFFFFF',
      input: '#F3F4F6',
      code: '#F3F4F6',
      subtle: 'rgba(0,0,0,0.03)',
      stripe: 'rgba(0,0,0,0.015)',
      backdrop: 'rgba(0,0,0,0.45)',
    },
    bubble: {
      user: '#0166FE',
      userText: '#FFFFFF',
      assistant: '#F3F4F6',
      assistantText: '#111827',
    },
    primary: {
      DEFAULT: '#0166FE',
      600: '#0052CC',
      onPrimary: '#FFFFFF',
      subtle: 'rgba(1,102,254,0.1)',
    },
    error: { DEFAULT: '#EF4444', subtle: 'rgba(239,68,68,0.1)' },
    success: { DEFAULT: '#22C55E', subtle: 'rgba(34,197,94,0.1)' },
    warning: { DEFAULT: '#F59E0B', subtle: 'rgba(245,158,11,0.1)' },
    info: { DEFAULT: '#3B82F6', subtle: 'rgba(59,130,246,0.1)' },
  },
};

export const darkTheme: AiTheme = {
  meta: { isDark: true },
  fontFamily: { ...defaultFontFamily },
  colors: {
    bg: { DEFAULT: '#0B1220' },
    text: {
      DEFAULT: '#F9FAFB',
      300: '#4B5563',
      400: '#6B7280',
      500: '#9CA3AF',
    },
    border: { DEFAULT: '#374151', subtle: 'rgba(255,255,255,0.08)' },
    surface: {
      raised: '#1F2937',
      card: 'rgba(255,255,255,0.04)',
      input: '#1F2937',
      code: '#111827',
      subtle: 'rgba(255,255,255,0.04)',
      stripe: 'rgba(255,255,255,0.02)',
      backdrop: 'rgba(0,0,0,0.45)',
    },
    bubble: {
      user: '#3B82F6',
      userText: '#FFFFFF',
      assistant: '#1F2937',
      assistantText: '#F9FAFB',
    },
    primary: {
      DEFAULT: '#3B82F6',
      600: '#2563EB',
      onPrimary: '#FFFFFF',
      subtle: 'rgba(59,130,246,0.15)',
    },
    error: { DEFAULT: '#F87171', subtle: 'rgba(248,113,113,0.15)' },
    success: { DEFAULT: '#4ADE80', subtle: 'rgba(74,222,128,0.15)' },
    warning: { DEFAULT: '#FBBF24', subtle: 'rgba(251,191,36,0.15)' },
    info: { DEFAULT: '#60A5FA', subtle: 'rgba(96,165,250,0.15)' },
  },
};
