import { extractErrorMessage, joinUrl, SseDataParser } from '../http';

describe('SseDataParser', () => {
  it('yields data payloads across chunk boundaries', () => {
    const parser = new SseDataParser();
    expect(parser.feed('data: {"a"')).toEqual([]);
    expect(parser.feed(':1}\n\ndata: [DONE]\n\n')).toEqual(['{"a":1}', '[DONE]']);
  });

  it('handles CRLF line endings and ignores comments and other fields', () => {
    const parser = new SseDataParser();
    expect(parser.feed(': keep-alive\r\nevent: message\r\ndata: hi\r\n\r\n')).toEqual(['hi']);
  });

  it('flushes a trailing line without a newline', () => {
    const parser = new SseDataParser();
    expect(parser.feed('data: one\ndata: two')).toEqual(['one']);
    expect(parser.flush()).toEqual(['two']);
    expect(parser.flush()).toEqual([]);
  });
});

describe('extractErrorMessage', () => {
  it.each([
    [JSON.stringify({ error: { message: 'Bad key' } }), 'Bad key'],
    [JSON.stringify({ message: 'Too many requests' }), 'Too many requests'],
    [JSON.stringify({ error: 'Forbidden' }), 'Forbidden'],
    [JSON.stringify({ detail: 'Not found' }), 'Not found'],
    ['Unauthorized', 'Unauthorized'],
    ['<html><body>Bad gateway</body></html>', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('%p -> %p', (body, expected) => {
    expect(extractErrorMessage(body)).toBe(expected);
  });
});

describe('joinUrl', () => {
  it('joins without doubling slashes', () => {
    expect(joinUrl('https://x.dev/v1/', '/chat')).toBe('https://x.dev/v1/chat');
    expect(joinUrl('https://x.dev/v1', 'chat')).toBe('https://x.dev/v1/chat');
  });
});
