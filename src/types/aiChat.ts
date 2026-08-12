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
  suggestions?: AiSuggestion[];
  actions?: AiActionProposalRaw[];
  functionCalls?: AiFunctionCall[];
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

export type ContentBlockDTO = {
  type: string;
  content?: string;
  [key: string]: unknown;
};

/** Common history role encodings used by some backends. */
export type HistoryRoleDTO = 'USER' | 'MODEL' | 'user' | 'assistant';

export interface HistoryFunctionCallDTO {
  id?: string;
  callId?: string;
  functionName?: string;
  functionLabel?: string;
  reasoning?: string;
  frontendData?: unknown;
}

export interface HistoryMessageItemDTO {
  role: HistoryRoleDTO;
  content: string | ContentBlockDTO[];
  timestamp: number;
  imageUrl?: string | null;
  functionCalls?: HistoryFunctionCallDTO[] | null;
}

/** @deprecated Use HistoryRoleDTO */
export type ChatbotMessageRoleDTO = HistoryRoleDTO;
