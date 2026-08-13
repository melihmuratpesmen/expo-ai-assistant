# expo-ai-assistant

Surface-first AI chat kit for **Expo** and **React Native**.

Bring your own backend. Ship full-page, floating, modal, or bottom-sheet chat UIs without locking into a single vendor.

[![npm](https://img.shields.io/npm/v/expo-ai-assistant.svg)](https://www.npmjs.com/package/expo-ai-assistant)
[![license](https://img.shields.io/npm/l/expo-ai-assistant.svg)](./LICENSE)
[![Expo Go](https://img.shields.io/badge/Expo%20Go-SDK%2054-000020?logo=expo)](#try-in-expo-go)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6?logo=typescript&logoColor=white)](./src/index.ts)

`0.x` — public API may evolve; see [changelog](./CHANGELOG.md).

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

Demo tabs: full page · floating · bottom sheet · modal · history.

Local playground: [example/README.md](./example/README.md).

---

## Positioning

- **Surfaces are independent** — import only what you need
- **Transport is pluggable** — default OpenAI-compatible Chat Completions, or a fully custom `AiTransport`
- **UI is editable** — theme, strings (i18n), render slots, lifecycle callbacks

---

## Surfaces

| Entry | Import | Optional peer |
|-------|--------|----------------|
| Core | `expo-ai-assistant` | — |
| Full page | `expo-ai-assistant/full-page` | — |
| Floating | `expo-ai-assistant/floating` | — |
| Modal | `expo-ai-assistant/modal` | — |
| Bottom sheet | `expo-ai-assistant/bottom-sheet` | `@gorhom/bottom-sheet` |

See [docs/SURFACES.md](./docs/SURFACES.md).

---

## Installation

```bash
npx expo install expo-ai-assistant react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-keyboard-controller
npm install @expo/vector-icons
```

**Optional** (bottom-sheet surface only):

```bash
npx expo install @gorhom/bottom-sheet
```

**Required app setup**

1. Wrap the app in `GestureHandlerRootView`
2. Wrap the app in `KeyboardProvider` from `react-native-keyboard-controller`
3. Enable the Reanimated Babel plugin
4. Wrap chat trees in `AiAssistantProvider`

### Peer dependencies

| Package | Required |
|---------|----------|
| `react`, `react-native` | Yes |
| `react-native-gesture-handler` | Yes |
| `react-native-reanimated` | Yes |
| `react-native-keyboard-controller` | Yes — keyboard lift (same pattern as MyExamy) |
| `react-native-safe-area-context` | Yes |
| `@expo/vector-icons` | Yes |
| `@gorhom/bottom-sheet` | Optional — only for `./bottom-sheet` |
| `expo-clipboard` | Optional — nicer copy action |
| `react-native-markdown-display` | Optional — markdown rendering |

---

## Quick start

### Default transport (OpenAI-compatible)

```tsx
import { AiAssistantProvider } from 'expo-ai-assistant';
import { AiChatScreen } from 'expo-ai-assistant/full-page';

export default function App() {
  return (
    <AiAssistantProvider
      config={{
        openai: {
          apiKey: () => process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? null,
          model: 'gpt-4o-mini',
        },
      }}
    >
      <AiChatScreen />
    </AiAssistantProvider>
  );
}
```

### Custom transport

```tsx
import { AiAssistantProvider, type AiTransport, createMockTransport } from 'expo-ai-assistant';

const transport: AiTransport = {
  async streamChat({ userMessage, handlers }) {
    handlers.onTextDelta?.(userMessage, userMessage);
    return { text: userMessage, conversationId: '1' };
  },
};

<AiAssistantProvider config={{ transport /* or createMockTransport() */ }}>
  …
</AiAssistantProvider>
```

### Modal (no gorhom)

```tsx
import { AiChatModalProvider, useAiChatModalSession } from 'expo-ai-assistant/modal';

function OpenButton() {
  const { open } = useAiChatModalSession();
  return <Button title="Ask" onPress={() => open({ initialMessage: 'Hello' })} />;
}

<AiChatModalProvider presentation="card" /* or "fullscreen" */>
  <OpenButton />
</AiChatModalProvider>
```

### Floating → sheet / modal (host composition)

```tsx
import { AiFloatingOverlay } from 'expo-ai-assistant/floating';
import { useAiChatModalSession } from 'expo-ai-assistant/modal';

function Bridge() {
  const { open } = useAiChatModalSession();
  return <AiFloatingOverlay onExpand={(draft) => open({ initialMessage: draft })} />;
}
```

---

## Headless recipe

Use the core hook + primitives without any surface entry:

```tsx
import {
  AiAssistantProvider,
  useAiChat,
  AiMessageBubble,
  AiChatInput,
  createMockTransport,
} from 'expo-ai-assistant';
import { FlatList, View } from 'react-native';

function HeadlessChat() {
  const { messages, sendMessage, isStreaming, cancelStreaming, regenerateLastResponse } =
    useAiChat();
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => (
          <AiMessageBubble
            message={item}
            showRegenerate={!isStreaming && item.id === lastAssistantId}
            onRegenerate={() => void regenerateLastResponse()}
          />
        )}
      />
      <AiChatInput
        onSend={text => void sendMessage(text)}
        isStreaming={isStreaming}
        onStop={cancelStreaming}
      />
    </View>
  );
}

export default function App() {
  return (
    <AiAssistantProvider config={{ transport: createMockTransport() }}>
      <HeadlessChat />
    </AiAssistantProvider>
  );
}
```

---

## Customization

| Lever | Prop / API |
|-------|------------|
| Theme | `theme`, `colorScheme` on provider |
| Copy / i18n | `strings` on provider (`useAiStrings`) |
| UI slots | `slots.renderMessage`, `renderInput`, `renderEmpty`, … |
| Analytics | `callbacks.onMessageSent`, `onStreamStart`, `onError`, … |
| Backend | `config.transport` or `config.openai` |

### Chat UX

- **Stop** / **Regenerate** / **Copy**
- **Typing indicator** + optional **reasoning** badge
- **Markdown** via optional `react-native-markdown-display`

---

## Public API (core)

| Export | Role |
|--------|------|
| `AiAssistantProvider` | Transport + theme + strings + slots |
| `createOpenAICompatibleTransport` | Default public transport factory |
| `createMockTransport` | Offline demo transport |
| `useAiChat` / `useAiConversations` | Chat state |
| `AiChatInput`, `AiMessageBubble`, … | Primitives |
| `useAiTheme` / `useAiStrings` | Theming & copy |

---

## Example

Quick try: [scan the Expo Go QR](#try-in-expo-go) above.

Run locally:

```bash
npm install
npm --prefix example install
npm run example:go
```

Defaults to `createMockTransport()` with **tool / table demos** — try the “Show a table” suggestion or ask for a summary. Toggle **Dark / Light** in the example chrome. Set `EXPO_PUBLIC_OPENAI_API_KEY` for live OpenAI-compatible chat (tool streaming still requires a custom `AiTransport` or MyExamy-style backend).

Republish the hosted Expo Go demo (maintainers):

```bash
npm run example:publish
```

### Tool calling & tables

**UI is included:** `AiFunctionCallCard`, `AiFrontendDataRenderer`, `AiDataTable`, content blocks. Wire them by emitting `onToolStart` / `onToolComplete` from your `AiTransport` (mock transport does this for demo prompts). OpenAI-compatible default transport is text-only for now — see [docs/DEFERRED.md](./docs/DEFERRED.md).

---

## Docs

- [Surfaces](./docs/SURFACES.md)
- [Deferred](./docs/DEFERRED.md)
- [Example / Expo Go](./example/README.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
