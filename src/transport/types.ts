import type {
  AiChatMessage,
  AiConversationSummary,
  AiFunctionCall,
  AiTokenUsage,
} from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';

/** Incremental stream callbacks used by transports. */
export interface AiTransportStreamHandlers {
  /** Called with each text delta and the full assistant text so far. */
  onTextDelta?: (delta: string, snapshot: string) => void;
  /** Optional provider reasoning / thinking stream. */
  onReasoningDelta?: (delta: string, snapshot: string) => void;
  onToolStart?: (tool: Pick<AiFunctionCall, 'id' | 'name' | 'label' | 'reasoning'>) => void;
  onToolComplete?: (tool: Pick<AiFunctionCall, 'id' | 'name' | 'frontendData'>) => void;
  /** A tool call failed; the card shows the error. */
  onToolError?: (tool: { id: string; name: string; error: string }) => void;
  /** Follow-up prompts to offer under the reply. */
  onSuggestions?: (suggestions: AiSuggestion[]) => void;
  /** Non-fatal problem worth surfacing. Fatal errors should be thrown instead. */
  onError?: (message: string) => void;
  onDone?: (result: { text: string; messageId?: string; conversationId?: string }) => void;
}

export interface AiTransportStreamParams {
  /** Prior messages in the conversation (excluding the new user turn). */
  messages: AiChatMessage[];
  /** New user message text. */
  userMessage: string;
  conversationId?: string | null;
  /** App context for this request (current screen, user locale, …) from `AiAssistantProvider`'s `context`. */
  context?: Record<string, unknown>;
  signal?: AbortSignal;
  handlers: AiTransportStreamHandlers;
}

export interface AiTransportStreamResult {
  text: string;
  messageId?: string;
  conversationId?: string;
  usage?: AiTokenUsage;
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
  getHistory?: (sessionId: string, signal?: AbortSignal) => Promise<AiTransportHistoryResult>;

  /** Optional session delete. */
  deleteSession?: (sessionId: string, signal?: AbortSignal) => Promise<void>;
}
