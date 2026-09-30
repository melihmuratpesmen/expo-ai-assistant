import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AiAssistantProvider } from '../../provider/AiAssistantProvider';
import { createMockTransport } from '../../transport/createMockTransport';
import type { AiStringsOverride } from '../../i18n/strings';
import type { AiChatMessage } from '../../types/aiChat';
import { AiMessageBubble } from '../AiMessageBubble';
import { AiMessageContent } from '../AiMessageContent';

function renderWithProvider(ui: React.ReactElement, strings?: AiStringsOverride) {
  return render(
    <AiAssistantProvider config={{ transport: createMockTransport() }} strings={strings}>
      {ui}
    </AiAssistantProvider>
  );
}

const baseMessage: AiChatMessage = {
  id: 'a1',
  role: 'assistant',
  content: '',
  createdAt: 0,
};

describe('AiMessageBubble', () => {
  it('shows the localized fallback for a failed reply without output', async () => {
    await renderWithProvider(<AiMessageBubble message={{ ...baseMessage, status: 'error' }} />, {
      errorStream: 'Yanıt oluşturulamadı.',
    });
    expect(screen.getByText('Yanıt oluşturulamadı.')).toBeTruthy();
  });

  it('keeps partial output of a failed reply', async () => {
    await renderWithProvider(
      <AiMessageBubble message={{ ...baseMessage, status: 'error', content: 'Partial answer' }} />
    );
    expect(screen.getByText('Partial answer')).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});

describe('AiMessageContent', () => {
  it('labels header-less table columns through strings', async () => {
    await renderWithProvider(
      <AiMessageContent blocks={[{ type: 'table', headers: [], rows: [['a', 'b']] }]} />,
      { tableColumn: i => `Kolon ${i}` }
    );
    expect(screen.getByText('Kolon 1')).toBeTruthy();
    expect(screen.getByText('Kolon 2')).toBeTruthy();
  });
});
