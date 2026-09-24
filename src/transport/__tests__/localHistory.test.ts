import { createMemoryStorage, withLocalHistory } from '../localHistory';
import type { AiTransport } from '../types';

function scriptedTransport(): AiTransport {
  let turn = 0;
  return {
    async streamChat({ userMessage, conversationId, handlers, signal }) {
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      if (userMessage === 'fail') throw new Error('boom');
      turn += 1;
      handlers.onToolStart?.({ id: `t${turn}`, name: 'lookup' });
      handlers.onToolComplete?.({ id: `t${turn}`, name: 'lookup', frontendData: { turn } });
      return { text: `Reply ${turn} to ${userMessage}`, conversationId: conversationId ?? 'srv-1' };
    },
  };
}

const noHandlers = {};

describe('withLocalHistory', () => {
  it('saves completed replies and serves them as history', async () => {
    const storage = createMemoryStorage();
    const transport = withLocalHistory(scriptedTransport(), { storage });

    const first = await transport.streamChat({
      messages: [],
      userMessage: 'Plan my week',
      handlers: noHandlers,
    });
    expect(first.conversationId).toBe('srv-1');

    const history1 = await transport.getHistory!('srv-1');
    await transport.streamChat({
      messages: history1.messages,
      userMessage: 'And the weekend?',
      conversationId: 'srv-1',
      handlers: noHandlers,
    });

    const sessions = await transport.listSessions!();
    expect(sessions).toEqual([
      expect.objectContaining({
        id: 'srv-1',
        title: 'Plan my week',
        messageCount: 4,
        lastMessagePreview: 'Reply 2 to And the weekend?',
      }),
    ]);

    const { messages } = await transport.getHistory!('srv-1');
    expect(messages.map(m => [m.role, m.content])).toEqual([
      ['user', 'Plan my week'],
      ['assistant', 'Reply 1 to Plan my week'],
      ['user', 'And the weekend?'],
      ['assistant', 'Reply 2 to And the weekend?'],
    ]);
    expect(messages[3].functionCalls).toEqual([
      { id: 't2', name: 'lookup', status: 'completed', frontendData: { turn: 2 } },
    ]);
  });

  it('does not save failed replies and supports delete', async () => {
    const storage = createMemoryStorage();
    const transport = withLocalHistory(scriptedTransport(), { storage, namespace: 'test' });

    await expect(
      transport.streamChat({ messages: [], userMessage: 'fail', handlers: noHandlers })
    ).rejects.toThrow('boom');
    expect(await transport.listSessions!()).toEqual([]);

    await transport.streamChat({ messages: [], userMessage: 'Hi', handlers: noHandlers });
    expect(await transport.listSessions!()).toHaveLength(1);
    await transport.deleteSession!('srv-1');
    expect(await transport.listSessions!()).toEqual([]);
    expect((await transport.getHistory!('srv-1')).messages).toEqual([]);
  });

  it('keeps only the newest conversations', async () => {
    const storage = createMemoryStorage();
    const transport = withLocalHistory(scriptedTransport(), { storage, maxConversations: 2 });
    for (const id of ['a', 'b', 'c']) {
      await transport.streamChat({
        messages: [],
        userMessage: id,
        conversationId: id,
        handlers: noHandlers,
      });
    }
    expect((await transport.listSessions!()).map(s => s.id)).toEqual(['c', 'b']);
    expect(await storage.getItem('expo-ai-assistant:conversation:a')).toBeNull();
  });
});
