import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AiAssistantProvider, createMockTransport, useAiTheme } from 'expo-ai-assistant';
import { AiChatScreen, AiConversationHistoryScreen } from 'expo-ai-assistant/full-page';
import { AiFloatingOverlay } from 'expo-ai-assistant/floating';
import { AiQuickAskProvider, useAiQuickAskSession } from 'expo-ai-assistant/bottom-sheet';
import { AiChatModalProvider, useAiChatModalSession } from 'expo-ai-assistant/modal';

type Tab = 'full' | 'floating' | 'sheet' | 'modal' | 'history';
type ColorScheme = 'light' | 'dark';

function SheetDemo() {
  const theme = useAiTheme();
  const { open } = useAiQuickAskSession();
  return (
    <View style={styles.centered}>
      <Text style={[styles.hint, { color: theme.colors.text[500] }]}>
        Bottom-sheet surface — requires @gorhom/bottom-sheet (installed in this example).
      </Text>
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary.DEFAULT }]}
        onPress={() => open({ initialMessage: 'Show students as a table' })}
      >
        <Text style={styles.primaryBtnText}>Open quick ask (table demo)</Text>
      </Pressable>
    </View>
  );
}

function ModalDemo() {
  const theme = useAiTheme();
  const { open } = useAiChatModalSession();
  return (
    <View style={styles.centered}>
      <Text style={[styles.hint, { color: theme.colors.text[500] }]}>
        Modal surface — RN Modal only, no gorhom.
      </Text>
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary.DEFAULT }]}
        onPress={() => open({ initialMessage: 'Give me a short summary for today.' })}
      >
        <Text style={styles.primaryBtnText}>Open modal chat</Text>
      </Pressable>
    </View>
  );
}

function FloatingWithSheetBridge() {
  const theme = useAiTheme();
  const { open } = useAiQuickAskSession();
  return (
    <>
      <View style={styles.centered}>
        <Text style={[styles.hint, { color: theme.colors.text[500] }]}>
          Floating FAB uses onExpand → opens bottom-sheet (host composition).
        </Text>
      </View>
      <AiFloatingOverlay onExpand={draft => open({ initialMessage: draft })} />
    </>
  );
}

function DemoChrome({
  tab,
  setTab,
  colorScheme,
  onToggleScheme,
  conversationId,
  setConversationId,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  colorScheme: ColorScheme;
  onToggleScheme: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
}) {
  const theme = useAiTheme();
  const isDark = colorScheme === 'dark';
  const mutedBg = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.bg.DEFAULT }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text.DEFAULT }]}>
          expo-ai-assistant
        </Text>
        <Pressable
          onPress={onToggleScheme}
          style={[
            styles.themeBtn,
            {
              backgroundColor: mutedBg,
              borderColor: theme.colors.border.DEFAULT,
            },
          ]}
          accessibilityLabel="Toggle color scheme"
        >
          <Text style={{ color: theme.colors.text.DEFAULT, fontWeight: '600', fontSize: 13 }}>
            {isDark ? 'Light' : 'Dark'}
          </Text>
        </Pressable>
      </View>
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
            style={[
              styles.tab,
              {
                backgroundColor: tab === id ? theme.colors.primary.DEFAULT : mutedBg,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: tab === id ? '#fff' : theme.colors.text.DEFAULT,
                  fontWeight: tab === id ? '600' : '400',
                },
              ]}
            >
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
  );
}

export default function App() {
  const systemScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemScheme === 'dark' ? 'dark' : 'light'
  );
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
          colorScheme={colorScheme}
          strings={{
            assistantTitle: 'expo-ai-assistant',
            welcomeSubtitle: apiKeyHint(config),
          }}
        >
          <AiQuickAskProvider onOpenFullPage={openFull}>
            <AiChatModalProvider onOpenFullPage={openFull} presentation="card">
              <DemoChrome
                tab={tab}
                setTab={setTab}
                colorScheme={colorScheme}
                onToggleScheme={() =>
                  setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
                }
                conversationId={conversationId}
                setConversationId={setConversationId}
              />
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
  return 'Mock transport — try “Show students as a table”.';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  tabText: { fontSize: 13 },
  body: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  hint: { textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
});
