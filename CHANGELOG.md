# Changelog

## 0.1.3

- Keyboard lift matches MyExamy (`useScreenBottomKeyboardLift` + sheet input overlay)
- Demo: circular Telegram-style light/dark reveal, visible version badge
- Floating FAB default position uses overlay bounds (not stuck to the bottom)
- Sheet tables: horizontal scroll via gesture-handler + sheet `failOffsetX`

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
