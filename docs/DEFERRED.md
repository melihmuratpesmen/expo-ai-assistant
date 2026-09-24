# Deferred

Not in `0.2.x` yet (see the changelog for what shipped):

- OpenAI-compatible tool calling (`tools` + client-side execution) — the UI, custom `AiTransport`s and the mock transport already support tool cards and tables
- Local persistence adapter (AsyncStorage / MMKV) so history works without a backend
- Sharing one conversation between surfaces by id (a shared `AiChatController` can already be passed around manually)
- Generic SSE transport and adapters for other streaming protocols
- Message interactions: retry on error, edit & resend, feedback, follow-up suggestion chips
- Attachment / voice input
- Floating FAB position persistence
