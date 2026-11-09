import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AiAssistantProvider } from '../provider/AiAssistantProvider';
import type { AiAssistantCallbacks } from '../provider/slots';
import type { AiTransport, AiTransportStreamParams } from '../transport/types';
import { useAiChat } from '../hooks/useAiChat';
import { AiChatScreen } from '../full-page';
import { AiChatModalProvider, useAiChatModal } from '../modal';
import { AiChatInput } from '../components/AiChatInput';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function createControlledTransport() {
  const streams: Array<{
    params: AiTransportStreamParams;
    finish: (text: string) => void;
  }> = [];
  const transport: AiTransport = {
    streamChat: params =>
      new Promise(resolve => {
        streams.push({ params, finish: text => resolve({ text, conversationId: 'c1' }) });
      }),
  };
  return { transport, streams };
}

function Providers({
  transport,
  callbacks,
  children,
}: {
  transport: AiTransport;
  callbacks?: AiAssistantCallbacks;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <AiAssistantProvider config={{ transport }} callbacks={callbacks}>
        {children}
      </AiAssistantProvider>
    </SafeAreaProvider>
  );
}

async function finishStream(stream: { finish: (text: string) => void }, text: string) {
  await act(async () => {
    stream.finish(text);
  });
}

describe('shared conversations (chatId)', () => {
  it('shares one conversation between hooks with the same chatId', async () => {
    const { transport, streams } = createControlledTransport();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Providers transport={transport}>{children}</Providers>
    );
    const { result } = await renderHook(
      () => ({
        a: useAiChat({ chatId: 'main' }),
        b: useAiChat({ chatId: 'main' }),
        c: useAiChat(),
      }),
      { wrapper }
    );

    await act(async () => {
      void result.current.a.sendMessage('Hello');
    });
    expect(result.current.b.messages.map(m => m.content)).toEqual(['Hello', '']);
    expect(result.current.c.messages).toEqual([]);
    await finishStream(streams[0], 'Hi!');
    expect(result.current.b.messages[1].content).toBe('Hi!');
  });

  it('continues a shared conversation in the modal and keeps streaming after close', async () => {
    const { transport, streams } = createControlledTransport();

    function Opener() {
      const { open, close } = useAiChatModal();
      return (
        <>
          <Pressable onPress={() => open()}>
            <Text>Open</Text>
          </Pressable>
          <Pressable onPress={close}>
            <Text>Close</Text>
          </Pressable>
        </>
      );
    }

    function Background() {
      const chat = useAiChat({ chatId: 'main' });
      return (
        <Pressable onPress={() => void chat.sendMessage('From the page')}>
          <Text>{`page:${chat.messages.length}:${chat.isStreaming ? 'streaming' : 'idle'}`}</Text>
        </Pressable>
      );
    }

    await render(
      <Providers transport={transport}>
        <AiChatModalProvider chatId="main">
          <Background />
          <Opener />
        </AiChatModalProvider>
      </Providers>
    );

    await act(async () => {
      fireEvent.press(screen.getByText('page:0:idle'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Open'));
    });
    // Not reset: the modal shows the page's conversation.
    expect(screen.getByText('From the page')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Close'));
    });
    expect(screen.getByText('page:2:streaming')).toBeTruthy();
    await finishStream(streams[0], 'Done');
    expect(screen.getByText('page:2:idle')).toBeTruthy();
  });
});

describe('message interactions', () => {
  it('edits a message from the bubble action and resends it', async () => {
    const { transport, streams } = createControlledTransport();
    await render(
      <Providers transport={transport}>
        <AiChatScreen suggestions={[{ id: 's', label: 'Start', prompt: 'Original question' }]} />
      </Providers>
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Start'));
    });
    await finishStream(streams[0], 'First answer');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Edit'));
    });
    expect(screen.getByText('Editing message')).toBeTruthy();
    const input = screen.getByDisplayValue('Original question');
    await act(async () => {
      fireEvent.changeText(input, 'Better question');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Send'));
    });

    expect(streams[1].params.userMessage).toBe('Better question');
    expect(streams[1].params.messages).toEqual([]);
    expect(screen.queryByText('Editing message')).toBeNull();
    expect(screen.queryByText('Original question')).toBeNull();
  });

  it('shows follow-up chips and feedback buttons on the latest reply', async () => {
    const onFeedback = jest.fn();
    const { transport, streams } = createControlledTransport();
    await render(
      <Providers transport={transport} callbacks={{ onFeedback }}>
        <AiChatScreen suggestions={[{ id: 's', label: 'Start', prompt: 'Hi' }]} />
      </Providers>
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Start'));
    });
    await act(async () => {
      streams[0].params.handlers.onSuggestions?.([
        { id: 'f', label: 'Tell me more', prompt: 'More please' },
      ]);
    });
    // Hidden while streaming.
    expect(screen.queryByText('Tell me more')).toBeNull();
    await finishStream(streams[0], 'Hello');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Good response'));
    });
    expect(onFeedback).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello' }), 'up');

    await act(async () => {
      fireEvent.press(screen.getByText('Tell me more'));
    });
    expect(streams[1].params.userMessage).toBe('More please');
  });

  it('does not show feedback buttons without an onFeedback callback', async () => {
    const { transport, streams } = createControlledTransport();
    await render(
      <Providers transport={transport}>
        <AiChatScreen suggestions={[{ id: 's', label: 'Start', prompt: 'Hi' }]} />
      </Providers>
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Start'));
    });
    await finishStream(streams[0], 'Hello');
    expect(screen.queryByLabelText('Good response')).toBeNull();
  });
});

describe('AiChatInput', () => {
  it('lets the user type while a reply streams and sends after it ends', async () => {
    const onSend = jest.fn();
    const { transport } = createControlledTransport();
    const view = await render(
      <Providers transport={transport}>
        <AiChatInput onSend={onSend} isStreaming />
      </Providers>
    );
    const input = screen.getByPlaceholderText('Type a message...');
    await act(async () => {
      fireEvent.changeText(input, 'Next question');
    });
    expect(screen.getByDisplayValue('Next question')).toBeTruthy();
    // Sending waits for the reply to finish.
    expect(screen.getByLabelText('Send').props.accessibilityState.disabled).toBe(true);

    await view.rerender(
      <Providers transport={transport}>
        <AiChatInput onSend={onSend} isStreaming={false} />
      </Providers>
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Send'));
    });
    expect(onSend).toHaveBeenCalledWith('Next question');
  });
});
