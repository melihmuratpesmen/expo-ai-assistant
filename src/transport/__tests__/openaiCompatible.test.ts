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
      JSON.stringify({ error: { message: 'Incorrect API key provided.', type: 'invalid_request_error' } })
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
