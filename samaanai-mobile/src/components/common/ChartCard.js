import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { colors, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ChartCard - Container wrapper for chart components
 *
 * @param {string} title - Card title
 * @param {ReactNode} children - Chart component to render
 * @param {boolean} loading - Show loading spinner
 * @param {string} emptyMessage - Message when no data
 * @param {boolean} isEmpty - Whether data is empty
 * @param {ReactNode} legend - Optional legend component
 * @param {ReactNode} footer - Optional footer content
 * @param {object} style - Additional container styles
 */
const ChartCard = ({
  title,
  children,
  loading = false,
  emptyMessage = 'No data available',
  isEmpty = false,
  legend,
  footer,
  style,
}) => {
  return (
    <Surface style={[styles.container, style]} elevation={1}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          children
        )}
      </View>

      {legend && !loading && !isEmpty && (
        <View style={styles.legendContainer}>{legend}</View>
      )}

      {footer && !loading && !isEmpty && (
        <View style={styles.footer}>{footer}</View>
      )}
    </Surface>
  );
};

/**
 * ChartLegend - Legend component for charts
 */
export const ChartLegend = ({ items }) => (
  <View style={styles.legend}>
    {items.map((item, index) => (
      <View key={index} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
        <Text style={styles.legendLabel}>{item.label}</Text>
      </View>
    ))}
  </View>
);

/**
 * ChartInsight - Insight text for charts
 */
export const ChartInsight = ({ icon, text, type = 'info' }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.info;
    }
  };

  return (
    <View style={styles.insight}>
      {icon && (
        <Text style={[styles.insightIcon, { color: getTypeColor() }]}>{icon}</Text>
      )}
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    minHeight: 180,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  legendContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  insightText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default ChartCard;
