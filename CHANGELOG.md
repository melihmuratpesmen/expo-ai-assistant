# Changelog

## 0.3.0

**New**

- **OpenAI tool calling** — `tools` on `createOpenAICompatibleTransport` run on the device (`execute`, optional `toFrontendData`), show as tool cards and feed results back to the model; `toolChoice`, `maxToolRoundtrips`
- OpenAI-compatible transport: `reasoning_content` / `reasoning` deltas, `extraBody`, `includeUsage` (usage on the reply), `timeoutMs`, `formatContext`
- **`createSseTransport`** — connect any SSE backend by mapping events in `onEvent` (spec-compliant `SseEventParser` exported)
- **`createAiSdkTransport`** — Vercel AI SDK UI Message Stream routes (text, reasoning, tool parts, `data-suggestions`)
- **`withLocalHistory(transport, { storage })`** — on-device conversation history (AsyncStorage / MMKV adapter / `createMemoryStorage()`), powering `AiConversationHistoryScreen` without a backend
- **Shared conversations** — `chatId` on `useAiChat`, `AiChatScreen`, `AiChatModalProvider`, `AiQuickAskProvider` and `AiFloatingOverlay`; `open({ reset })`
- **Message interactions** — Retry on failed replies, Edit & resend for user messages (`startEdit` / `submitEdit` / `cancelEdit`), 👍 / 👎 via `callbacks.onFeedback`, follow-up chips from `handlers.onSuggestions`
- **App context** — `context` on `AiAssistantProvider` (object or function) is sent with every request
- Composer: keeps accepting input while a reply streams, `value` / `onChangeText` / `defaultValue` / `maxLength` / `textInputProps`, `leftAccessory` / `rightAccessory` and `slots.renderInputAccessory`
- Transport handlers `onToolError` and `onSuggestions`; tool cards show the error text
- Callbacks `onMessageComplete` and `onFeedback`; message fields `feedback`, `usage`; `AiFunctionCall.error`
- `AiFollowUpSuggestions` component; mock transport offers follow-up chips (`followUps: false` to disable)

**Changes**

- `AiChatInput` is editable while streaming (the send button stays disabled until the reply ends)
- `AiConversationView` subscribes to individual state slices, so typing or edit state does not re-render the message list

## 0.2.0

A structural release: chat state moves into a shared store, every surface renders the same building blocks, and the package ships compiled output. See **Migrating from 0.1** below.

**Breaking changes**

- The package is compiled with react-native-builder-bob: `main` / `types` / `exports` point to `lib/module` (ESM) and `lib/typescript` (declarations). Import only the public entries (`expo-ai-assistant`, `/full-page`, `/floating`, `/modal`, `/bottom-sheet`).
- Removed deprecated exports: `useAiAssistantConfig` (use `useAiTransport`), `useKeyboardBottomInset` / `chatInputBottomPadding` (use `useScreenBottomKeyboardLift`), `AI_WELCOME_TITLE` / `AI_WELCOME_SUBTITLE` / `AI_DISCLAIMER` (use `strings`), `SHOW_AI_ACTIONS`, `AiFabPolicy`, and the bottom-sheet `AiQuickAskInputOverlay` / `AiQuickAskInputBar` (the composer is the sheet footer).
- Modal / sheet contexts now hold controls. `useAiChatModalSession()` / `useAiQuickAskSession()` keep returning `{ isActive, open, close, chat }`; the new `useAiChatModal()` / `useAiQuickAsk()` return controls without chat state.
- `DEFAULT_SUGGESTIONS` are generic prompts; the student-table demo prompts moved to the example. Pass `suggestions` for product-specific ones.
- `AiFrontendDataRenderer` no longer special-cases `TEST_GENERATED` / `TEST_RESULT` / `TEST_PERFORMANCE_ANALYSIS`; register `slots.toolRenderers` for custom payloads (other objects render as key/value).
- Theme: `AiThemeColors` gains `surface`, `bubble` and `border.subtle`; `AiThemeFontFamily` gains `mono`. `AiThemeOverride` is unaffected — only code that builds a complete `AiTheme` must add them.
- `AiMessageBubble` is wrapped in `React.memo`.

**New**

- `AiChatController` (external store) with `useAiChatController`, `useAiChatState`, `useAiChatSelector`, `useAiChatFromController`; `useAiChat()` also returns `controller`
- Primitives: `AiMessageList`, `AiConversationView`, `AiChatFooter`, `AiComposer`, `AiEmptyState`
- `slots.toolRenderers` — custom tool-card bodies keyed by tool name or `frontendData.type`
- Theme tokens `surface.*`, `bubble.*`, `border.subtle`, `fontFamily.mono`; `mergeTheme` export (user bubbles follow an overridden `primary`)
- `suggestions` prop on `AiChatModalProvider` / `AiQuickAskProvider`; sheet `expandOnSend`; `controller` prop on `AiFloatingChatPanel`
- `apiKey` is optional in `OpenAICompatibleTransportOptions` for proxy setups; README recipe for an Expo Router API route proxy
- Strings: `scrollToBottom`, `typing`; exports `toTransportHistory`, `AiFunctionCallStatus` and the new prop / slot types

