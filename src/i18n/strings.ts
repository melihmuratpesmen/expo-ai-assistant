export interface AiStrings {
  assistantTitle: string;
  historyTitle: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  disclaimer: string;
  inputPlaceholder: string;
  quickAskPlaceholder: string;
  continuePlaceholder: string;
  emptyHistory: string;
  emptyFloatingPrompt: string;
  preparingReply: string;
  deleteConversationTitle: string;
  deleteConversationMessage: (title: string) => string;
  cancel: string;
  delete: string;
  accessibilityAssistant: string;
  accessibilityExpand: string;
  accessibilityClose: string;
  errorGeneric: string;
  errorHistory: string;
  errorSessions: string;
  errorStream: string;
  toolRunning: string;
  toolDone: string;
  toolError: string;
  noResults: string;
  noDisplayData: string;
  send: string;
  stopGenerating: string;
  stoppedGenerating: string;
  copy: string;
  copied: string;
  regenerate: string;
  reasoning: string;
}

export const defaultStrings: AiStrings = {
  assistantTitle: 'AI Assistant',
  historyTitle: 'Chat history',
  welcomeTitle: 'Hello!',
  welcomeSubtitle: 'How can I help you today?',
  disclaimer: 'AI can make mistakes. Verify important information.',
  inputPlaceholder: 'Type a message...',
  quickAskPlaceholder: 'Ask anything...',
  continuePlaceholder: 'Continue...',
  emptyHistory: 'No conversations yet.',
  emptyFloatingPrompt: 'Ask a question...',
  preparingReply: 'Preparing a reply...',
  deleteConversationTitle: 'Delete conversation',
  deleteConversationMessage: title => `Delete “${title}”?`,
  cancel: 'Cancel',
  delete: 'Delete',
  accessibilityAssistant: 'AI Assistant',
  accessibilityExpand: 'Expand',
  accessibilityClose: 'Close',
  errorGeneric: 'Something went wrong.',
  errorHistory: 'Could not load history.',
  errorSessions: 'Could not load conversations.',
  errorStream: 'Sorry, something went wrong while generating a reply. Please try again.',
  toolRunning: 'Running...',
  toolDone: 'Done',
  toolError: 'Error',
  noResults: 'No results found.',
  noDisplayData: 'Nothing to display.',
  send: 'Send',
  stopGenerating: 'Stop generating',
  stoppedGenerating: 'Stopped',
  copy: 'Copy',
  copied: 'Copied',
  regenerate: 'Regenerate',
  reasoning: 'Thinking',
};

export type AiStringsOverride = {
  [K in keyof AiStrings]?: AiStrings[K];
};

export function mergeStrings(override?: AiStringsOverride): AiStrings {
  if (!override) return defaultStrings;
  return { ...defaultStrings, ...override };
}
