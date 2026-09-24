import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AiAssistantProvider } from '../../provider/AiAssistantProvider';
import type { AiAssistantCallbacks } from '../../provider/slots';
import type {
  AiTransport,
  AiTransportStreamParams,
  AiTransportStreamResult,
} from '../../transport/types';
import { useAiChat } from '../useAiChat';

interface ControlledStream {
  params: AiTransportStreamParams;
  finish: (text: string, conversationId?: string) => void;
  fail: (error: Error) => void;
}

/**
 * Transport whose streams are resolved from the test. It deliberately ignores
 * the abort signal, like a custom backend that is slow to react to cancellation.
 */
function createControlledTransport() {
  const streams: ControlledStream[] = [];
  const transport: AiTransport = {
    streamChat(params) {
      return new Promise<AiTransportStreamResult>((resolve, reject) => {
        streams.push({
          params,
          finish: (text, conversationId = 'conv-1') => resolve({ text, conversationId }),
          fail: reject,
        });
      });
    },
  };
  return { transport, streams };
}

async function renderChat(transport: AiTransport, callbacks?: AiAssistantCallbacks) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AiAssistantProvider config={{ transport }} callbacks={callbacks}>
      {children}
    </AiAssistantProvider>
  );
  return renderHook(() => useAiChat(), { wrapper });
}

describe('useAiChat', () => {
  it('streams a reply into the assistant message', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    let sending!: Promise<void>;
    await act(async () => {
      sending = result.current.sendMessage('Hi');
    });
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages.map(m => m.role)).toEqual(['user', 'assistant']);

    await act(async () => {
      streams[0].params.handlers.onTextDelta?.('Hel', 'Hel');
    });
    // Deltas are applied once per frame.
    await waitFor(() => expect(result.current.messages[1].content).toBe('Hel'));

    await act(async () => {
      streams[0].finish('Hello');
      await sending;
    });
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages[1]).toMatchObject({ content: 'Hello', status: 'sent' });
    expect(result.current.conversationId).toBe('conv-1');
  });

  it('does not send a failed reply back to the model', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    let sending!: Promise<void>;
    await act(async () => {
      sending = result.current.sendMessage('First');
    });
    await act(async () => {
      streams[0].fail(new Error('boom'));
      await sending;
    });
    expect(result.current.messages[1]).toMatchObject({ status: 'error', content: '' });
    expect(result.current.error).toBe('boom');

    await act(async () => {
      void result.current.sendMessage('Second');
    });
    expect(streams[1].params.messages.map(m => [m.role, m.content])).toEqual([['user', 'First']]);
  });

  it('reports a failure to onError exactly once', async () => {
    const onError = jest.fn();
    const transport: AiTransport = {
      async streamChat({ handlers }) {
        handlers.onError?.('Invalid API key');
        throw new Error('Invalid API key');
      },
    };
    const { result } = await renderChat(transport, { onError });

    await act(async () => {
      await result.current.sendMessage('Hi');
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('Invalid API key');
  });

  it('ignores a stopped stream that settles after the next one started', async () => {
    const onStreamEnd = jest.fn();
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport, { onStreamEnd });

    await act(async () => {
      void result.current.sendMessage('A');
    });
    await act(async () => {
      result.current.cancelStreaming();
    });
    expect(result.current.messages[1].status).toBe('stopped');

    await act(async () => {
      void result.current.sendMessage('B');
    });
    expect(result.current.isStreaming).toBe(true);

    // The first stream ignores the abort and keeps going.
    await act(async () => {
      streams[0].params.handlers.onTextDelta?.('late', 'late');
      streams[0].finish('late');
    });
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages[1]).toMatchObject({ status: 'stopped', content: '' });

    await act(async () => {
      streams[1].params.handlers.onTextDelta?.('fresh', 'fresh');
    });
    await waitFor(() => expect(result.current.messages[3].content).toBe('fresh'));

    await act(async () => {
      streams[1].finish('fresh');
    });
    expect(result.current.isStreaming).toBe(false);
    expect(onStreamEnd).toHaveBeenCalledTimes(2);
  });

  it('keeps a new conversation clean when an old stream settles late', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    await act(async () => {
      void result.current.sendMessage('A');
    });
    await act(async () => {
      result.current.startNewConversation();
    });
    await act(async () => {
      streams[0].params.handlers.onTextDelta?.('late', 'late');
      streams[0].finish('late', 'old-conversation');
    });
    expect(result.current.conversationId).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('can send right after starting a new conversation', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    let sending!: Promise<void>;
    await act(async () => {
      sending = result.current.sendMessage('A');
    });
    await act(async () => {
      streams[0].finish('one');
      await sending;
    });

    await act(async () => {
      result.current.startNewConversation();
      void result.current.sendMessage('B');
    });
    expect(streams[1].params.messages).toEqual([]);
    expect(streams[1].params.conversationId).toBeNull();
    expect(result.current.messages.map(m => m.content)).toEqual(['B', '']);
  });

  it('ignores a second send while a reply is streaming', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    await act(async () => {
      void result.current.sendMessage('A');
      void result.current.sendMessage('B');
    });
    expect(streams).toHaveLength(1);
  });

  it('regenerates the last reply from the same user turn', async () => {
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport);

    let sending!: Promise<void>;
    await act(async () => {
      sending = result.current.sendMessage('A');
    });
    await act(async () => {
      streams[0].finish('one');
      await sending;
    });

    await act(async () => {
      sending = result.current.regenerateLastResponse();
    });
    expect(streams[1].params.userMessage).toBe('A');
    expect(streams[1].params.messages).toEqual([]);

    await act(async () => {
      streams[1].finish('two');
      await sending;
    });
    expect(result.current.messages.map(m => m.content)).toEqual(['A', 'two']);
  });

  it('attaches tool calls to the assistant message', async () => {
    const onToolComplete = jest.fn();
    const { transport, streams } = createControlledTransport();
    const { result } = await renderChat(transport, { onToolComplete });

    let sending!: Promise<void>;
    await act(async () => {
      sending = result.current.sendMessage('List');
    });
    await act(async () => {
      const { handlers } = streams[0].params;
      handlers.onToolStart?.({ id: 't1', name: 'listStudents', label: 'List students' });
      handlers.onToolComplete?.({ id: 't1', name: 'listStudents', frontendData: [{ a: 1 }] });
      // Completion without a start still shows up.
      handlers.onToolComplete?.({ id: 't2', name: 'getOverview', frontendData: { b: 2 } });
    });
    await act(async () => {
      streams[0].finish('Done');
      await sending;
    });

    expect(result.current.messages[1].functionCalls).toEqual([
      {
        id: 't1',
        name: 'listStudents',
        label: 'List students',
        status: 'completed',
        reasoning: undefined,
        frontendData: [{ a: 1 }],
      },
      { id: 't2', name: 'getOverview', status: 'completed', frontendData: { b: 2 } },
    ]);
    expect(onToolComplete).toHaveBeenCalledTimes(2);
  });
});
