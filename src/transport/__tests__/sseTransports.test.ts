import { SseEventParser } from '../http';
import { createAiSdkTransport } from '../aiSdk';
import { createSseTransport } from '../sse';
import type { AiTransportStreamHandlers } from '../types';
import { FakeXhr, flushAsync, sse } from './fakeXhr';

function handlers(): Required<AiTransportStreamHandlers> {
  return {
    onTextDelta: jest.fn(),
    onReasoningDelta: jest.fn(),
    onToolStart: jest.fn(),
    onToolComplete: jest.fn(),
    onToolError: jest.fn(),
    onSuggestions: jest.fn(),
    onError: jest.fn(),
    onDone: jest.fn(),
  };
}

describe('SseEventParser', () => {
  it('dispatches events on blank lines and joins multi-line data', () => {
    const parser = new SseEventParser();
    expect(parser.feed('event: token\ndata: {"a":\n')).toEqual([]);
    expect(parser.feed('data: 1}\nid: 7\n\n: ping\n\ndata: next\n\n')).toEqual([
      { event: 'token', data: '{"a":\n1}', id: '7' },
      // Per the SSE spec the last event id carries over to later events.
      { data: 'next', id: '7' },
    ]);
  });

  it('flushes a final event without a trailing blank line', () => {
    const parser = new SseEventParser();
    expect(parser.feed('data: last')).toEqual([]);
    expect(parser.flush()).toEqual([{ data: 'last' }]);
  });
});

describe('createSseTransport', () => {
  beforeEach(() => FakeXhr.install());

  it('maps custom events through onEvent', async () => {
    const transport = createSseTransport({
      url: 'https://api.example.com/chat',
      getHeaders: () => ({ 'X-App': 'demo' }),
      onEvent: ({ event, data }, ctx) => {
        const json = JSON.parse(data);
        if (event === 'session') ctx.setConversationId(json.id);
        if (event === 'token') ctx.text(json.text);
        if (event === 'tool') ctx.toolStart({ id: json.id, name: json.name });
        if (event === 'tool_result') ctx.toolComplete({ id: json.id, frontendData: json.rows });
      },
    });
    const h = handlers();
    const pending = transport.streamChat({
      messages: [{ id: '1', role: 'user', content: 'Earlier', createdAt: 0 }],
      userMessage: 'Now',
      context: { screen: 'Home' },
      handlers: h,
    });
    await flushAsync();

    const xhr = FakeXhr.latest();
    expect(xhr.headers['X-App']).toBe('demo');
    expect(JSON.parse(xhr.body as string)).toEqual({
      messages: [{ role: 'user', content: 'Earlier' }],
      message: 'Now',
      context: { screen: 'Home' },
    });
    xhr.push(
      'event: session\ndata: {"id":"s-1"}\n\n' +
        'event: tool\ndata: {"id":"t","name":"search"}\n\n' +
        'event: tool_result\ndata: {"id":"t","rows":[1]}\n\n' +
        'event: token\ndata: {"text":"Hi"}\n\n'
    );
    xhr.finish(200);

    await expect(pending).resolves.toMatchObject({ text: 'Hi', conversationId: 's-1' });
    expect(h.onToolComplete).toHaveBeenCalledWith({ id: 't', name: 'search', frontendData: [1] });
  });

  it('throws the message passed to fail()', async () => {
    const transport = createSseTransport({
      url: 'https://api.example.com/chat',
      onEvent: ({ data }, ctx) => ctx.fail(data),
    });
    const pending = transport.streamChat({ messages: [], userMessage: 'x', handlers: handlers() });
    await flushAsync();
    FakeXhr.latest().push('data: Quota exceeded\n\n');
    FakeXhr.latest().finish(200);
    await expect(pending).rejects.toThrow('Quota exceeded');
  });
});

describe('createAiSdkTransport', () => {
  beforeEach(() => FakeXhr.install());

  it('speaks the UI message stream protocol', async () => {
    const transport = createAiSdkTransport({
      api: 'https://example.com/api/chat',
      body: { locale: 'tr' },
      toolLabels: { getWeather: 'Weather' },
    });
    const h = handlers();
    const pending = transport.streamChat({
      messages: [{ id: 'm1', role: 'assistant', content: 'Hello!', createdAt: 0 }],
      userMessage: 'Weather in Izmir?',
      handlers: h,
    });
    await flushAsync();

    const body = JSON.parse(FakeXhr.latest().body as string);
    expect(body).toMatchObject({
      locale: 'tr',
      trigger: 'submit-message',
      messages: [
        { id: 'm1', role: 'assistant', parts: [{ type: 'text', text: 'Hello!' }] },
        { role: 'user', parts: [{ type: 'text', text: 'Weather in Izmir?' }] },
      ],
    });
    expect(typeof body.id).toBe('string');

    FakeXhr.latest().push(
      sse(
        { type: 'start', messageId: 'msg-1' },
        { type: 'reasoning-delta', id: 'r', delta: 'Checking' },
        { type: 'tool-input-available', toolCallId: 'c1', toolName: 'getWeather', input: {} },
        { type: 'tool-output-available', toolCallId: 'c1', output: { tempC: 21 } },
        { type: 'text-start', id: 't' },
        { type: 'text-delta', id: 't', delta: '21°C' },
        { type: 'text-delta', id: 't', delta: ' and sunny' },
        {
          type: 'data-suggestions',
          data: [{ id: 's', label: 'Tomorrow?', prompt: 'And tomorrow?' }],
        },
        { type: 'finish' },
        '[DONE]'
      )
    );
    FakeXhr.latest().finish(200);

    await expect(pending).resolves.toEqual({
      text: '21°C and sunny',
      messageId: 'msg-1',
      conversationId: body.id,
      usage: undefined,
    });
    expect(h.onReasoningDelta).toHaveBeenCalledWith('Checking', 'Checking');
    expect(h.onToolStart).toHaveBeenCalledWith({ id: 'c1', name: 'getWeather', label: 'Weather' });
    expect(h.onToolComplete).toHaveBeenCalledWith({
      id: 'c1',
      name: 'getWeather',
      frontendData: { tempC: 21 },
    });
    expect(h.onSuggestions).toHaveBeenCalledWith([
      { id: 's', label: 'Tomorrow?', prompt: 'And tomorrow?' },
    ]);
  });

  it('fails on error parts and reports tool errors', async () => {
    const transport = createAiSdkTransport({ api: 'https://example.com/api/chat' });
    const h = handlers();
    const pending = transport.streamChat({
      messages: [],
      userMessage: 'x',
      conversationId: 'chat-9',
      handlers: h,
    });
    await flushAsync();
    expect(JSON.parse(FakeXhr.latest().body as string).id).toBe('chat-9');
    FakeXhr.latest().push(
      sse(
        { type: 'tool-input-start', toolCallId: 'c', toolName: 'lookup' },
        { type: 'tool-output-error', toolCallId: 'c', errorText: 'Not found' },
        { type: 'error', errorText: 'Model overloaded' }
      )
    );
    FakeXhr.latest().finish(200);
    await expect(pending).rejects.toThrow('Model overloaded');
    expect(h.onToolError).toHaveBeenCalledWith({ id: 'c', name: 'lookup', error: 'Not found' });
  });
});
