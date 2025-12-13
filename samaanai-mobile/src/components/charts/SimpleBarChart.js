import React from 'react';
import { View, StyleSheet, Text, Platform, Dimensions, ScrollView } from 'react-native';
import { colors, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SimpleBarChart - Cross-platform bar chart component
 * Uses Victory Native on mobile, CSS-based bars on web
 */
const SimpleBarChart = ({
  data = [],
  type = 'grouped', // 'grouped' or 'simple'
  xKey = 'day',
  yKeys = [{ key: 'food', color: colors.caloriesConsumed, label: 'Food' }],
  height = 200,
  width = SCREEN_WIDTH - spacing.lg * 2,
  showLabels = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>No data available</Text>
      </View>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.flatMap((d) => yKeys.map((yk) => d[yk.key] || 0)),
    1 // Prevent division by zero
  );

  const barWidth = type === 'grouped' ? 12 : 20;
  const groupWidth = type === 'grouped' ? yKeys.length * (barWidth + 4) + 16 : barWidth + 16;

  // Check if we should use Victory (native only)
  const useVictory = Platform.OS !== 'web';

  if (useVictory) {
    try {
      const { VictoryBar, VictoryChart, VictoryAxis, VictoryGroup } = require('victory-native');

      const chartData = yKeys.map((yk) =>
        data.map((d) => ({ x: d[xKey], y: d[yk.key] || 0 }))
      );

      return (
        <View style={styles.container}>
          <VictoryChart
            width={width}
            height={height}
            domainPadding={{ x: 25 }}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => (t >= 1000 ? `${Math.round(t / 1000)}k` : t)}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.divider, strokeDasharray: '4,4' },
              }}
            />
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
              }}
            />
            {type === 'grouped' ? (
              <VictoryGroup offset={14} colorScale={yKeys.map((yk) => yk.color)}>
                {chartData.map((d, i) => (
                  <VictoryBar
                    key={i}
                    data={d}
                    barWidth={barWidth}
                    cornerRadius={{ top: 4 }}
                  />
                ))}
              </VictoryGroup>
            ) : (
              <VictoryBar
                data={chartData[0]}
                barWidth={barWidth}
                cornerRadius={{ top: 4 }}
                style={{ data: { fill: yKeys[0].color } }}
              />
            )}
          </VictoryChart>
        </View>
      );
    } catch (e) {
      console.warn('Victory Native not available, using fallback');
    }
  }

  // Web/Fallback implementation
  const chartHeight = height - 50; // Leave space for labels

  return (
    <View style={styles.webContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.webChart, { height: chartHeight, minWidth: data.length * groupWidth }]}>
          {data.map((item, index) => (
            <View key={index} style={[styles.webBarGroup, { width: groupWidth }]}>
              <View style={styles.webBarsContainer}>
                {yKeys.map((yk, ykIndex) => {
                  const value = item[yk.key] || 0;
                  const barHeight = (value / maxValue) * (chartHeight - 30);
                  return (
                    <View
                      key={ykIndex}
                      style={[
                        styles.webBar,
                        {
                          height: Math.max(barHeight, 4),
                          width: barWidth,
                          backgroundColor: yk.color,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              {showLabels && <Text style={styles.webLabel}>{item[xKey]}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  webContainer: {
    paddingVertical: spacing.sm,
  },
  webChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 25,
    paddingHorizontal: spacing.sm,
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
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  webLabel: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default SimpleBarChart;
