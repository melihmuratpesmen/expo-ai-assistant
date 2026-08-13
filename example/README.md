# Example app (Expo Go · SDK 54)

Playground for `expo-ai-assistant`. Targets **Expo SDK 54** so it opens in the current Expo Go store build.

Offline by default via `createMockTransport()` — no API key required.

Try **“Show a table”** / **“summary”** suggestions to see tool cards + `AiDataTable`. Use the **Dark / Light** toggle in the chrome.

The header shows **v0.1.3** (library `package.json`). If Expo Go still shows an older number, force-quit and scan the QR again.

## Try without cloning

Scan with **Expo Go (SDK 54)**:

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

- Project: [expo.dev/@melihpesmen/expo-ai-assistant-example](https://expo.dev/@melihpesmen/expo-ai-assistant-example)
- Latest update (force open): [0.1.2 demo on EAS](https://expo.dev/accounts/melihpesmen/projects/expo-ai-assistant-example/updates/cb531451-0bfc-4828-b26b-e3c9948164f9) → **Preview**
- Manual URL (Expo Go → Enter URL):

```text
exp://u.expo.dev/645b533c-f76d-4c2d-a725-a7420b210ce7?runtime-version=exposdk%3A54.0.0&channel-name=preview
```

If the app looks stale after a publish: force-quit Expo Go, reopen via the **Preview** link above (or shake device → Reload). Expo Go caches projects; git push alone does not refresh the phone.

## Run locally

```bash
cd example
npm install
npm run start:go
```

From repo root:

```bash
npm run example:go
```

Then open with **Expo Go (SDK 54)** on the same Wi‑Fi (QR is in the terminal, not `localhost`).

## Live OpenAI-compatible backend

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
# optional:
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-mini
EXPO_PUBLIC_OPENAI_BASE_URL=https://api.openai.com/v1
```

## Tabs

| Tab | Surface |
|-----|---------|
| Full page | `expo-ai-assistant/full-page` |
| Floating | FAB + `onExpand` → bottom-sheet (host composition) |
| Sheet | `expo-ai-assistant/bottom-sheet` |
| Modal | `expo-ai-assistant/modal` |
| History | conversation list (mock sessions) |

## Republish hosted demo (maintainers)

```bash
# from repo root
npm run example:publish
```

Publishes an EAS Update on channel `preview` (runtime `exposdk:54.0.0`). The README QR always points at the latest update on that channel.

## Dev notes

- Linked via `"expo-ai-assistant": "file:.."`
- Metro watches `../src`
- Library edits hot-reload in local Expo Go

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Project is incompatible with this version of Expo Go” | Example is SDK **54**. Update Expo Go. |
| QR / connection fails on Wi‑Fi (local) | `npx expo start --go --tunnel` |
| Blank / red box after open | Shake device → Reload; or restart Metro with `-c` |
