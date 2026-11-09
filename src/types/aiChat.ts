import type { AiSuggestion } from './aiContext';
import type { ContentBlock } from './contentBlock';

export type AiMessageRole = 'user' | 'assistant';
export type AiMessageStatus = 'sending' | 'streaming' | 'sent' | 'error' | 'stopped';
export type AiFunctionCallStatus = 'executing' | 'completed' | 'error';

export interface AiFunctionCall {
  id: string;
  name: string;
  label?: string;
  status: AiFunctionCallStatus;
  reasoning?: string;
  frontendData?: unknown;
  /** Failure message when `status` is `error`. */
  error?: string;
}

export type AiMessageFeedback = 'up' | 'down';

export interface AiTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiActionProposalRaw {
  type: string;
  label?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  blocks?: ContentBlock[];
  createdAt: number;
  status?: AiMessageStatus;
  /** Streaming / provider reasoning text (optional). */
  reasoning?: string;
  /** Follow-up prompts offered under the reply. */
  suggestions?: AiSuggestion[];
  actions?: AiActionProposalRaw[];
  functionCalls?: AiFunctionCall[];
  /** The user's rating of an assistant reply. */
  feedback?: AiMessageFeedback;
  /** Token usage reported by the transport. */
  usage?: AiTokenUsage;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  lastMessagePreview?: string;
  updatedAt: number;
  messageCount?: number;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: number;
  updatedAt: number;
}
