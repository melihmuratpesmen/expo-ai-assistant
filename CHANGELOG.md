# Changelog

## 0.1.13

- Sheet gestures restored: input is a gorhom footer (no full-screen overlay stealing pans); list and sheet can scroll again

## 0.1.12

- Sheet scrolling restored: FlatList is the sheet’s scrollable child; input overlay no longer covers the message list

## 0.1.11

- Sheet message list owns vertical scrolling (long replies can be panned); sheet closes from the handle / backdrop

## 0.1.10

- Theme reveal no longer flashes at the end (frozen incoming tree + overlay stays full-size until the live theme has painted)

## 0.1.9

- Theme circle expands the new UI from the tap while the rest of the screen stays on the old theme (no black flash outside the wave)

## 0.1.8

- Theme wipe reveals the new UI through the circle (swap first); no more solid black/white fill covering the screen

## 0.1.7

- Demo theme toggle: ReplyZen circular wipe via Reanimated (no Skia snapshot); circle grows from the tap, then the theme swaps

## 0.1.6

- Demo light/dark uses ReplyZen’s circular reveal (tap origin, 700ms easeInOutCubic; color fallback if snapshot fails)

## 0.1.5

- Sheet overlay is mounted only while open, so a closed sheet no longer swallows all app touches

## 0.1.4

- Full-page / modal / sheet: opaque keyboard fill so chat no longer shows through the gap above the keyboard
- Floating bubble now lifts with the FAB (overlay-relative keyboard math)
- Sheet Open no longer crashes (no RN Modal, overlay uses regular TextInput, sheet hosted in an absolute fill)
- Full-page empty state: chips sit just above the composer instead of leaving a large gap
- Demo light/dark toggle swaps even if the Skia snapshot/animation fails

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
