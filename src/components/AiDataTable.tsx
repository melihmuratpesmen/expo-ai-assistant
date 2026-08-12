import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { fontSize, radius, spacing } from '../theme/tokens';
import {
  AI_DATA_TABLE_MAX_COLUMNS,
  AI_DATA_TABLE_PAGE_SIZE,
  formatCellValue,
  formatColumnLabel,
  isHiddenAiTableColumn,
  toDisplayString,
} from '../lib/frontendDataFormat';
import { AiText } from './AiText';

interface AiDataTableProps {
  rows: Record<string, unknown>[];
  functionName?: string;
}

interface TableColumn {
  key: string;
  label: string;
}

function resolveColumns(rows: Record<string, unknown>[]): TableColumn[] {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first)
    .filter(key => !isHiddenAiTableColumn(key))
    .slice(0, AI_DATA_TABLE_MAX_COLUMNS)
    .map(key => ({ key, label: formatColumnLabel(key) }));
}

export const AiDataTable: React.FC<AiDataTableProps> = ({ rows, functionName: _functionName }) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const { isDark } = theme.meta;
  const [page, setPage] = useState(1);

  const columns = useMemo(() => resolveColumns(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / AI_DATA_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * AI_DATA_TABLE_PAGE_SIZE;
  const displayRows = rows.slice(start, start + AI_DATA_TABLE_PAGE_SIZE);

  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const headerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const muted = theme.colors.text[500];

  if (rows.length === 0 || columns.length === 0) {
    return (
      <AiText variant="caption" style={{ color: muted }}>
        {strings.noResults}
      </AiText>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.metaRow}>
        <Ionicons name="grid-outline" size={12} color={muted} />
        <AiText variant="caption" style={{ color: muted, marginLeft: 4 }}>
          {rows.length} records
        </AiText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={styles.horizontalScroll}
      >
        <View style={[styles.table, { borderColor }]}>
          <View style={[styles.headerRow, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
            {columns.map(col => (
              <View key={col.key} style={styles.cell}>
                <AiText
                  variant="caption"
                  weight="medium"
                  style={[styles.headerText, { color: muted }]}
                  numberOfLines={1}
                >
                  {col.label}
                </AiText>
              </View>
            ))}
          </View>

          {displayRows.map((row, rowIndex) => {
            const rowKey = toDisplayString(row.id ?? row.no ?? row._id, `row-${start + rowIndex}`);
            return (
              <View
                key={rowKey}
                style={[
                  styles.bodyRow,
                  { borderBottomColor: borderColor },
                  rowIndex === displayRows.length - 1 && styles.lastRow,
                ]}
              >
                {columns.map(col => (
                  <View key={col.key} style={styles.cell}>
                    <AiText
                      variant="caption"
                      style={[styles.cellText, { color: theme.colors.text.DEFAULT }]}
                      numberOfLines={2}
                    >
                      {formatCellValue(row[col.key], col.key)}
                    </AiText>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Pressable
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            hitSlop={8}
            style={[styles.pageBtn, safePage <= 1 && styles.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={safePage <= 1 ? muted : theme.colors.primary.DEFAULT}
            />
          </Pressable>
          <AiText variant="caption" style={{ color: muted }}>
            {safePage} / {totalPages}
          </AiText>
          <Pressable
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            hitSlop={8}
            style={[styles.pageBtn, safePage >= totalPages && styles.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={safePage >= totalPages ? muted : theme.colors.primary.DEFAULT}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    flexGrow: 0,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    width: 120,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  headerText: {
    fontSize: fontSize.xs,
  },
  cellText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  pageBtn: {
    padding: spacing[1],
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
});
