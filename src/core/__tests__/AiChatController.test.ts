import { defaultStrings } from '../../i18n/strings';
import type { AiTransport, AiTransportStreamParams } from '../../transport/types';
import { AiChatController } from '../AiChatController';

function setup() {
  let stream!: {
    params: AiTransportStreamParams;
    finish: (text: string) => void;
  };
  const transport: AiTransport = {
    streamChat: params =>
      new Promise(resolve => {
        stream = { params, finish: text => resolve({ text, conversationId: 'c1' }) };
      }),
  };
  const flushes: Array<() => void> = [];
  const controller = new AiChatController({
    getTransport: () => transport,
    getStrings: () => defaultStrings,
    scheduleFlush: flush => flushes.push(flush),
  });
  const listener = jest.fn();
  controller.subscribe(listener);
  return {
    controller,
    listener,
    stream: () => stream,
    flushFrame: () => flushes.splice(0).forEach(flush => flush()),
  };
}

describe('AiChatController', () => {
  it('applies many deltas in one notification per frame', () => {
    const { controller, listener, stream, flushFrame } = setup();
    void controller.sendMessage('Hi');
    listener.mockClear();

    const { handlers } = stream().params;
    handlers.onTextDelta?.('a', 'a');
    handlers.onTextDelta?.('b', 'ab');
    handlers.onTextDelta?.('c', 'abc');
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getSnapshot().messages[1].content).toBe('');

    flushFrame();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().messages[1].content).toBe('abc');
  });

  it('keeps buffered text when the user stops mid-frame', () => {
    const { controller, stream } = setup();
    void controller.sendMessage('Hi');
    stream().params.handlers.onTextDelta?.('Part', 'Part');

    controller.cancelStreaming();
    expect(controller.getSnapshot().messages[1]).toMatchObject({
      content: 'Part',
      status: 'stopped',
    });
    expect(controller.getSnapshot().isStreaming).toBe(false);
  });

  it('flushes buffered text before tool events and completion', async () => {
    const { controller, stream } = setup();
    const sending = controller.sendMessage('Hi');
    const { handlers } = stream().params;
    handlers.onTextDelta?.('Look', 'Look');
    handlers.onToolStart?.({ id: 't', name: 'lookup' });
    expect(controller.getSnapshot().messages[1]).toMatchObject({
      content: 'Look',
      functionCalls: [{ id: 't', status: 'executing' }],
    });

    stream().finish('Looked it up');
    await sending;
    expect(controller.getSnapshot().messages[1]).toMatchObject({
      content: 'Looked it up',
      status: 'sent',
    });
    expect(controller.getSnapshot().conversationId).toBe('c1');
  });

  it('shares one conversation between subscribers', () => {
    const { controller } = setup();
    const other = jest.fn();
    const unsubscribe = controller.subscribe(other);
    void controller.sendMessage('Hi');
    expect(other).toHaveBeenCalled();
    unsubscribe();
    other.mockClear();
    controller.startNewConversation();
    expect(other).not.toHaveBeenCalled();
  });
});

describe('AiChatController 0.3 features', () => {
  function controlled(callbacks = {}, getContext?: () => Record<string, unknown>) {
    const streams: Array<{
      params: AiTransportStreamParams;
      finish: (text: string, extra?: object) => void;
    }> = [];
    const transport: AiTransport = {
      streamChat: params =>
        new Promise(resolve => {
          streams.push({
            params,
            finish: (text, extra = {}) => resolve({ text, conversationId: 'c1', ...extra }),
          });
        }),
    };
    const controller = new AiChatController({
      getTransport: () => transport,
      getStrings: () => defaultStrings,
      getCallbacks: () => callbacks,
      getContext,
      scheduleFlush: flush => flush(),
    });
    return { controller, streams };
  }

  async function reply(
    controller: AiChatController,
    streams: ReturnType<typeof controlled>['streams'],
    text: string,
    answer: string,
    extra?: object
  ) {
    const sending = controller.sendMessage(text);
    streams[streams.length - 1].finish(answer, extra);
    await sending;
  }

  it('edits a user message and resends from there', async () => {
    const { controller, streams } = controlled();
    await reply(controller, streams, 'First', 'One');
    await reply(controller, streams, 'Second', 'Two');
    const secondUser = controller.getSnapshot().messages[2];

    controller.startEdit(secondUser.id);
    expect(controller.getSnapshot().editing).toEqual({ messageId: secondUser.id, text: 'Second' });

    const sending = controller.submitEdit('Second, but better');
    expect(controller.getSnapshot().editing).toBeNull();
    expect(streams[2].params.messages.map(m => m.content)).toEqual(['First', 'One']);
    expect(streams[2].params.userMessage).toBe('Second, but better');
    streams[2].finish('Better two');
    await sending;
    expect(controller.getSnapshot().messages.map(m => m.content)).toEqual([
      'First',
      'One',
      'Second, but better',
      'Better two',
    ]);
  });

  it('toggles feedback and reports it', async () => {
    const onFeedback = jest.fn();
    const { controller, streams } = controlled({ onFeedback });
    await reply(controller, streams, 'Hi', 'Hello');
    const assistant = controller.getSnapshot().messages[1];

    controller.setFeedback(assistant.id, 'up');
    expect(controller.getSnapshot().messages[1].feedback).toBe('up');
    controller.setFeedback(assistant.id, 'up');
    expect(controller.getSnapshot().messages[1].feedback).toBeUndefined();
    expect(onFeedback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ feedback: 'up' }),
      'up'
    );
    expect(onFeedback).toHaveBeenNthCalledWith(2, expect.anything(), null);
  });

  it('records tool errors, suggestions, usage and context', async () => {
    const onMessageComplete = jest.fn();
    const { controller, streams } = controlled({ onMessageComplete }, () => ({ screen: 'Home' }));
    const sending = controller.sendMessage('Go');
    const { handlers, context } = streams[0].params;
    expect(context).toEqual({ screen: 'Home' });

    handlers.onToolStart?.({ id: 't', name: 'lookup' });
    handlers.onToolError?.({ id: 't', name: 'lookup', error: 'Not found' });
    handlers.onSuggestions?.([{ id: 's', label: 'More', prompt: 'Tell me more' }]);
    streams[0].finish('Done', { usage: { totalTokens: 12 } });
    await sending;

    const message = controller.getSnapshot().messages[1];
    expect(message.functionCalls).toEqual([
      {
        id: 't',
        name: 'lookup',
        status: 'error',
        error: 'Not found',
        label: undefined,
        reasoning: undefined,
      },
    ]);
    expect(message.suggestions).toEqual([{ id: 's', label: 'More', prompt: 'Tell me more' }]);
    expect(message.usage).toEqual({ totalTokens: 12 });
    expect(onMessageComplete).toHaveBeenCalledWith(expect.objectContaining({ content: 'Done' }));
  });
});
