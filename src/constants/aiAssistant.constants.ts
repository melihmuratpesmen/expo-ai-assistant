/**
 * Shared UI copy defaults. Prefer `strings` on AiAssistantProvider for overrides.
 */
export {
  defaultStrings,
  type AiStrings,
  type AiStringsOverride,
} from '../i18n/strings';

export const SHOW_AI_ACTIONS = false;

export const DEFAULT_SUGGESTIONS: import('../types/aiContext').AiSuggestion[] = [
  {
    id: 'help-overview',
    label: 'What can you do?',
    prompt: 'What can you help me with?',
    icon: 'sparkles',
  },
  {
    id: 'help-table',
    label: 'Show a table',
    prompt: 'Show students as a table',
    icon: 'grid-outline',
  },
  {
    id: 'help-summary',
    label: 'Quick summary',
    prompt: 'Give me a short summary for today.',
    icon: 'list-outline',
  },
];

/** @deprecated Use strings.welcomeTitle via useAiStrings() */
export const AI_WELCOME_TITLE = 'Hello!';
/** @deprecated Use strings.welcomeSubtitle via useAiStrings() */
export const AI_WELCOME_SUBTITLE = 'How can I help you today?';
/** @deprecated Use strings.disclaimer via useAiStrings() */
export const AI_DISCLAIMER = 'AI can make mistakes. Verify important information.';
