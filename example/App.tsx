import React, { useMemo, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type GestureResponderEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  AiAssistantProvider,
  createMemoryStorage,
  createMockTransport,
  createOpenAICompatibleTransport,
  useAiTheme,
  withLocalHistory,
  type AiAssistantCallbacks,
  type AiAssistantConfig,
  type AiSuggestion,
} from 'expo-ai-assistant';
import { AiChatScreen, AiConversationHistoryScreen } from 'expo-ai-assistant/full-page';
import { AiFloatingOverlay } from 'expo-ai-assistant/floating';
import { AiQuickAskProvider, useAiQuickAsk } from 'expo-ai-assistant/bottom-sheet';
import { AiChatModalProvider, useAiChatModal } from 'expo-ai-assistant/modal';
import { useCircularThemeReveal } from './ThemeCircularReveal';
import { version as DEMO_VERSION } from '../package.json';

type Tab = 'full' | 'floating' | 'sheet' | 'modal' | 'history';

/** Full page and modal share this conversation: "expand" in the modal continues it. */
const DEMO_CHAT_ID = 'demo';

/** Providing onFeedback shows 👍 / 👎 under replies. */
const DEMO_CALLBACKS: AiAssistantCallbacks = {
  onFeedback: (message, feedback) => console.log('[demo] feedback', message.id, feedback),
};

/** Prompts that trigger the mock transport's tool / table demos. */
const DEMO_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'capabilities',
    label: 'What can you do?',
    prompt: 'What can you help me with?',
    icon: 'sparkles',
  },
  {
    id: 'table',
    label: 'Show a table',
    prompt: 'Show students as a table',
    icon: 'grid-outline',
  },
  {
    id: 'summary',
    label: 'Quick summary',
    prompt: 'Give me a short summary for today.',
    icon: 'list-outline',
  },
];
type ColorScheme = 'light' | 'dark';

function SheetDemo() {
  const theme = useAiTheme();
  const { open } = useAiQuickAsk();
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
  const { open } = useAiChatModal();
  return (
    <View style={styles.centered}>
      <Text style={[styles.hint, { color: theme.colors.text[500] }]}>
        Modal surface — RN Modal only, no gorhom.
      </Text>
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary.DEFAULT }]}
        onPress={() => open({ initialMessage: 'Give me a short summary for today.', reset: true })}
      >
        <Text style={styles.primaryBtnText}>Open modal chat</Text>
      </Pressable>
    </View>
  );
}

function FloatingWithSheetBridge() {
  const theme = useAiTheme();
  const { open } = useAiQuickAsk();
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
  showStatusBar = true,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  colorScheme: ColorScheme;
  onToggleScheme: (event: GestureResponderEvent) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  showStatusBar?: boolean;
}) {
  const theme = useAiTheme();
  const isDark = colorScheme === 'dark';
  const mutedBg = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.bg.DEFAULT }]}
      edges={['top', 'left', 'right']}
    >
      {showStatusBar ? <StatusBar style={isDark ? 'light' : 'dark'} /> : null}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.colors.text.DEFAULT }]}>
            expo-ai-assistant
          </Text>
          <Text style={[styles.version, { color: theme.colors.text[500] }]}>v{DEMO_VERSION}</Text>
        </View>
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
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={16}
            color={isDark ? '#818CF8' : '#F59E0B'}
          />
          <Text style={{ color: theme.colors.text.DEFAULT, fontWeight: '600', fontSize: 13 }}>
            {isDark ? 'Dark' : 'Light'}
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
            chatId={DEMO_CHAT_ID}
            conversationId={conversationId}
            suggestions={DEMO_SUGGESTIONS}
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

function DemoTree({
  colorScheme,
  tab,
  setTab,
  conversationId,
  setConversationId,
  onToggleScheme,
  config,
  isLive,
  onOpenFull,
  showStatusBar = true,
}: {
  colorScheme: ColorScheme;
  tab: Tab;
  setTab: (t: Tab) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  onToggleScheme: (event: GestureResponderEvent) => void;
  config: AiAssistantConfig;
  isLive: boolean;
  onOpenFull: (id: string | null) => void;
  showStatusBar?: boolean;
}) {
  return (
    <View style={[styles.root, { backgroundColor: colorScheme === 'dark' ? '#0B1220' : '#FFFFFF' }]}>
      <AiAssistantProvider
        config={config}
        colorScheme={colorScheme}
        callbacks={DEMO_CALLBACKS}
        strings={{
          assistantTitle: 'expo-ai-assistant',
          welcomeSubtitle: isLive
            ? 'Live OpenAI-compatible transport.'
            : 'Mock transport — try “Show students as a table”.',
        }}
      >
        <AiQuickAskProvider onOpenFullPage={onOpenFull} suggestions={DEMO_SUGGESTIONS}>
          <AiChatModalProvider
            chatId={DEMO_CHAT_ID}
            onOpenFullPage={onOpenFull}
            presentation="card"
            suggestions={DEMO_SUGGESTIONS}
          >
            <DemoChrome
              tab={tab}
              setTab={setTab}
              colorScheme={colorScheme}
              onToggleScheme={onToggleScheme}
              conversationId={conversationId}
              setConversationId={setConversationId}
              showStatusBar={showStatusBar}
            />
          </AiChatModalProvider>
        </AiQuickAskProvider>
      </AiAssistantProvider>
    </View>
  );
}

export default function App() {
  const systemScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemScheme === 'dark' ? 'dark' : 'light'
  );
  const [tab, setTab] = useState<Tab>('full');
  const [conversationId, setConversationId] = useState<string | null>(null);

  const swapScheme = useCallback(() => {
    setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const { config, isLive } = useMemo((): { config: AiAssistantConfig; isLive: boolean } => {
    // Local history makes the History tab work for any transport (in memory here;
    // pass AsyncStorage in a real app).
    const storage = createMemoryStorage();
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      const transport = createOpenAICompatibleTransport({
        apiKey: () => apiKey,
        model: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini',
        baseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL,
      });
      return { config: { transport: withLocalHistory(transport, { storage }) }, isLive: true };
    }
    return {
      config: { transport: withLocalHistory(createMockTransport(), { storage }) },
      isLive: false,
    };
  }, []);

  const openFull = (id: string | null) => {
    setConversationId(id);
    setTab('full');
  };

  const incomingScheme: ColorScheme = colorScheme === 'dark' ? 'light' : 'dark';

  const treeProps = {
    tab,
    setTab,
    conversationId,
    setConversationId,
    config,
    isLive,
    onOpenFull: openFull,
  };

  const { overlayNode, onTogglePress } = useCircularThemeReveal(swapScheme, () => (
    <DemoTree
      {...treeProps}
      colorScheme={incomingScheme}
      onToggleScheme={() => undefined}
      showStatusBar={false}
    />
  ));

  const handleToggleScheme = useCallback(
    (event: GestureResponderEvent) => {
      try {
        onTogglePress(event);
      } catch {
        swapScheme();
      }
    },
    [onTogglePress, swapScheme]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <DemoTree
            {...treeProps}
            colorScheme={colorScheme}
            onToggleScheme={handleToggleScheme}
          />
          {overlayNode}
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
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
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
