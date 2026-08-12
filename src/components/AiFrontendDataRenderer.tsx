import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { fontSize, spacing } from '../theme/tokens';
import {
  formatCellValue,
  formatColumnLabel,
  getTypedFrontendDataType,
  isPlainRecord,
} from '../lib/frontendDataFormat';
import { AiDataTable } from './AiDataTable';
import { AiText } from './AiText';

interface AiFrontendDataRendererProps {
  data: unknown;
  functionName: string;
}

function TypedObjectSummary({ data }: { data: Record<string, unknown> }) {
  const theme = useAiTheme();
  const type = getTypedFrontendDataType(data);

  const lines = useMemo(() => {
    if (type === 'TEST_GENERATED') {
      const count = typeof data.questionCount === 'number' ? data.questionCount : null;
      return [
        'Test ready',
        count != null ? `${count} questions` : null,
      ].filter(Boolean) as string[];
    }

    if (type === 'TEST_RESULT' && isPlainRecord(data.result)) {
      const result = data.result;
      return [
        'Test result',
        typeof result.correctCount === 'number' ? `Correct: ${result.correctCount}` : null,
        typeof result.wrongCount === 'number' ? `Wrong: ${result.wrongCount}` : null,
        typeof result.unansweredCount === 'number'
          ? `Unanswered: ${result.unansweredCount}`
          : null,
      ].filter(Boolean) as string[];
    }

    if (type === 'TEST_PERFORMANCE_ANALYSIS' && isPlainRecord(data.summary)) {
      const summary = data.summary;
      return [
        'Performance analysis',
        typeof summary.totalTests === 'number' ? `${summary.totalTests} tests` : null,
        typeof summary.correctCount === 'number' ? `Correct: ${summary.correctCount}` : null,
        typeof summary.wrongCount === 'number' ? `Wrong: ${summary.wrongCount}` : null,
      ].filter(Boolean) as string[];
    }

    return null;
  }, [data, type]);

  if (lines) {
    return (
      <View style={styles.summaryBox}>
        {lines.map(line => (
          <AiText
            key={line}
            variant="caption"
            style={[styles.summaryLine, { color: theme.colors.text.DEFAULT }]}
          >
            {line}
          </AiText>
        ))}
      </View>
    );
  }

  return <AiKeyValueList data={data} />;
}

function AiKeyValueList({ data }: { data: Record<string, unknown> }) {
  const theme = useAiTheme();
  const entries = Object.entries(data).filter(
    ([, value]) => value !== null && value !== undefined
  );

  if (entries.length === 0) return null;

  return (
    <View style={styles.kvWrap}>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.kvRow}>
          <AiText
            variant="caption"
            weight="medium"
            style={[styles.kvLabel, { color: theme.colors.text[500] }]}
          >
            {formatColumnLabel(key)}
          </AiText>
          <AiText
            variant="caption"
            style={[styles.kvValue, { color: theme.colors.text.DEFAULT }]}
          >
            {formatCellValue(value, key)}
          </AiText>
        </View>
      ))}
    </View>
  );
}

function normalizeArrayRows(items: unknown[]): Record<string, unknown>[] {
  return items.filter(isPlainRecord);
}

export const AiFrontendDataRenderer: React.FC<AiFrontendDataRendererProps> = ({
  data,
  functionName: _functionName,
}) => {
  const theme = useAiTheme();
  const strings = useAiStrings();

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
          {strings.noResults}
        </AiText>
      );
    }

    const rows = normalizeArrayRows(data);
    if (rows.length === 0) {
      return (
        <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
          {strings.noDisplayData}
        </AiText>
      );
    }

    return <AiDataTable rows={rows} functionName={_functionName} />;
  }

  if (isPlainRecord(data)) {
    return <TypedObjectSummary data={data} />;
  }

  if (data === null || data === undefined) return null;

  return (
    <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
      {String(data)}
    </AiText>
  );
};

const styles = StyleSheet.create({
  summaryBox: {
    gap: spacing[1],
  },
  summaryLine: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  kvWrap: {
    gap: spacing[1.5],
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  kvLabel: {
    minWidth: 96,
    fontSize: fontSize.xs,
  },
  kvValue: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});
