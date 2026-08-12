# Example app

Expo Go playground for `expo-ai-assistant`.

```bash
cd example
npm install
npx expo start --go
```

By default the app uses **`createMockTransport()`** (offline).

For a live OpenAI-compatible backend:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
# optional:
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-mini
EXPO_PUBLIC_OPENAI_BASE_URL=https://api.openai.com/v1
```

Tabs:

- **Full page** — `expo-ai-assistant/full-page`
- **Floating** — host composition: floating `onExpand` → bottom-sheet `open`
- **Sheet** — `expo-ai-assistant/bottom-sheet`
- **History** — conversation list (mock transport supports sessions)
