import type { AiChatMessage, AiTokenUsage } from '../types/aiChat';
import {
  createAbortError,
  joinUrl,
  resolveBearerHeaders,
  subscribeSseText,
  SseDataParser,
} from './http';
import type { AiTransport, AiTransportStreamParams, AiTransportStreamResult } from './types';

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** Chat Completions message shapes sent to the provider. */
export type OpenAIChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface OpenAICompatibleToolContext {
  signal?: AbortSignal;
  conversationId?: string | null;
  /** App context passed to the request (see `AiAssistantProvider`'s `context`). */
  context?: Record<string, unknown>;
}

/** A function the model may call; it runs on the device. */
export interface OpenAICompatibleTool<Args = Record<string, unknown>, Result = unknown> {
  name: string;
  description?: string;
  /** JSON Schema of the arguments object. */
  parameters?: Record<string, unknown>;
  /** Title of the tool card (defaults to `name`). */
  label?: string;
  /** Runs the tool. The result is sent back to the model as JSON. Throw to report a failure. */
  execute: (args: Args, context: OpenAICompatibleToolContext) => Promise<Result> | Result;
  /** Data shown in the tool card (`frontendData`). Defaults to the result; return undefined for none. */
  toFrontendData?: (result: Result, args: Args) => unknown;
}

export interface OpenAICompatibleTransportOptions {
  /**
   * API root including version segment, e.g.
   * `https://api.openai.com/v1` or any OpenAI-compatible gateway / proxy.
   */
  baseUrl?: string;
  /**
   * API key provider, called per request. Omit it when `baseUrl` points at
   * your own proxy that adds the key server-side (recommended for production:
   * anything in the app bundle, including `EXPO_PUBLIC_*` variables, can be
   * extracted by users).
   */
  apiKey?: () => Promise<string | null> | string | null;
  /** Chat model id (required for OpenAI-compatible backends). */
  model: string;
  /** Defaults to `/chat/completions`. */
  chatPath?: string;
  /** Extra static or dynamic headers. */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  temperature?: number;
  /** Called on HTTP 401. */
  onUnauthorized?: () => void;
  /** Map library messages → provider message payload (advanced). */
  mapMessages?: (messages: AiChatMessage[], userMessage: string) => OpenAIChatMessage[];
  /** Optional system prompt prepended to every request. */
  systemPrompt?: string;
  /**
   * Tools the model can call. Tool calls are executed on the device, shown as
   * tool cards, and their results are sent back until the model answers.
   */
  tools?: OpenAICompatibleTool<any, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Passed as `tool_choice`. */
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  /** Maximum tool-call rounds per reply. Default 5. */
  maxToolRoundtrips?: number;
  /**
   * Extra request body fields (`max_tokens`, `top_p`, provider-specific
   * options…). Merged last, so they can override defaults.
   */
  extraBody?:
    | Record<string, unknown>
    | ((params: AiTransportStreamParams) => Record<string, unknown> | undefined);
  /** Ask for token usage (`stream_options.include_usage`); not every compatible provider supports it. */
  includeUsage?: boolean;
  /**
   * Turn the request `context` into a system message. Default: JSON of the
   * context. Return undefined to leave it out.
   */
  formatContext?: (context: Record<string, unknown>) => string | undefined;
  /** Request timeout in ms. Default 300000. */
  timeoutMs?: number;
}

const DEFAULT_MAX_TOOL_ROUNDTRIPS = 5;

function defaultFormatContext(context: Record<string, unknown>): string | undefined {
  const keys = Object.keys(context);
  if (keys.length === 0) return undefined;
  return `Context from the app (JSON): ${JSON.stringify(context)}`;
}

