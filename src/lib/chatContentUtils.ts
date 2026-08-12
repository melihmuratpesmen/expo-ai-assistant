import type {
  ContentBlockDTO,
  ChatbotMessageRoleDTO,
  HistoryFunctionCallDTO,
  HistoryMessageItemDTO,
  AiChatMessage,
  AiFunctionCall,
  AiMessageRole,
} from '../types/aiChat';
import {
  contentBlocksToPlainString,
  normalizeContentBlocks,
  type ContentBlock,
} from '../types/contentBlock';

export function chatContentToString(content: string | ContentBlockDTO[]): string {
  if (typeof content === 'string') return content;
  const blocks = normalizeContentBlocks(content);
  if (!blocks?.length) return '';
  return contentBlocksToPlainString(blocks);
}

export function resolveMessageContent(content: string | ContentBlockDTO[]): {
  text: string;
  blocks?: ContentBlock[];
} {
  if (typeof content === 'string') {
    return { text: content };
  }
  const blocks = normalizeContentBlocks(content);
  return {
    text: blocks ? contentBlocksToPlainString(blocks) : '',
    blocks,
  };
}

export function mapChatbotRole(role: ChatbotMessageRoleDTO): AiMessageRole {
  if (role === 'USER' || role === 'user') return 'user';
  return 'assistant';
}

export function mapHistoryFunctionCalls(
  functionCalls: HistoryFunctionCallDTO[] | null | undefined
): AiFunctionCall[] | undefined {
  if (!functionCalls?.length) return undefined;

  const mapped = functionCalls
    .map((fc): AiFunctionCall | null => {
      const id = (fc.id ?? fc.callId)?.toString().trim();
      const name = fc.functionName?.trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        label: fc.functionLabel,
        status: 'completed',
        reasoning: fc.reasoning,
        frontendData: fc.frontendData,
      };
    })
    .filter((fc): fc is AiFunctionCall => fc !== null);

  return mapped.length > 0 ? mapped : undefined;
}

export function mapHistoryMessage(
  msg: HistoryMessageItemDTO,
  idPrefix: string,
  index: number
): AiChatMessage {
  const { text, blocks } = resolveMessageContent(msg.content);
  return {
    id: `${idPrefix}-${index}-${msg.timestamp}`,
    role: mapChatbotRole(msg.role),
    content: text,
    blocks,
    createdAt: msg.timestamp,
    status: 'sent',
    functionCalls: mapHistoryFunctionCalls(msg.functionCalls),
  };
}

export function mapHistoryMessages(
  messages: HistoryMessageItemDTO[],
  idPrefix = 'history'
): AiChatMessage[] {
  return messages.map((msg, index) => mapHistoryMessage(msg, idPrefix, index));
}
