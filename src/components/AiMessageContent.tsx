import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { fontSize, radius, spacing } from '../theme/tokens';
import type {
  AlertBlock,
  CodeBlock,
  ContentBlock,
  HeadingBlock,
  ListBlock,
  MetricBlock,
  TableBlock,
  TextBlock,
  BlockquoteBlock,
} from '../types/contentBlock';
import { AiText } from './AiText';
import { AiMarkdownText } from './AiMarkdownText';

interface AiMessageContentProps {
  blocks: ContentBlock[];
  /** Trailing plain text still streaming outside blocks. */
  trailingText?: string;
}

function stripSimpleMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

function TextBlockView({ block }: { block: TextBlock }) {
  return <AiMarkdownText>{block.content}</AiMarkdownText>;
}

function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const theme = useAiTheme();
  const size =
    block.level <= 2 ? fontSize.base : block.level <= 4 ? fontSize.sm : fontSize.xs;
  return (
    <AiText
      variant="body"
      weight={block.level <= 3 ? 'semibold' : 'medium'}
      style={[
        styles.heading,
        {
          color: theme.colors.text.DEFAULT,
          fontSize: size,
        },
      ]}
    >
      {block.content}
    </AiText>
  );
}

function DividerBlockView() {
  const theme = useAiTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.colors.border.DEFAULT }]} />
  );
}

function BlockquoteBlockView({ block }: { block: BlockquoteBlock }) {
  const theme = useAiTheme();
  return (
    <View
      style={[
        styles.blockquote,
        {
          borderLeftColor: theme.colors.primary.DEFAULT,
          backgroundColor: theme.colors.primary.subtle,
        },
      ]}
    >
      <AiText
        variant="caption"
        style={[styles.blockquoteText, { color: theme.colors.text[500] }]}
      >
        {stripSimpleMarkdown(block.content)}
      </AiText>
    </View>
  );
}

