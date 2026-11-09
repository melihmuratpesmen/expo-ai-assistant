import type { AiChatMessage } from '../../types/aiChat';
import { AiHttpError } from '../http';
import { createOpenAICompatibleTransport } from '../openaiCompatible';
import type { AiTransportStreamHandlers } from '../types';
import { FakeXhr, flushAsync, sse } from './fakeXhr';

function message(partial: Partial<AiChatMessage> & Pick<AiChatMessage, 'role'>): AiChatMessage {
  return { id: Math.random().toString(36), content: '', createdAt: 0, status: 'sent', ...partial };
}

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

describe('createOpenAICompatibleTransport', () => {
  beforeEach(() => FakeXhr.install());

  const transport = createOpenAICompatibleTransport({
    apiKey: () => 'sk-test',
    model: 'gpt-test',
    systemPrompt: 'Be brief.',
  });

  it('streams deltas and sends the mapped conversation', async () => {
    const h = handlers();
    const pending = transport.streamChat({
      messages: [
        message({ role: 'user', content: 'Hi' }),
        message({ role: 'assistant', content: 'Hello!' }),
        // Failed / empty turns are not sent to the model.
        message({ role: 'user', content: 'Again' }),
        message({ role: 'assistant', content: '', status: 'error' }),
      ],
      userMessage: 'How are you?',
      handlers: h,
    });
    await flushAsync();

    const xhr = FakeXhr.latest();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(xhr.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(xhr.body as string)).toMatchObject({
      model: 'gpt-test',
      stream: true,
      messages: [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'Again' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    xhr.push(sse({ id: 'chatcmpl-1', choices: [{ delta: { content: 'Fine' } }] }));
    // A trailing event without the final newline must not be lost.
    xhr.finish(200, 'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":", thanks"}}]}');

    await expect(pending).resolves.toEqual({
      text: 'Fine, thanks',
      messageId: 'chatcmpl-1',
      conversationId: 'chatcmpl-1',
    });
    expect(h.onTextDelta).toHaveBeenNthCalledWith(1, 'Fine', 'Fine');
    expect(h.onTextDelta).toHaveBeenNthCalledWith(2, ', thanks', 'Fine, thanks');
    expect(h.onDone).toHaveBeenCalledTimes(1);
  });

  it('surfaces the provider error message for HTTP failures', async () => {
    const h = handlers();
    const pending = transport.streamChat({ messages: [], userMessage: 'Hi', handlers: h });
    await flushAsync();

    FakeXhr.latest().finish(
      401,
      JSON.stringify({
        error: { message: 'Incorrect API key provided.', type: 'invalid_request_error' },
      })
    );

    const error = await pending.catch(e => e);
    expect(error).toBeInstanceOf(AiHttpError);
    expect(error.message).toBe('Incorrect API key provided.');
    expect(error.status).toBe(401);
    // Fatal errors are thrown, not also reported through the handler.
    expect(h.onError).not.toHaveBeenCalled();
    expect(h.onDone).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    const pending = transport.streamChat({ messages: [], userMessage: 'Hi', handlers: handlers() });
    await flushAsync();
    FakeXhr.latest().finish(502, '<html>Bad gateway</html>');
    await expect(pending).rejects.toThrow('Request failed (502)');
  });

  it('throws an error sent inside the stream', async () => {
    const h = handlers();
    const pending = transport.streamChat({ messages: [], userMessage: 'Hi', handlers: h });
    await flushAsync();
    const xhr = FakeXhr.latest();
    xhr.push(sse({ error: { message: 'Rate limit reached' } }));
    xhr.finish(200);

    await expect(pending).rejects.toThrow('Rate limit reached');
    expect(h.onError).not.toHaveBeenCalled();
  });

  it('rejects with AbortError when cancelled mid-stream', async () => {
    const h = handlers();
    const controller = new AbortController();
    const pending = transport.streamChat({
      messages: [],
      userMessage: 'Hi',
      signal: controller.signal,
      handlers: h,
    });
    await flushAsync();
    const xhr = FakeXhr.latest();
    xhr.push(sse({ id: 'x', choices: [{ delta: { content: 'Par' } }] }));
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(xhr.aborted).toBe(true);
    expect(h.onDone).not.toHaveBeenCalled();
  });

  it('does not start a request when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      transport.streamChat({
        messages: [],
        userMessage: 'Hi',
        signal: controller.signal,
        handlers: handlers(),
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeXhr.instances).toHaveLength(0);
  });
});

describe('createOpenAICompatibleTransport tools', () => {
  beforeEach(() => FakeXhr.install());

  function toolCallChunks(calls: Array<{ id: string; name: string; args: string }>) {
    // Split names and arguments across chunks like real providers do.
    return calls.flatMap((call, index) => [
      {
        id: 'chatcmpl-1',
        choices: [
          {
            delta: {
              tool_calls: [{ index, id: call.id, function: { name: call.name, arguments: '' } }],
            },
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index, function: { arguments: call.args.slice(0, 5) } }],
            },
          },
        ],
      },
      {
        choices: [
          { delta: { tool_calls: [{ index, function: { arguments: call.args.slice(5) } }] } },
        ],
      },
    ]);
  }

  it('runs tool calls on the device and sends the results back', async () => {
    const execute = jest.fn(async ({ city }: { city: string }) => ({ city, tempC: 21 }));
    const transport = createOpenAICompatibleTransport({
      apiKey: () => 'k',
      model: 'm',
      tools: [
        {
          name: 'getWeather',
          label: 'Weather',
          description: 'Current weather',
          parameters: { type: 'object', properties: { city: { type: 'string' } } },
          execute,
        },
      ],
    });
    const h = handlers();
    const pending = transport.streamChat({ messages: [], userMessage: 'Weather?', handlers: h });
    await flushAsync();

    const first = FakeXhr.latest();
    const firstBody = JSON.parse(first.body as string);
    expect(firstBody.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'getWeather',
          description: 'Current weather',
          parameters: { type: 'object', properties: { city: { type: 'string' } } },
        },
      },
    ]);
    first.push(
      sse(...toolCallChunks([{ id: 'call_1', name: 'getWeather', args: '{"city":"Izmir"}' }]))
    );
    first.finish(200, sse('[DONE]'));
    await flushAsync();

    expect(execute).toHaveBeenCalledWith({ city: 'Izmir' }, expect.objectContaining({}));
    expect(h.onToolStart).toHaveBeenCalledWith({
      id: 'call_1',
      name: 'getWeather',
      label: 'Weather',
    });
    expect(h.onToolComplete).toHaveBeenCalledWith({
      id: 'call_1',
      name: 'getWeather',
      frontendData: { city: 'Izmir', tempC: 21 },
    });

    const second = FakeXhr.latest();
    expect(second).not.toBe(first);
    expect(JSON.parse(second.body as string).messages.slice(-2)).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'getWeather', arguments: '{"city":"Izmir"}' },
          },
        ],
      },
      { role: 'tool', tool_call_id: 'call_1', content: '{"city":"Izmir","tempC":21}' },
    ]);
    second.push(sse({ choices: [{ delta: { content: 'It is 21°C in Izmir.' } }] }));
    second.finish(200);

    await expect(pending).resolves.toMatchObject({ text: 'It is 21°C in Izmir.' });
  });

  it('reports failing and unknown tools to the model and the card', async () => {
    const transport = createOpenAICompatibleTransport({
      apiKey: () => 'k',
      model: 'm',
      tools: [
        {
          name: 'broken',
          execute: () => {
            throw new Error('Service down');
          },
        },
      ],
    });
    const h = handlers();
    const pending = transport.streamChat({ messages: [], userMessage: 'Go', handlers: h });
    await flushAsync();
    FakeXhr.latest().push(
      sse(
        ...toolCallChunks([
          { id: 'a', name: 'broken', args: '{}xxxxx' },
          { id: 'b', name: 'missing', args: '{"q":1}' },
        ])
      )
    );
    FakeXhr.latest().finish(200);
    await flushAsync();

    expect(h.onToolError).toHaveBeenCalledWith({
      id: 'a',
      name: 'broken',
      error: 'The tool arguments were not valid JSON.',
    });
    expect(h.onToolError).toHaveBeenCalledWith({
      id: 'b',
      name: 'missing',
      error: 'Unknown tool: missing',
    });
    const toolMessages = JSON.parse(FakeXhr.latest().body as string).messages.filter(
      (m: { role: string }) => m.role === 'tool'
    );
    expect(toolMessages).toHaveLength(2);

    FakeXhr.latest().push(sse({ choices: [{ delta: { content: 'Sorry.' } }] }));
    FakeXhr.latest().finish(200);
    await expect(pending).resolves.toMatchObject({ text: 'Sorry.' });
  });

  it('streams reasoning, sends context and extra body fields, and reports usage', async () => {
    const transport = createOpenAICompatibleTransport({
      apiKey: () => 'k',
      model: 'm',
      includeUsage: true,
      extraBody: { max_tokens: 256 },
    });
    const h = handlers();
    const pending = transport.streamChat({
      messages: [],
      userMessage: 'Hi',
      context: { screen: 'Invoice', invoiceId: 42 },
      handlers: h,
    });
    await flushAsync();
    const xhr = FakeXhr.latest();
    const body = JSON.parse(xhr.body as string);
    expect(body).toMatchObject({ max_tokens: 256, stream_options: { include_usage: true } });
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'Context from the app (JSON): {"screen":"Invoice","invoiceId":42}',
    });

    xhr.push(
      sse(
        { choices: [{ delta: { reasoning_content: 'Thinking' } }] },
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } }
      )
    );
    xhr.finish(200);

    await expect(pending).resolves.toMatchObject({
      text: 'Hello',
      usage: { promptTokens: 10, completionTokens: 3, totalTokens: 13 },
    });
    expect(h.onReasoningDelta).toHaveBeenCalledWith('Thinking', 'Thinking');
  });
});
