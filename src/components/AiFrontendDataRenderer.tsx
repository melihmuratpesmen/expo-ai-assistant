import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { fontSize, spacing } from '../theme/tokens';
import { formatCellValue, formatColumnLabel, isPlainRecord } from '../lib/frontendDataFormat';
import { AiDataTable } from './AiDataTable';
import { AiText } from './AiText';

export interface AiFrontendDataRendererProps {
  data: unknown;
  functionName: string;
}

function AiKeyValueList({ data }: { data: Record<string, unknown> }) {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined);

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
          <AiText variant="caption" style={[styles.kvValue, { color: theme.colors.text.DEFAULT }]}>
            {formatCellValue(value, key, strings)}
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
    return <AiKeyValueList data={data} />;
  }

  if (data === null || data === undefined) return null;

  return (
    <AiText variant="caption" style={{ color: theme.colors.text[500] }}>
      {String(data)}
    </AiText>
  );
};

const styles = StyleSheet.create({
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
