import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { colors, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * WeeklyBarChart - CSS-based bar chart for weekly calorie data
 * Uses simple View components for cross-platform compatibility
 */
const WeeklyBarChart = ({
  data = [],
  width = SCREEN_WIDTH - spacing.lg * 2,
  height = 220,
  showGoalLine = false,
  goal = 2000,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.consumed || 0, d.net || 0]),
    goal || 2000
  );
  const chartHeight = height - 60;

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height: chartHeight }]}>
        {data.map((item, index) => {
          const consumedHeight = ((item.consumed || 0) / maxValue) * chartHeight;
          const netHeight = ((item.net || 0) / maxValue) * chartHeight;
          const isOverGoal = (item.net || 0) > (item.goal || goal || 2000);

          return (
            <View key={index} style={styles.barGroup}>
              <View style={styles.barsContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(consumedHeight, 4),
                      backgroundColor: colors.caloriesConsumed
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(netHeight, 4),
                      backgroundColor: isOverGoal ? colors.surplus : colors.deficit,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    width: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default WeeklyBarChart;