function ListBlockView({ block }: { block: ListBlock }) {
  const theme = useAiTheme();
  return (
    <View style={styles.list}>
      {block.items.map((item, index) => (
        <View key={`${index}-${item.slice(0, 12)}`} style={styles.listItem}>
          <AiText
            variant="caption"
            weight="medium"
            style={[styles.listBullet, { color: theme.colors.text.DEFAULT }]}
          >
            {block.ordered ? `${index + 1}.` : '•'}
          </AiText>
          <AiText
            variant="body"
            style={[styles.listText, { color: theme.colors.text.DEFAULT }]}
          >
            {stripSimpleMarkdown(item)}
          </AiText>
        </View>
      ))}
    </View>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  const theme = useAiTheme();
  const { isDark } = theme.meta;
  return (
    <View
      style={[
        styles.codeBox,
        {
          backgroundColor: isDark ? '#111827' : '#F3F4F6',
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      {!!block.language && (
        <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
          {block.language}
        </AiText>
      )}
      <AiText
        variant="caption"
        style={[styles.codeText, { color: theme.colors.text.DEFAULT }]}
      >
        {block.content}
      </AiText>
    </View>
  );
}

function TableBlockView({ block }: { block: TableBlock }) {
  const theme = useAiTheme();
  const { isDark } = theme.meta;
  const borderColor = theme.colors.border.DEFAULT;
  const headerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const colCount = Math.max(block.headers.length, ...block.rows.map(r => r.length), 1);
  const headers =
    block.headers.length > 0
      ? block.headers
      : Array.from({ length: colCount }, (_, i) => `Kolon ${i + 1}`);

  return (
    <View style={styles.tableWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={styles.horizontalScroll}
      >
        <View style={[styles.table, { borderColor }]}>
          <View style={[styles.tableRow, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
            {headers.map((header, i) => (
              <View key={`h-${i}`} style={styles.tableCell}>
                <AiText
                  variant="caption"
                  weight="medium"
                  style={[styles.tableHeaderText, { color: theme.colors.text[500] }]}
                  numberOfLines={2}
                >
                  {header}
                </AiText>
              </View>
            ))}
          </View>
          {block.rows.map((row, ri) => (
            <View
              key={`r-${ri}`}
              style={[
                styles.tableRow,
                { borderBottomColor: borderColor },
                ri === block.rows.length - 1 && styles.tableLastRow,
                ri % 2 === 1 && { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' },
              ]}
            >
              {headers.map((_, ci) => (
                <View key={`c-${ri}-${ci}`} style={styles.tableCell}>
                  <AiText
                    variant="caption"
                    style={[styles.tableCellText, { color: theme.colors.text.DEFAULT }]}
                    numberOfLines={3}
                  >
                    {row[ci] ?? ''}
                  </AiText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function AlertBlockView({ block }: { block: AlertBlock }) {
  const theme = useAiTheme();
  const palette = {
    info: { color: theme.colors.info.DEFAULT, bg: theme.colors.info.subtle, icon: 'information-circle-outline' as const },
    warning: { color: theme.colors.warning.DEFAULT, bg: theme.colors.warning.subtle, icon: 'warning-outline' as const },
    success: { color: theme.colors.success.DEFAULT, bg: theme.colors.success.subtle, icon: 'checkmark-circle-outline' as const },
    error: { color: theme.colors.error.DEFAULT, bg: theme.colors.error.subtle, icon: 'alert-circle-outline' as const },
  }[block.variant];

  return (
    <View style={[styles.alert, { backgroundColor: palette.bg, borderLeftColor: palette.color }]}>
      <Ionicons name={palette.icon} size={16} color={palette.color} />
      <AiText
        variant="caption"
        style={[styles.alertText, { color: theme.colors.text.DEFAULT }]}
      >
        {stripSimpleMarkdown(block.content)}
      </AiText>
    </View>
  );
}

function MetricBlockView({ block }: { block: MetricBlock }) {
  const theme = useAiTheme();
  const { isDark } = theme.meta;
  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderColor: theme.colors.border.DEFAULT,
        },
      ]}
    >
      <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
        {block.label}
      </AiText>
      <AiText
        variant="body"
        weight="semibold"
        style={[styles.metricValue, { color: theme.colors.text.DEFAULT }]}
      >
        {block.value}
      </AiText>
      {!!block.description && (
        <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
          {block.description}
        </AiText>
      )}
    </View>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <TextBlockView block={block} />;
    case 'heading':
      return <HeadingBlockView block={block} />;
    case 'divider':
      return <DividerBlockView />;
    case 'blockquote':
      return <BlockquoteBlockView block={block} />;
    case 'list':
      return <ListBlockView block={block} />;
    case 'code':
      return <CodeBlockView block={block} />;
    case 'table':
      return <TableBlockView block={block} />;
    case 'alert':
      return <AlertBlockView block={block} />;
    case 'metric':
      return <MetricBlockView block={block} />;
    default:
      return null;
  }
}

/** Ardışık metric block'larını 2 kolon grid'de gruplar. */
function groupBlocks(blocks: ContentBlock[]): Array<ContentBlock | MetricBlock[]> {
  const grouped: Array<ContentBlock | MetricBlock[]> = [];
  let metricBuffer: MetricBlock[] = [];

  const flushMetrics = () => {
    if (metricBuffer.length > 0) {
      grouped.push(metricBuffer);
      metricBuffer = [];
    }
  };

  for (const block of blocks) {
    if (block.type === 'metric') {
      metricBuffer.push(block);
    } else {
      flushMetrics();
      grouped.push(block);
    }
  }
  flushMetrics();
  return grouped;
}

export const AiMessageContent: React.FC<AiMessageContentProps> = ({ blocks, trailingText }) => {
  const theme = useAiTheme();
  const grouped = useMemo(() => groupBlocks(blocks), [blocks]);

  return (
    <View style={styles.wrap}>
      {grouped.map((item, index) => {
        if (Array.isArray(item)) {
          return (
            <View key={`metrics-${index}`} style={styles.metricGrid}>
              {item.map((metric, mi) => (
                <View key={`m-${index}-${mi}`} style={styles.metricGridItem}>
                  <MetricBlockView block={metric} />
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={`b-${index}-${item.type}`}>
            <BlockView block={item} />
          </View>
        );
      })}

      {!!trailingText?.trim() && (
        <AiText
          variant="body"
          style={[styles.bodyText, { color: theme.colors.text.DEFAULT }]}
        >
          {stripSimpleMarkdown(trailingText)}
        </AiText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    flexGrow: 0,
  },
  bodyText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  heading: {
    marginTop: spacing[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing[1],
  },
  blockquote: {
    borderLeftWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  blockquoteText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  list: {
    gap: spacing[1],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  listBullet: {
    width: 18,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  codeBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  codeText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  tableWrap: {
    marginVertical: spacing[0.5],
    flexGrow: 0,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableLastRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    width: 120,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
  },
  tableCellText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    borderLeftWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  alertText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  metric: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing[2.5],
    gap: 2,
  },
  metricValue: {
    fontSize: fontSize.sm,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  metricGridItem: {
    width: '48%',
    flexGrow: 1,
  },
});
