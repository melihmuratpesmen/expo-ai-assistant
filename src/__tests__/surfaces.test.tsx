import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AiAssistantProvider } from '../provider/AiAssistantProvider';
import type { AiRenderSlots } from '../provider/slots';
import type { AiTransport, AiTransportStreamParams } from '../transport/types';
import { AiChatModalProvider, useAiChatModal } from '../modal';
import { AiChatScreen } from '../full-page';
import { AiFunctionCallCard } from '../components/AiFunctionCallCard';
import { mergeTheme } from '../theme/AiThemeContext';
import { lightTheme } from '../theme/defaultTheme';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function createControlledTransport() {
  const streams: Array<{ params: AiTransportStreamParams; finish: (text: string) => void }> = [];
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
  slots,
  children,
}: {
  transport: AiTransport;
  slots?: AiRenderSlots;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <AiAssistantProvider config={{ transport }} slots={slots}>
        {children}
      </AiAssistantProvider>
    </SafeAreaProvider>
  );
}

describe('modal surface', () => {
  it('sends the initial message right away and keeps opener buttons out of token updates', async () => {
    const { transport, streams } = createControlledTransport();
    const onOpenerRender = jest.fn();

    function OpenButton() {
      const { open } = useAiChatModal();
      return (
        <React.Profiler id="opener" onRender={onOpenerRender}>
          <Pressable onPress={() => open({ initialMessage: 'Hello there' })}>
            <Text>Open</Text>
          </Pressable>
        </React.Profiler>
      );
    }

    await render(
      <Providers transport={transport}>
        <AiChatModalProvider>
          <OpenButton />
        </AiChatModalProvider>
      </Providers>
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Open'));
    });
    // No timers involved: the stream starts synchronously with the open call.
    expect(streams).toHaveLength(1);
    expect(streams[0].params.userMessage).toBe('Hello there');
    expect(screen.getByText('Hello there')).toBeTruthy();

    const rendersAfterOpen = onOpenerRender.mock.calls.length;
    await act(async () => {
      streams[0].params.handlers.onTextDelta?.('Hi', 'Hi');
      streams[0].params.handlers.onTextDelta?.('!', 'Hi!');
    });
    await waitFor(() => expect(screen.getByText('Hi!')).toBeTruthy());
    await act(async () => {
      streams[0].finish('Hi! How can I help?');
    });
    expect(screen.getByText('Hi! How can I help?')).toBeTruthy();
    expect(onOpenerRender).toHaveBeenCalledTimes(rendersAfterOpen);
  });
});

describe('full-page surface', () => {
  it('uses the renderEmpty and renderInput slots', async () => {
    const { transport, streams } = createControlledTransport();
    const slots: AiRenderSlots = {
      renderEmpty: ({ onSelectSuggestion, suggestions }) => (
        <Pressable onPress={() => onSelectSuggestion(suggestions[0])}>
          <Text>Custom empty</Text>
        </Pressable>
      ),
      renderInput: ({ isStreaming }) => <Text>{isStreaming ? 'Custom busy' : 'Custom input'}</Text>,
    };

    await render(
      <Providers transport={transport} slots={slots}>
        <AiChatScreen
          suggestions={[{ id: 's', label: 'Say hi', prompt: 'Hi from a suggestion' }]}
        />
      </Providers>
    );
    expect(screen.getByText('Custom input')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Custom empty'));
    });
    expect(streams[0].params.userMessage).toBe('Hi from a suggestion');
    expect(screen.getByText('Custom busy')).toBeTruthy();
  });
});

describe('toolRenderers', () => {
  function WeatherCard({ data }: { data: unknown }) {
    return <Text>{`Weather: ${(data as { temp: number }).temp}°`}</Text>;
  }
  function ResultCard() {
    return <Text>Typed result</Text>;
  }

  it('renders a registered component by tool name or payload type', async () => {
    const { transport } = createControlledTransport();
    await render(
      <Providers
        transport={transport}
        slots={{ toolRenderers: { getWeather: WeatherCard, TEST_RESULT: ResultCard } }}
      >
        <AiFunctionCallCard
          functionCall={{
            id: '1',
            name: 'getWeather',
            status: 'completed',
            frontendData: { temp: 21 },
          }}
        />
        <AiFunctionCallCard
          functionCall={{
            id: '2',
            name: 'gradeTest',
            status: 'completed',
            frontendData: { type: 'TEST_RESULT', correct: 3 },
          }}
        />
        <AiFunctionCallCard
          functionCall={{
            id: '3',
            name: 'other',
            status: 'completed',
            frontendData: { openTasks: 7 },
          }}
        />
      </Providers>
    );

    expect(screen.getByText('Weather: 21°')).toBeTruthy();
    expect(screen.getByText('Typed result')).toBeTruthy();
    // Unregistered tools keep the built-in key/value view.
    expect(screen.getByText('Open Tasks')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });
});

describe('mergeTheme', () => {
  it('keeps user bubbles in sync with an overridden primary color', () => {
    const theme = mergeTheme(lightTheme, { colors: { primary: { DEFAULT: '#FF0000' } } });
    expect(theme.colors.primary.DEFAULT).toBe('#FF0000');
    expect(theme.colors.bubble.user).toBe('#FF0000');
    expect(theme.colors.primary.onPrimary).toBe(lightTheme.colors.primary.onPrimary);
  });

  it('respects explicit bubble colors', () => {
    const theme = mergeTheme(lightTheme, {
      colors: { primary: { DEFAULT: '#FF0000' }, bubble: { user: '#00FF00' } },
    });
    expect(theme.colors.bubble.user).toBe('#00FF00');
  });
});
