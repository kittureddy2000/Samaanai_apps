import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../../theme';

/**
 * WeeklyBarChart - Web fallback version using simple CSS bars
 */
const WeeklyBarChart = ({
  data = [],
  width,
  height = 220,
  showGoalLine = false,
  goal = 2000,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.consumed || 0, d.net || 0)), goal);

  return (
    <View style={styles.webContainer}>
      <View style={styles.webChart}>
        {data.map((item, index) => {
          const consumedHeight = maxValue > 0 ? ((item.consumed || 0) / maxValue) * 150 : 0;
          const netHeight = maxValue > 0 ? ((item.net || 0) / maxValue) * 150 : 0;
          const isOverGoal = (item.net || 0) > (item.goal || goal);

          return (
            <View key={index} style={styles.webBarGroup}>
              <View style={styles.webBarsContainer}>
                <View
                  style={[
                    styles.webBar,
                    { height: consumedHeight, backgroundColor: colors.caloriesConsumed },
                  ]}
                />
                <View
                  style={[
                    styles.webBar,
                    {
                      height: netHeight,
                      backgroundColor: isOverGoal ? colors.surplus : colors.deficit,
                    },
                  ]}
                />
              </View>
              <Text style={styles.webLabel}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  webContainer: {
    padding: spacing.md,
  },
  webChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    paddingBottom: 30,
  },
  webBarGroup: {
    alignItems: 'center',
  },
  webBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  webBar: {
    width: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  webLabel: {
    marginTop: 8,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default WeeklyBarChart;
