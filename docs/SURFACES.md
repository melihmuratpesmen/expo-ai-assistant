# Surfaces

`expo-ai-assistant` ships **independent presentation surfaces** over a shared core. Surfaces do **not** import each other. Host apps compose them when needed.

## Core (`expo-ai-assistant`)

- `AiAssistantProvider` — transport, theme, strings, slots, callbacks
- `useAiChat` / `useAiConversations`
- Message / input primitives
- `createOpenAICompatibleTransport` / `createMockTransport`

No `@gorhom/bottom-sheet` import. Can be used headless (see README recipe).

## Full page (`expo-ai-assistant/full-page`)

- `AiChatScreen`
- `AiConversationHistoryScreen` (requires transport `listSessions` / `getHistory`)

## Floating (`expo-ai-assistant/floating`)

- `AiFloatingOverlay` — FAB + input bubble + built-in compact chat panel
- Optional `onExpand` — host can open sheet / modal / full page

## Modal (`expo-ai-assistant/modal`)

- `AiChatModalProvider` + `useAiChatModalSession`
- RN `Modal` only — **no** `@gorhom/bottom-sheet`
- `presentation`: `card` (default) or `fullscreen`

## Bottom sheet (`expo-ai-assistant/bottom-sheet`)

- `AiQuickAskProvider` + `useAiQuickAskSession`
- Requires peer `@gorhom/bottom-sheet`
- Only this entry imports gorhom

## Dependency isolation

| Import path | Pulls `@gorhom/bottom-sheet`? |
|-------------|-------------------------------|
| `expo-ai-assistant` | No |
| `expo-ai-assistant/full-page` | No |
| `expo-ai-assistant/floating` | No |
| `expo-ai-assistant/modal` | No |
| `expo-ai-assistant/bottom-sheet` | Yes (peer) |