**Improvements**

- Streamed text is applied once per frame; bubbles are memoized; surfaces subscribe only to the state they render, so opener buttons and headers no longer re-render per token
- Stick-to-bottom auto-scroll that pauses while the user reads older messages, plus a "jump to latest" button; scrolling reaches the real content end (FlatList's `scrollToEnd` ignored content padding, which hid the end of sheet replies under the footer)
- `renderInput` / `renderEmpty` slots are honored by every surface (previously only the full page)
- `open({ initialMessage })` sends immediately on modal, sheet and floating (no timers); closing the floating panel stops the stream; the sheet header stays pinned while scrolling
- Inline `config={{ openai: {…} }}` no longer recreates the transport each render (which refetched the history list); callbacks and strings are read through refs
- `useAiConversations` aborts its request on unmount; code blocks use a monospace font

**Fixes**

- Floating overlay: the bubble and FAB sat below the backdrop, so the bubble's send / expand / close buttons closed the bubble instead of acting
- The typing indicator's accessibility label is localized

**Tooling**

- react-native-builder-bob build, ESLint (typescript-eslint + react-hooks), Prettier, GitHub Actions CI, Changesets

**Migrating from 0.1**

- Buttons that open the modal or sheet: prefer `useAiChatModal()` / `useAiQuickAsk()`.
- Replace removed deprecated exports as listed above.
- Custom `TEST_*` cards: `slots={{ toolRenderers: { TEST_RESULT: MyCard } }}`.
- Relying on the old default suggestions? Pass them explicitly via `suggestions`.

## 0.1.14

First npm release after 0.1.2; it also contains the unpublished 0.1.3–0.1.13 work (listed below).

**Fixes**

- Failed replies are no longer sent back to the model as assistant turns; the error text is a UI fallback instead of message content
- `callbacks.onError` fires once per failure (the OpenAI-compatible transport no longer reports and throws the same error)
- Stopping a reply and sending again right away can no longer be overwritten by the old stream's late deltas, tool events or `finally` cleanup
- Starting a new conversation ignores the previous stream's late result (no stale `conversationId`)
- `sendMessage` right after `startNewConversation` uses the fresh (empty) history
- HTTP errors show the provider message (e.g. "Incorrect API key provided.") instead of `Request failed (401)`
- Cancelling now rejects with `AbortError` in the OpenAI-compatible transport; a trailing SSE line without a newline is no longer dropped; an already-aborted signal does not start a request
- Modal surface wraps its content in `GestureHandlerRootView` so gestures (table scroll) work on Android
- `AiMarkdownText` applies its `style` prop when `react-native-markdown-display` is installed
- Floating panel width follows window size changes (rotation, split screen)
- History loading spinner no longer sticks when `conversationId` changes mid-load

**i18n / a11y**

- New strings: `accessibilityBack`, `newConversation`, `yes`, `no`, `tableColumn`, `itemCount`, `recordCount`, `previousPage`, `nextPage` (replaces hardcoded "Kapat", "Kolon N", "Yes/No", "N items", "N records")
- Accessibility labels / roles for header, close, expand, send, delete and pagination buttons

**Tooling**

- Jest + Testing Library test suite (`npm test`) with regression tests for the fixes above

**Also included (unpublished 0.1.3–0.1.13)**

- Keyboard lift via `useScreenBottomKeyboardLift` (translateY) with an opaque keyboard fill on full-page, modal and sheet
- Bottom sheet: composer lives in the gorhom footer, the sheet is mounted only while open, tables scroll horizontally, and list / sheet pans no longer conflict
- Floating: the input bubble lifts with the FAB; the FAB's default position uses the overlay bounds
- Full-page empty state: suggestion chips sit just above the composer
- Example app: circular light/dark reveal, visible library version badge

## 0.1.2

- Keyboard-aware input padding on full-page + modal (`useKeyboardBottomInset`); bottom-sheet uses gorhom `keyboardBehavior="interactive"`
- Example app dark / light toggle via `colorScheme`
- Mock transport tool demos: table (`Show students as a table`) + key/value overview

## 0.1.1

- Hosted Expo Go demo (SDK 54) with README QR — channel `preview` on `@melihpesmen/expo-ai-assistant-example`

## 0.1.0

- Initial public release — vendor-agnostic AI chat surfaces for Expo / React Native
- Pluggable `AiTransport` with default OpenAI-compatible Chat Completions streaming
- `createMockTransport` for offline demos
- Surfaces: `full-page`, `floating`, `modal`, `bottom-sheet` (optional `@gorhom/bottom-sheet` peer)
- Editable theme, i18n strings, render slots, lifecycle callbacks
- Chat UX: stop generation, regenerate, copy, typing indicator, reasoning badge
- Optional peers: `react-native-markdown-display`, `expo-clipboard`
- Headless recipe documented in README
- Source-first package (TypeScript shipped for Metro)
