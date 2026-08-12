import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAiTheme } from '../theme/AiThemeContext';
import { useAiStrings } from '../i18n/AiStringsContext';
import { fontSize, radius, spacing } from '../theme/tokens';
import type { AiFunctionCall } from '../types/aiChat';
import { AiFrontendDataRenderer } from './AiFrontendDataRenderer';
import { AiText } from './AiText';

interface AiFunctionCallCardProps {
  functionCall: AiFunctionCall;
}

type StatusVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  spinning?: boolean;
};

export const AiFunctionCallCard: React.FC<AiFunctionCallCardProps> = ({ functionCall }) => {
  const theme = useAiTheme();
  const strings = useAiStrings();
  const { isDark } = theme.meta;
  const [expanded, setExpanded] = useState(true);

  const { name, label, status, reasoning, frontendData } = functionCall;
  const displayName = label?.trim() || name;

  const statusVisual = useMemo((): StatusVisual => {
    if (status === 'executing') {
      return {
        icon: 'sync-outline',
        label: strings.toolRunning,
        color: theme.colors.primary.DEFAULT,
        spinning: true,
      };
    }
    if (status === 'error') {
      return {
        icon: 'alert-circle-outline',
        label: strings.toolError,
        color: theme.colors.error.DEFAULT,
      };
    }
    return {
      icon: 'checkmark-circle-outline',
      label: strings.toolDone,
      color: theme.colors.success.DEFAULT,
    };
  }, [
    status,
    strings.toolDone,
    strings.toolError,
    strings.toolRunning,
    theme.colors.error.DEFAULT,
    theme.colors.primary.DEFAULT,
    theme.colors.success.DEFAULT,
  ]);

  const hasData =
    status === 'completed' && frontendData !== undefined && frontendData !== null;

  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <Pressable
        onPress={() => hasData && setExpanded(prev => !prev)}
        disabled={!hasData}
        style={styles.header}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.colors.primary.subtle ?? 'rgba(1,102,254,0.1)' },
          ]}
        >
          <Ionicons name="construct-outline" size={16} color={theme.colors.primary.DEFAULT} />
        </View>

        <View style={styles.headerText}>
          <AiText
            variant="body"
            weight="medium"
            style={[styles.title, { color: theme.colors.text.DEFAULT }]}
            numberOfLines={1}
          >
            {displayName}
          </AiText>
          <View style={styles.statusRow}>
            {statusVisual.spinning ? (
              <ActivityIndicator size="small" color={statusVisual.color} />
            ) : (
              <Ionicons name={statusVisual.icon} size={14} color={statusVisual.color} />
            )}
            <AiText
              variant="caption"
              style={[styles.statusLabel, { color: statusVisual.color }]}
            >
              {statusVisual.label}
            </AiText>
          </View>
          {!!reasoning && status === 'executing' && (
            <AiText
              variant="caption"
              style={[styles.reasoning, { color: theme.colors.text[500] }]}
              numberOfLines={2}
            >
              {reasoning}
            </AiText>
          )}
        </View>

        {hasData && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.text[500]}
          />
        )}
      </Pressable>

      {hasData && expanded && (
        <View style={[styles.body, { borderTopColor: borderColor }]}>
          <AiFrontendDataRenderer data={frontendData} functionName={name} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: fontSize.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusLabel: {
    fontSize: fontSize.xs,
  },
  reasoning: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
});
