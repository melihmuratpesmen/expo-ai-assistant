import type { AiSuggestion } from '../types/aiContext';

/**
 * Generic starter prompts for empty conversations. Pass your own
 * `suggestions` to the surfaces for product-specific ones.
 */
export const DEFAULT_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'capabilities',
    label: 'What can you do?',
    prompt: 'What can you help me with?',
    icon: 'sparkles',
  },
  {
    id: 'explain',
    label: 'Explain simply',
    prompt: 'Explain a complex topic to me in simple terms.',
    icon: 'bulb-outline',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm ideas',
    prompt: 'Help me brainstorm a few ideas.',
    icon: 'list-outline',
  },
];
