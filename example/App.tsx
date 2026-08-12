import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AiAssistantProvider, createMockTransport } from 'expo-ai-assistant';
import { AiChatScreen, AiConversationHistoryScreen } from 'expo-ai-assistant/full-page';
import { AiFloatingOverlay } from 'expo-ai-assistant/floating';
import { AiQuickAskProvider, useAiQuickAskSession } from 'expo-ai-assistant/bottom-sheet';
import { AiChatModalProvider, useAiChatModalSession } from 'expo-ai-assistant/modal';

type Tab = 'full' | 'floating' | 'sheet' | 'modal' | 'history';

function SheetDemo() {
  const { open } = useAiQuickAskSession();
  return (
    <View style={styles.centered}>
      <Text style={styles.hint}>
        Bottom-sheet surface — requires @gorhom/bottom-sheet (installed in this example).
      </Text>
      <Pressable style={styles.primaryBtn} onPress={() => open({ initialMessage: 'Hello!' })}>
        <Text style={styles.primaryBtnText}>Open quick ask</Text>
      </Pressable>
    </View>
  );
}

function ModalDemo() {
  const { open } = useAiChatModalSession();
  return (
    <View style={styles.centered}>
      <Text style={styles.hint}>Modal surface — RN Modal only, no gorhom.</Text>
      <Pressable style={styles.primaryBtn} onPress={() => open({ initialMessage: 'Hello!' })}>
        <Text style={styles.primaryBtnText}>Open modal chat</Text>
      </Pressable>
    </View>
  );
}

function FloatingWithSheetBridge() {
  const { open } = useAiQuickAskSession();
  return (
    <>
      <View style={styles.centered}>
        <Text style={styles.hint}>
          Floating FAB uses onExpand → opens bottom-sheet (host composition).
        </Text>
      </View>
      <AiFloatingOverlay onExpand={draft => open({ initialMessage: draft })} />
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('full');
  const [conversationId, setConversationId] = useState<string | null>(null);

  const config = useMemo(() => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      return {
        openai: {
          apiKey: () => apiKey,
          model: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini',
          baseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL,
        },
      };
    }
    return { transport: createMockTransport() };
  }, []);

  const openFull = (id: string | null) => {
    setConversationId(id);
    setTab('full');
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AiAssistantProvider
          config={config}
          strings={{
            assistantTitle: 'expo-ai-assistant',
            welcomeSubtitle: apiKeyHint(config),
          }}
        >
          <AiQuickAskProvider onOpenFullPage={openFull}>
            <AiChatModalProvider onOpenFullPage={openFull} presentation="card">
              <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
                <StatusBar style="dark" />
                <Text style={styles.title}>expo-ai-assistant</Text>
                <View style={styles.tabs}>
                  {(
                    [
                      ['full', 'Full'],
                      ['floating', 'Float'],
                      ['sheet', 'Sheet'],
                      ['modal', 'Modal'],
                      ['history', 'History'],
                    ] as const
                  ).map(([id, label]) => (
                    <Pressable
                      key={id}
                      onPress={() => setTab(id)}
                      style={[styles.tab, tab === id && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.body}>
                  {tab === 'full' ? (
                    <AiChatScreen
                      conversationId={conversationId}
                      onOpenHistory={() => setTab('history')}
                    />
                  ) : null}
                  {tab === 'history' ? (
                    <AiConversationHistoryScreen
                      onBackPress={() => setTab('full')}
                      onOpenConversation={id => {
                        setConversationId(id);
                        setTab('full');
                      }}
                    />
                  ) : null}
                  {tab === 'floating' ? <FloatingWithSheetBridge /> : null}
                  {tab === 'sheet' ? <SheetDemo /> : null}
                  {tab === 'modal' ? <ModalDemo /> : null}
                </View>
              </SafeAreaView>
            </AiChatModalProvider>
          </AiQuickAskProvider>
        </AiAssistantProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function apiKeyHint(config: { openai?: unknown; transport?: unknown }): string {
  if ('openai' in config && config.openai) {
    return 'Live OpenAI-compatible transport.';
  }
  return 'Mock transport (set EXPO_PUBLIC_OPENAI_API_KEY for live chat).';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#fff' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#0166FE' },
  tabText: { fontSize: 13, color: '#111827' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  hint: { textAlign: 'center', color: '#6B7280', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: '#0166FE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
});
