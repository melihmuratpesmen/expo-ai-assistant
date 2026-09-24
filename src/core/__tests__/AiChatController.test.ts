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
