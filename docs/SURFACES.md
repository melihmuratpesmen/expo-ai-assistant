# Surfaces

`expo-ai-assistant` ships **independent presentation surfaces** over a shared core. Surfaces do **not** import each other; host apps compose them when needed.

All surfaces render the same building blocks (`AiConversationView`, `AiMessageList`, `AiChatFooter`), so slots (`renderMessage`, `renderInput`, `renderEmpty`, `toolRenderers`, …), theme tokens, strings and message interactions (edit, retry, feedback, follow-ups) behave the same everywhere.

Every surface accepts a `chatId`. Surfaces with the same id show one shared conversation: opening continues it (`open({ reset: true })` starts over) and closing a modal or sheet does not stop a streaming reply.

## Core (`expo-ai-assistant`)

- `AiAssistantProvider` — transport, theme, strings, slots, callbacks
- `AiChatController` + `useAiChat` / `useAiChatController` / `useAiChatState` / `useAiChatSelector`
- `useAiConversations` — persisted session list
- Primitives: `AiMessageList`, `AiConversationView`, `AiChatFooter`, `AiChatInput`, `AiMessageBubble`, `AiEmptyState`, tool cards, tables
- `createOpenAICompatibleTransport` / `createMockTransport`

No `@gorhom/bottom-sheet` import. Can be used headless (see README).

## Full page (`expo-ai-assistant/full-page`)

- `AiChatScreen` — header (back, new chat, history), messages, composer; `conversationId` loads history through `transport.getHistory`
- `AiConversationHistoryScreen` — requires transport `listSessions` / `getHistory` (and `deleteSession` for delete)

## Floating (`expo-ai-assistant/floating`)

- `AiFloatingOverlay` — draggable FAB + quick input bubble + built-in compact chat panel
- Optional `onExpand(draft)` — hand the draft to a sheet / modal / full page instead of the built-in panel
- `AiFloatingChatPanel` accepts a `controller` to show an existing conversation

## Modal (`expo-ai-assistant/modal`)

- `AiChatModalProvider` — RN `Modal` only (**no** `@gorhom/bottom-sheet`); `presentation`: `card` (default) or `fullscreen`
- `useAiChatModal()` — `{ isActive, open, close, controller }`; does not re-render while replies stream
- `useAiChatModalSession()` — the same plus live `chat` state

## Bottom sheet (`expo-ai-assistant/bottom-sheet`)

- `AiQuickAskProvider` — requires peer `@gorhom/bottom-sheet`; composer lives in the sheet footer so list and sheet gestures keep working
- `useAiQuickAsk()` / `useAiQuickAskSession()` — same split as the modal
- `expandOnSend` (default `true`) — expands to the top snap point when a message is sent, because gorhom locks list scrolling below it
- Only this entry imports gorhom

## Dependency isolation

| Import path                      | Pulls `@gorhom/bottom-sheet`? |
| -------------------------------- | ----------------------------- |
| `expo-ai-assistant`              | No                            |
| `expo-ai-assistant/full-page`    | No                            |
| `expo-ai-assistant/floating`     | No                            |
| `expo-ai-assistant/modal`        | No                            |
| `expo-ai-assistant/bottom-sheet` | Yes (peer)                    |

`npm run verify:gorhom` checks this in CI.
