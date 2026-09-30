# expo-ai-assistant

Surface-first AI chat kit for **Expo** and **React Native**.

Bring your own backend. Ship full-page, floating, modal, or bottom-sheet chat UIs without locking into a single vendor.

[![npm](https://img.shields.io/npm/v/expo-ai-assistant.svg)](https://www.npmjs.com/package/expo-ai-assistant)
[![license](https://img.shields.io/npm/l/expo-ai-assistant.svg)](./LICENSE)
[![Expo Go](https://img.shields.io/badge/Expo%20Go-SDK%2054-000020?logo=expo)](#try-in-expo-go)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6?logo=typescript&logoColor=white)](./src/index.ts)

`0.x` — public API may evolve; see the [changelog](./CHANGELOG.md) (0.1 → 0.2 notes included).

---

## Try in Expo Go

Scan with **Expo Go (SDK 54)** — offline mock transport, no API key needed.

<p align="center">
  <a href="https://expo.dev/@melihpesmen/expo-ai-assistant-example">
    <img
      src="https://qr.expo.dev/eas-update?projectId=645b533c-f76d-4c2d-a725-a7420b210ce7&runtimeVersion=exposdk%3A54.0.0&channel=preview"
      alt="Scan to open expo-ai-assistant demo in Expo Go"
      width="220"
      height="220"
    />
  </a>
</p>

<p align="center">
  <a href="https://expo.dev/@melihpesmen/expo-ai-assistant-example"><b>Open on expo.dev</b></a>
  ·
  <code>exp://u.expo.dev/645b533c-f76d-4c2d-a725-a7420b210ce7?runtime-version=exposdk%3A54.0.0&amp;channel-name=preview</code>
</p>

Demo tabs: full page · floating · bottom sheet · modal · history. Local playground: [example/README.md](./example/README.md).

---

## Highlights

- **Independent surfaces** — import only what you use; only `./bottom-sheet` pulls `@gorhom/bottom-sheet`
- **Pluggable transport** — OpenAI-compatible Chat Completions out of the box, or any backend via `AiTransport`
- **Smooth streaming** — tokens are applied once per frame, bubbles are memoized, and surfaces subscribe only to the state they render
- **Stick-to-bottom list** — follows the reply while you are at the bottom, stops when you scroll up to read, "jump to latest" button
- **Editable UI** — theme tokens, i18n strings, render slots, custom tool-card renderers, lifecycle callbacks
- **Tool calls & rich content** — on-device OpenAI tool calling, tool cards, tables, key/value data, content blocks
- **Backends** — OpenAI-compatible, Vercel AI SDK routes, any SSE API, or your own transport; optional on-device history
- **Chat UX** — stop, regenerate / retry, edit & resend, 👍 / 👎 feedback, follow-up suggestion chips, shared conversations across surfaces

---

## Installation

```bash
npx expo install expo-ai-assistant react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-keyboard-controller @expo/vector-icons
```

Optional:

```bash
npx expo install @gorhom/bottom-sheet            # bottom-sheet surface
npx expo install react-native-markdown-display   # markdown rendering
npx expo install expo-clipboard                   # copy action
```

**App setup**

1. Wrap the app in `GestureHandlerRootView`
2. Wrap the app in `KeyboardProvider` from `react-native-keyboard-controller`
3. Enable the Reanimated Babel plugin
4. Wrap chat trees in `AiAssistantProvider`

| Peer                                                   | Required                                  |
| ------------------------------------------------------ | ----------------------------------------- |
| `react`, `react-native`                                | Yes                                       |
| `react-native-gesture-handler`                         | Yes                                       |
| `react-native-reanimated`                              | Yes                                       |
| `react-native-keyboard-controller`                     | Yes — keyboard-aware composer             |
| `react-native-safe-area-context`, `@expo/vector-icons` | Yes                                       |
| `@gorhom/bottom-sheet`                                 | Only for `expo-ai-assistant/bottom-sheet` |
| `react-native-markdown-display`                        | Optional — markdown in replies            |
| `expo-clipboard`                                       | Optional — nicer copy action              |

---

## Quick start

```tsx
import { AiAssistantProvider } from 'expo-ai-assistant';
import { AiChatScreen } from 'expo-ai-assistant/full-page';

export default function App() {
  return (
    <AiAssistantProvider
      config={{
        openai: {
          // Your proxy — see "Keep your API key off the device" below.
          baseUrl: 'https://your-app.expo.app/api',
          chatPath: '/chat',
          model: 'gpt-4o-mini',
        },
      }}
    >
      <AiChatScreen />
    </AiAssistantProvider>
  );
}
```

Offline / demo: `config={{ transport: createMockTransport() }}`.

### Keep your API key off the device

> [!WARNING]
> Anything shipped in the app bundle can be extracted — including `EXPO_PUBLIC_*` environment variables, even when read inside an `apiKey: () => …` function. Use a provider key in the app only for local prototypes.

Put the key behind a server route and point the transport at it. With [Expo Router API routes](https://docs.expo.dev/router/web/api-routes/) (enable server output, e.g. `"web": { "output": "server" }`, and deploy with EAS Hosting or another host):

```ts
// app/api/chat+api.ts — runs on the server; OPENAI_API_KEY never reaches the app
export async function POST(request: Request) {
  const { messages } = await request.json();

  // Authenticate your user here (session cookie, bearer token, …) before spending tokens.

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // Pin the model and limits server-side instead of trusting the client.
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, stream: true, max_tokens: 1024 }),
  });

  // Pass the SSE stream straight through.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream' },
  });
}
```

```tsx
createOpenAICompatibleTransport({
  baseUrl: 'https://your-app.expo.app/api',
  chatPath: '/chat',
  model: 'gpt-4o-mini',
  // No apiKey: the server adds it. Send your own auth instead:
  getHeaders: async () => ({ Authorization: `Bearer ${await getSessionToken()}` }),
});
```

### Custom transport

Any backend works — implement `streamChat` and call the handlers as data arrives:

```tsx
import type { AiTransport } from 'expo-ai-assistant';

const transport: AiTransport = {
  async streamChat({ messages, userMessage, conversationId, context, signal, handlers }) {
    // stream from your API…
    handlers.onTextDelta?.(delta, fullTextSoFar);
    handlers.onReasoningDelta?.(delta, reasoningSoFar);
    handlers.onToolStart?.({ id, name, label });
    handlers.onToolComplete?.({ id, name, frontendData }); // or onToolError({ id, name, error })
    handlers.onSuggestions?.([{ id: 'more', label: 'Tell me more', prompt: 'Tell me more' }]);
    return { text: fullText, conversationId: 'server-session-id', usage };
  },
  // Optional: persisted history for AiConversationHistoryScreen
  listSessions,
  getHistory,
  deleteSession,
};
```

Contract notes: throw on fatal errors (the hook reports them once), reject with an `AbortError` when `signal` aborts, and treat `messages` as prior context (failed or empty assistant turns are already filtered out).

### SSE APIs and Vercel AI SDK routes

For a backend that streams Server-Sent Events, map its events instead of writing networking code:

```tsx
import { createSseTransport } from 'expo-ai-assistant';

const transport = createSseTransport({
  url: 'https://api.example.com/chat',
  getHeaders: async () => ({ Authorization: `Bearer ${await getToken()}` }),
  // Default body: { messages: [{ role, content }], message, conversationId, context }
  onEvent: ({ event, data }, ctx) => {
    if (data === '[DONE]') return;
    const json = JSON.parse(data);
    if (event === 'session') ctx.setConversationId(json.id);
    if (event === 'token') ctx.text(json.text);
    if (event === 'tool') ctx.toolStart({ id: json.id, name: json.name });
    if (event === 'tool_result') ctx.toolComplete({ id: json.id, frontendData: json.data });
    if (event === 'error') ctx.fail(json.message);
  },
});
```

A route built with the Vercel AI SDK (`streamText(…).toUIMessageStreamResponse()`) works as-is:

```tsx
import { createAiSdkTransport } from 'expo-ai-assistant';

const transport = createAiSdkTransport({ api: 'https://your-app.com/api/chat' });
```

Text, reasoning and tool parts render in the chat; a `data-suggestions` part (`data: [{ id, label, prompt }]`) shows follow-up chips.

### Conversation history on the device

Wrap any transport to save completed conversations locally — the history screen then works without a backend:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withLocalHistory, createOpenAICompatibleTransport } from 'expo-ai-assistant';

const transport = withLocalHistory(createOpenAICompatibleTransport({ … }), {
  storage: AsyncStorage, // any { getItem, setItem, removeItem }; createMemoryStorage() for tests
  maxConversations: 50,
});
```

---

## Surfaces

| Entry        | Import                           | Main API                                      |
| ------------ | -------------------------------- | --------------------------------------------- |
| Core         | `expo-ai-assistant`              | provider, hooks, primitives, transports       |
| Full page    | `expo-ai-assistant/full-page`    | `AiChatScreen`, `AiConversationHistoryScreen` |
| Floating     | `expo-ai-assistant/floating`     | `AiFloatingOverlay`                           |
| Modal        | `expo-ai-assistant/modal`        | `AiChatModalProvider`, `useAiChatModal`       |
| Bottom sheet | `expo-ai-assistant/bottom-sheet` | `AiQuickAskProvider`, `useAiQuickAsk`         |

See [docs/SURFACES.md](./docs/SURFACES.md).

### Modal

```tsx
import { AiChatModalProvider, useAiChatModal } from 'expo-ai-assistant/modal';

function AskButton() {
  // Controls only — this button does not re-render while replies stream.
  const { open } = useAiChatModal();
  return <Button title="Ask" onPress={() => open({ initialMessage: 'Hello' })} />;
}

<AiChatModalProvider presentation="card" /* or "fullscreen" */ suggestions={mySuggestions}>
  <AskButton />
</AiChatModalProvider>;
```

Need live chat state next to the controls? `useAiChatModalSession()` returns `{ isActive, open, close, chat }`.

### Bottom sheet

```tsx
import { AiQuickAskProvider, useAiQuickAsk } from 'expo-ai-assistant/bottom-sheet';

<AiQuickAskProvider onOpenFullPage={id => navigate('Chat', { id })}>
  <Screen />
</AiQuickAskProvider>;

const { open } = useAiQuickAsk();
open({ initialMessage: 'Summarize this page' });
```

The sheet expands to its top snap point when a message is sent (gorhom locks list scrolling below it); pass `expandOnSend={false}` to opt out.

### Floating → sheet / modal

```tsx
import { AiFloatingOverlay } from 'expo-ai-assistant/floating';
import { useAiQuickAsk } from 'expo-ai-assistant/bottom-sheet';

function Bridge() {
  const { open } = useAiQuickAsk();
  return <AiFloatingOverlay onExpand={draft => open({ initialMessage: draft })} />;
}
```

Without `onExpand`, the overlay opens its built-in compact chat panel.

---

## Headless

Build your own screen from the hook and primitives:

```tsx
import { useAiChat, AiMessageList, AiChatInput } from 'expo-ai-assistant';

function MyChat() {
  const chat = useAiChat();
  return (
    <View style={{ flex: 1 }}>
      <AiMessageList
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onRegenerate={chat.regenerateLastResponse}
      />
      <AiChatInput
        onSend={text => void chat.sendMessage(text)}
        isStreaming={chat.isStreaming}
        onStop={chat.cancelStreaming}
      />
    </View>
  );
}
```

`AiMessageList` handles memoized bubbles, stick-to-bottom auto-scroll and the "jump to latest" button. `AiConversationView` adds loading and empty states; `AiChatFooter` is the composer with error line, disclaimer and keyboard lift.

### Sharing a conversation between surfaces

Give surfaces the same `chatId` and they show one conversation. "Open full page" from the modal then continues the same stream instead of reloading history, and closing the modal does not stop a reply:

```tsx
<AiChatModalProvider chatId="main" onOpenFullPage={() => navigate('Chat')}>…</AiChatModalProvider>

// Chat screen
<AiChatScreen chatId="main" />
```

`open()` continues a shared conversation; pass `open({ reset: true })` to start over. Hooks accept it too: `useAiChat({ chatId: 'main' })`.

### Selective subscriptions

Chat state lives in an `AiChatController` (an external store). Create one, pass it around, and subscribe only to what each component renders:

```tsx
const controller = useAiChatController(); // no re-renders by itself

function StopButton() {
  const isStreaming = useAiChatSelector(controller, s => s.isStreaming);
  return isStreaming ? <Button title="Stop" onPress={controller.cancelStreaming} /> : null;
}

function Messages() {
  const { messages } = useAiChatState(controller);
  return <AiMessageList messages={messages} />;
}
```

---

## Tool calls & custom renderers

### OpenAI tool calling

Tools run on the device; their results go back to the model until it answers, and each call shows as a tool card:

```tsx
createOpenAICompatibleTransport({
  baseUrl,
  model: 'gpt-4o-mini',
  tools: [
    {
      name: 'getOrders',
      label: 'Recent orders',
      description: 'List the signed-in user’s recent orders',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } },
      execute: async ({ limit = 5 }, { signal }) => api.orders({ limit, signal }),
      // What the card shows (defaults to the result): arrays of objects become a table.
      toFrontendData: orders => orders.map(o => ({ id: o.id, total: o.total, status: o.status })),
    },
  ],
});
```

Throwing from `execute` marks the card as failed and tells the model. `maxToolRoundtrips` (default 5), `toolChoice`, `extraBody` (`max_tokens`, …), `includeUsage` and `timeoutMs` are available too; `reasoning_content` / `reasoning` deltas (DeepSeek, OpenRouter, …) show in the "Thinking" panel.

### Custom card bodies

Tool events from any transport render as tool cards. Arrays of objects become a paginated table, objects a key/value list. Register your own card bodies by **tool name** or by the **`type` field** of the tool's `frontendData`:

```tsx
import type { AiToolRenderer } from 'expo-ai-assistant';

const WeatherCard: AiToolRenderer = ({ data }) => <Weather {...(data as WeatherData)} />;

<AiAssistantProvider config={config} slots={{ toolRenderers: { getWeather: WeatherCard } }}>
```

`slots.renderFunctionCall` replaces the whole card.

---

## Message interactions

| Feature           | How                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Stop / regenerate | Built in; a failed reply shows **Retry**                                                         |
| Edit & resend     | **Edit** on user messages prefills the composer; sending replaces that turn and everything after |
| Feedback          | Provide `callbacks.onFeedback(message, 'up' \| 'down' \| null)` to show 👍 / 👎                  |
| Follow-up chips   | Transports call `handlers.onSuggestions([...])`; chips appear under the latest reply             |
| Keep typing       | The composer stays editable while a reply streams; sending waits for it                          |
| Analytics         | `callbacks.onMessageComplete(message)` with final text, tool calls and `usage`                   |

Controller methods for custom UIs: `startEdit(id)`, `submitEdit(text)`, `cancelEdit()`, `setFeedback(id, rating)`.

### App context

Tell the assistant where the user is. `context` is sent with every request (`AiTransportStreamParams.context`); the OpenAI-compatible transport adds it as a system message (customize with `formatContext`):

```tsx
<AiAssistantProvider
  config={config}
  context={() => ({ screen: currentRoute.name, orderId: currentRoute.params?.orderId, locale })}
/>
```

### Composer accessories

```tsx
<AiAssistantProvider
  config={config}
  slots={{
    renderInputAccessory: ({ side }) => (side === 'left' ? <AttachButton /> : <MicButton />),
  }}
/>
```

`AiChatInput` also takes `value` / `onChangeText` (controlled), `defaultValue`, `maxLength`, `textInputProps`, `leftAccessory` and `rightAccessory`.

---

## Customization

| Lever       | API                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme       | `theme`, `colorScheme` on the provider                                                                                                                               |
| Copy / i18n | `strings` on the provider (`useAiStrings`)                                                                                                                           |
| UI slots    | `slots.renderMessage`, `renderInput`, `renderInputAccessory`, `renderEmpty`, `renderFunctionCall`, `renderContentBlocks`, `toolRenderers` — honored by every surface |
| Callbacks   | `callbacks.onMessageSent`, `onStreamStart`, `onStreamEnd`, `onMessageComplete`, `onError`, `onToolComplete`, `onConversationCreated`, `onFeedback`                   |
| Context     | `context` on the provider (object or function)                                                                                                                       |
| Backend     | `config.transport` or `config.openai`                                                                                                                                |

### Theme tokens

```tsx
<AiAssistantProvider
  colorScheme="dark"
  theme={{
    colors: {
      primary: { DEFAULT: '#7C3AED' }, // user bubbles follow primary unless set explicitly
      bubble: { assistant: '#1E1B4B' },
      surface: { input: '#111827', code: '#0B0F1A' },
    },
    fontFamily: { regular: 'Inter', semibold: 'Inter-SemiBold', mono: 'JetBrainsMono' },
  }}
/>
```

Color groups: `bg`, `text`, `border` (`DEFAULT`, `subtle`), `surface` (`raised`, `card`, `input`, `code`, `subtle`, `stripe`, `backdrop`), `bubble` (`user`, `userText`, `assistant`, `assistantText`), `primary`, `error`, `success`, `warning`, `info`.

### Strings

Every visible label and accessibility label is in `strings`:

```tsx
<AiAssistantProvider
  config={config}
  strings={{
    inputPlaceholder: 'Mesaj yazın…',
    tableColumn: index => `Sütun ${index}`,
    recordCount: count => `${count} kayıt`,
  }}
/>
```

### Performance tips

- Pass stable `slots` / `callbacks` objects (define them outside the component or memoize them) so bubbles are not re-rendered by context changes.
- Buttons that only open a surface should use `useAiChatModal()` / `useAiQuickAsk()` (controls only).
- Inline `config={{ openai: {…} }}` is fine — the provider keeps the transport stable and reads the latest options per request.

---

## Example

```bash
npm install
npm --prefix example install
npm run example:go
```

The example uses `createMockTransport()` with tool / table demos. Set `EXPO_PUBLIC_OPENAI_API_KEY` to try the OpenAI-compatible transport locally (prototype only — see the warning above).

## Development

```bash
npm run typecheck   # tsc
npm run lint        # eslint (typescript-eslint + react-hooks)
npm test            # jest + @testing-library/react-native
npm run build       # react-native-builder-bob → lib/
```

Releases use [Changesets](https://github.com/changesets/changesets): add a changeset with `npx changeset`, then `npx changeset version` bumps the version and writes the changelog. Demo-only changes do not need a library release.

## Docs

- [Surfaces](./docs/SURFACES.md)
- [Deferred](./docs/DEFERRED.md)
- [Example / Expo Go](./example/README.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