function defaultMapMessages(
  messages: AiChatMessage[],
  userMessage: string,
  systemPrompt?: string,
  contextText?: string
): OpenAIChatMessage[] {
  const mapped: OpenAIChatMessage[] = [];
  if (systemPrompt?.trim()) {
    mapped.push({ role: 'system', content: systemPrompt.trim() });
  }
  if (contextText) {
    mapped.push({ role: 'system', content: contextText });
  }
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    // Empty turns (failed / stopped before output) carry no context for the model.
    if (!message.content.trim()) continue;
    mapped.push({ role: message.role, content: message.content });
  }
  mapped.push({ role: 'user', content: userMessage });
  return mapped;
}

function isAbortError(error: unknown): boolean {
  return (error as Error | undefined)?.name === 'AbortError';
}

interface StreamDelta {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface ChatChunk {
  id?: unknown;
  error?: { message?: string } | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  choices?: Array<{ delta?: StreamDelta; message?: { content?: string } }>;
}

/**
 * Default public transport: OpenAI Chat Completions streaming
 * (`POST /chat/completions` with `stream: true`).
 *
 * Works with OpenAI and compatible providers (Azure OpenAI-style gateways,
 * Groq, Together, Fireworks, OpenRouter, DeepSeek, local proxies, etc.).
 * Streams text, reasoning (`reasoning_content` / `reasoning`) and — with
 * `tools` — runs function calls on the device.
 */
export function createOpenAICompatibleTransport(
  options: OpenAICompatibleTransportOptions
): AiTransport {
  const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
  const chatPath = options.chatPath ?? '/chat/completions';

  return {
    async streamChat(params: AiTransportStreamParams): Promise<AiTransportStreamResult> {
      const { handlers, signal } = params;
      const headers = await resolveBearerHeaders({
        apiKey: options.apiKey,
        getHeaders: options.getHeaders,
      });
      headers['Content-Type'] = 'application/json';
      headers.Accept = 'text/event-stream';

      const contextText = params.context
        ? (options.formatContext ?? defaultFormatContext)(params.context)
        : undefined;
      const conversation: OpenAIChatMessage[] = options.mapMessages
        ? options.mapMessages(params.messages, params.userMessage)
        : defaultMapMessages(
            params.messages,
            params.userMessage,
            options.systemPrompt,
            contextText
          );

      const tools = options.tools ?? [];
      const toolDefinitions = tools.length
        ? tools.map(tool => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters ?? { type: 'object', properties: {} },
            },
          }))
        : undefined;
      const extraBody =
        typeof options.extraBody === 'function' ? options.extraBody(params) : options.extraBody;
      const maxRoundtrips = options.maxToolRoundtrips ?? DEFAULT_MAX_TOOL_ROUNDTRIPS;

      let snapshot = '';
      let reasoning = '';
      let conversationId = params.conversationId ?? undefined;
      let messageId: string | undefined;
      let usage: AiTokenUsage | undefined;
      let separateNextText = false;

      const appendText = (delta: string) => {
        // Keep text from different tool rounds apart.
        const text = separateNextText && snapshot ? `\n\n${delta}` : delta;
        separateNextText = false;
        snapshot += text;
        handlers.onTextDelta?.(text, snapshot);
      };

