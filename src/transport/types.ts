import type { AiChatMessage, AiConversationSummary, AiFunctionCall } from '../types/aiChat';

/** Incremental stream callbacks used by transports. */
export interface AiTransportStreamHandlers {
  /** Called with each text delta and the full assistant text so far. */
  onTextDelta?: (delta: string, snapshot: string) => void;
  /** Optional provider reasoning / thinking stream. */
  onReasoningDelta?: (delta: string, snapshot: string) => void;
  onToolStart?: (tool: Pick<AiFunctionCall, 'id' | 'name' | 'label' | 'reasoning'>) => void;
  onToolComplete?: (tool: Pick<AiFunctionCall, 'id' | 'name' | 'frontendData'>) => void;
  onError?: (message: string) => void;
  onDone?: (result: {
    text: string;
    messageId?: string;
    conversationId?: string;
  }) => void;
}

export interface AiTransportStreamParams {
  /** Prior messages in the conversation (excluding the new user turn). */
  messages: AiChatMessage[];
  /** New user message text. */
  userMessage: string;
  conversationId?: string | null;
  signal?: AbortSignal;
  handlers: AiTransportStreamHandlers;
}

export interface AiTransportStreamResult {
  text: string;
  messageId?: string;
  conversationId?: string;
}

export interface AiTransportHistoryResult {
  sessionId: string;
  messages: AiChatMessage[];
}

/**
 * Pluggable backend contract.
 * Provide your own or use `createOpenAICompatibleTransport`.
 */
export interface AiTransport {
  /** Stream an assistant reply for a user message. */
  streamChat: (params: AiTransportStreamParams) => Promise<AiTransportStreamResult>;

  /** Optional persisted session list. */
  listSessions?: (signal?: AbortSignal) => Promise<AiConversationSummary[]>;

  /** Optional history loader for a session. */
  getHistory?: (
    sessionId: string,
    signal?: AbortSignal
  ) => Promise<AiTransportHistoryResult>;

  /** Optional session delete. */
  deleteSession?: (sessionId: string, signal?: AbortSignal) => Promise<void>;
}