      const streamRound = async () => {
        const parser = new SseDataParser();
        const toolCalls = new Map<number, OpenAIToolCall>();
        let roundText = '';
        let streamError: string | undefined;

        const handlePayload = (data: string) => {
          if (!data || data === '[DONE]') return;
          let json: ChatChunk;
          try {
            json = JSON.parse(data) as ChatChunk;
          } catch {
            return;
          }

          if (typeof json.id === 'string' && !messageId) {
            messageId = json.id;
            conversationId = conversationId ?? json.id;
          }
          if (json.error && typeof json.error === 'object') {
            streamError = streamError ?? json.error.message ?? 'Provider error';
            return;
          }
          if (json.usage) {
            usage = {
              promptTokens: (usage?.promptTokens ?? 0) + (json.usage.prompt_tokens ?? 0),
              completionTokens:
                (usage?.completionTokens ?? 0) + (json.usage.completion_tokens ?? 0),
              totalTokens: (usage?.totalTokens ?? 0) + (json.usage.total_tokens ?? 0),
            };
          }

          const choice = json.choices?.[0];
          const delta = choice?.delta;
          const reasoningDelta = delta?.reasoning_content ?? delta?.reasoning;
          if (typeof reasoningDelta === 'string' && reasoningDelta.length > 0) {
            reasoning += reasoningDelta;
            handlers.onReasoningDelta?.(reasoningDelta, reasoning);
          }

          const text = delta?.content ?? choice?.message?.content;
          if (typeof text === 'string' && text.length > 0) {
            roundText += text;
            appendText(text);
          }

          for (const part of delta?.tool_calls ?? []) {
            const index = part.index ?? 0;
            const call = toolCalls.get(index) ?? {
              id: '',
              type: 'function' as const,
              function: { name: '', arguments: '' },
            };
            if (part.id) call.id = part.id;
            if (part.function?.name) call.function.name += part.function.name;
            if (part.function?.arguments) call.function.arguments += part.function.arguments;
            toolCalls.set(index, call);
          }
        };

        const body = {
          model: options.model,
          stream: true,
          temperature: options.temperature,
          messages: conversation,
          tools: toolDefinitions,
          tool_choice: toolDefinitions ? options.toolChoice : undefined,
          stream_options: options.includeUsage ? { include_usage: true } : undefined,
          ...extraBody,
        };

        // Fatal errors (HTTP, network, abort) are thrown; useAiChat reports them.
        await subscribeSseText({
          url: joinUrl(baseUrl, chatPath),
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
          timeoutMs: options.timeoutMs,
          onUnauthorized: options.onUnauthorized,
          onChunk: chunk => {
            for (const data of parser.feed(chunk)) handlePayload(data);
          },
        });
        for (const data of parser.flush()) handlePayload(data);

        if (streamError) throw new Error(streamError);

        const calls = [...toolCalls.entries()]
          .sort(([a], [b]) => a - b)
          .map(([index, call]) => ({
            ...call,
            id: call.id || `call_${index}_${Date.now()}`,
          }))
          .filter(call => call.function.name);
        return { text: roundText, toolCalls: calls };
      };

      const runTool = async (call: OpenAIToolCall): Promise<unknown> => {
        const name = call.function.name;
        const tool = tools.find(candidate => candidate.name === name);
        handlers.onToolStart?.({ id: call.id, name, label: tool?.label ?? name });

        const fail = (error: string) => {
          handlers.onToolError?.({ id: call.id, name, error });
          return { error };
        };
        if (!tool) return fail(`Unknown tool: ${name}`);

        let args: Record<string, unknown>;
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          return fail('The tool arguments were not valid JSON.');
        }

        if (signal?.aborted) throw createAbortError();
        try {
          const result = await tool.execute(args, {
            signal,
            conversationId: conversationId ?? null,
            context: params.context,
          });
          if (signal?.aborted) throw createAbortError();
          const frontendData = tool.toFrontendData ? tool.toFrontendData(result, args) : result;
          handlers.onToolComplete?.({ id: call.id, name, frontendData });
          return result ?? null;
        } catch (err) {
          if (isAbortError(err) || signal?.aborted) throw createAbortError();
          return fail(err instanceof Error ? err.message : String(err));
        }
      };

      for (let round = 0; ; round += 1) {
        const { text, toolCalls } = await streamRound();
        if (toolCalls.length === 0 || tools.length === 0 || round >= maxRoundtrips) break;

        conversation.push({ role: 'assistant', content: text || null, tool_calls: toolCalls });
        for (const call of toolCalls) {
          const result = await runTool(call);
          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result ?? null),
          });
        }
        separateNextText = true;
      }

      handlers.onDone?.({ text: snapshot, messageId, conversationId });
      return { text: snapshot, messageId, conversationId, usage };
    },
  };
}
