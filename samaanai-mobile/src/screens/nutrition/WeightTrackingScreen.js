import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator, Surface, SegmentedButtons, FAB } from 'react-native-paper';
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryScatter,
  VictoryArea,
  isVictoryAvailable,
} from '../../components/charts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { colors, spacing } from '../../theme';
import { StatCard, StatCardRow, ChartCard } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Web fallback line chart component
const WebLineChart = ({ data }) => {
  if (!data || data.length < 2) return null;

  const weights = data.map(d => d.y);
  const minVal = Math.min(...weights);
  const maxVal = Math.max(...weights);
  const range = maxVal - minVal || 10;
  const chartHeight = 160;
  const chartWidth = Math.max(SCREEN_WIDTH - 80, data.length * 50);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={webChartStyles.container}>
        <View style={[webChartStyles.chart, { width: chartWidth, height: chartHeight }]}>
          {/* Line path using absolute positioning */}
          {data.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = data[index - 1];
            const x1 = (index - 1) / (data.length - 1) * (chartWidth - 40) + 20;
            const y1 = chartHeight - ((prevPoint.y - minVal) / range * (chartHeight - 40) + 20);
            const x2 = index / (data.length - 1) * (chartWidth - 40) + 20;
            const y2 = chartHeight - ((point.y - minVal) / range * (chartHeight - 40) + 20);

            return (
              <View
                key={`line-${index}`}
                style={[
                  webChartStyles.line,
                  {
                    left: x1,
                    top: Math.min(y1, y2),
                    width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                    transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                  },
                ]}
              />
            );
          })}
          {/* Points */}
          {data.map((point, index) => {
            const x = index / (data.length - 1) * (chartWidth - 40) + 20;
            const y = chartHeight - ((point.y - minVal) / range * (chartHeight - 40) + 20);

            return (
              <View
                key={`point-${index}`}
                style={[webChartStyles.point, { left: x - 5, top: y - 5 }]}
              />
            );
          })}
        </View>
        {/* Labels */}
        <View style={[webChartStyles.labels, { width: chartWidth }]}>
          {data.map((point, index) => (
            <Text key={index} style={webChartStyles.label}>{point.label}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const webChartStyles = StyleSheet.create({
  container: { padding: spacing.sm },
  chart: { position: 'relative', backgroundColor: colors.background, borderRadius: 8 },
  line: { position: 'absolute', height: 2, backgroundColor: colors.primary, transformOrigin: 'left center' },
  point: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 8 },
  label: { fontSize: 10, color: colors.textSecondary },
});

export default function WeightTrackingScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weightData, setWeightData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const fetchWeightHistory = async (period = selectedPeriod) => {
    try {
      setError(null);
      const { data } = await api.getWeightHistory(period);
      setWeightData(data.entries);
      setStats(data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load weight history');
      console.error('Weight history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeightHistory();
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeightHistory();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setLoading(true);
  };

  const prepareChartData = () => {
    if (!weightData || weightData.length === 0) return null;

    const sortedEntries = [...weightData].sort((a, b) => new Date(a.date) - new Date(b.date));

    return sortedEntries.map((entry, index) => ({
      x: index,
      y: entry.weight,
      date: entry.date,
      label: format(parseISO(entry.date), selectedPeriod === 'week' ? 'EEE' : 'MMM d'),
    }));
  };

  const getChangeColor = (change) => {
    if (change === null || change === undefined) return colors.textPrimary;
    // Weight loss is positive (green), weight gain is negative (red)
    return change < 0 ? colors.success : change > 0 ? colors.error : colors.textPrimary;
  };

  const getTrendMessage = () => {
    if (!stats || stats.change === null || stats.change === undefined) {
      return { icon: 'information', message: 'Track more to see trends', color: colors.info };
    }

    if (stats.change < -2) {
      return { icon: 'trending-down', message: 'Great progress! Keep it up!', color: colors.success };
    } else if (stats.change < 0) {
      return { icon: 'trending-down', message: 'Steady progress', color: colors.success };
    } else if (stats.change === 0) {
      return { icon: 'minus', message: 'Weight stable', color: colors.primary };
    } else if (stats.change < 2) {
      return { icon: 'trending-up', message: 'Slight increase', color: colors.warning };
    } else {
      return { icon: 'trending-up', message: 'Consider adjustments', color: colors.error };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading weight history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={() => fetchWeightHistory()} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const chartData = prepareChartData();
  const hasData = weightData && weightData.length > 0;
  const trend = getTrendMessage();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Period Selector */}
        <Surface style={styles.periodSelector} elevation={1}>
          <SegmentedButtons
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
            buttons={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
              { value: 'all', label: 'All' },
            ]}
            style={styles.segmentedButtons}
          />
        </Surface>

        {!hasData ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Icon name="scale-bathroom" size={48} color={colors.textHint} />
            <Text style={styles.emptyText}>No weight data for this period</Text>
            <Text style={styles.emptyHint}>Start logging your weight to track progress!</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('DailyEntry')}
              style={styles.emptyButton}
              icon="plus"
            >
              Log Weight
            </Button>
          </Surface>
        ) : (
          <>
            {/* Current Weight Highlight */}
            <Surface style={styles.currentWeightCard} elevation={2}>
              <Text style={styles.currentWeightLabel}>Current Weight</Text>
              <Text style={styles.currentWeightValue}>{stats?.current?.toFixed(1) || '-'}</Text>
              <Text style={styles.currentWeightUnit}>lbs</Text>
              {stats?.change !== null && stats?.change !== undefined && (
                <View style={styles.changeRow}>
                  <Icon
                    name={stats.change < 0 ? 'arrow-down' : stats.change > 0 ? 'arrow-up' : 'minus'}
                    size={16}
                    color={getChangeColor(stats.change)}
                  />
                  <Text style={[styles.changeText, { color: getChangeColor(stats.change) }]}>
                    {Math.abs(stats.change).toFixed(1)} lbs
                  </Text>
                </View>
              )}
            </Surface>

            {/* Stats Row */}
            <View style={styles.section}>
              <StatCardRow>
                <StatCard
                  label="Min"
                  value={stats?.min?.toFixed(1) || '-'}
                  unit="lbs"
                  icon="arrow-down-bold"
                  iconColor={colors.success}
                  variant="compact"
                />
                <StatCard
                  label="Max"
                  value={stats?.max?.toFixed(1) || '-'}
                  unit="lbs"
                  icon="arrow-up-bold"
                  iconColor={colors.error}
                  variant="compact"
                />
                <StatCard
                  label="Average"
                  value={stats?.avg?.toFixed(1) || '-'}
                  unit="lbs"
                  icon="chart-line"
                  iconColor={colors.primary}
                  variant="compact"
                />
              </StatCardRow>
            </View>

            {/* Trend Card */}
            <Surface style={styles.trendCard} elevation={1}>
              <View style={styles.trendRow}>
                <Icon name={trend.icon} size={24} color={trend.color} />
                <Text style={[styles.trendText, { color: trend.color }]}>{trend.message}</Text>
              </View>
            </Surface>

            {/* Weight Chart */}
            {chartData && chartData.length > 1 && (
              <View style={styles.section}>
                <ChartCard title="Weight Trend">
                  {isVictoryAvailable ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <VictoryChart
                        width={Math.max(SCREEN_WIDTH - spacing.lg * 2, chartData.length * 50)}
                        height={220}
                        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t) => `${t}`}
                          style={{
                            axis: { stroke: colors.border },
                            tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                            grid: { stroke: colors.divider, strokeDasharray: '4,4' },
                          }}
                        />
                        <VictoryAxis
                          tickValues={chartData.map((d) => d.x)}
                          tickFormat={(t) => chartData[t]?.label || ''}
                          style={{
                            axis: { stroke: colors.border },
                            tickLabels: {
                              fill: colors.textSecondary,
                              fontSize: 10,
                              angle: chartData.length > 10 ? -45 : 0,
                              textAnchor: chartData.length > 10 ? 'end' : 'middle',
                            },
                          }}
                        />
                        <VictoryArea
                          data={chartData}
                          style={{
                            data: {
                              fill: `${colors.primary}20`,
                              stroke: 'transparent',
                            },
                          }}
                          interpolation="natural"
                        />
                        <VictoryLine
                          data={chartData}
                          style={{
                            data: {
                              stroke: colors.primary,
                              strokeWidth: 2,
                            },
                          }}
                          interpolation="natural"
                        />
                        <VictoryScatter
                          data={chartData}
                          size={5}
                          style={{
                            data: {
                              fill: colors.surface,
                              stroke: colors.primary,
                              strokeWidth: 2,
                            },
                          }}
                        />
                      </VictoryChart>
                    </ScrollView>
                  ) : (
                    <WebLineChart data={chartData} />
                  )}
                </ChartCard>
              </View>
            )}

            {/* Recent Entries */}
            <Surface style={styles.entriesCard} elevation={1}>
              <Text style={styles.entriesTitle}>Recent Entries</Text>
              {weightData
                .slice(-10)
                .reverse()
                .map((entry, index) => {
                  const prevEntry = weightData.slice(-10).reverse()[index + 1];
                  const diff = prevEntry ? entry.weight - prevEntry.weight : null;

                  return (
                    <View key={entry.id || index}>
                      <View style={styles.entryRow}>
                        <View style={styles.entryLeft}>
                          <Text style={styles.entryDate}>{format(parseISO(entry.date), 'MMM dd, yyyy')}</Text>
                        </View>
                        <View style={styles.entryRight}>
                          <Text style={styles.entryWeight}>{entry.weight.toFixed(1)} lbs</Text>
                          {diff !== null && (
                            <View style={styles.entryDiff}>
                              <Icon
                                name={diff < 0 ? 'arrow-down' : diff > 0 ? 'arrow-up' : 'minus'}
                                size={12}
                                color={getChangeColor(diff)}
                              />
                              <Text style={[styles.entryDiffText, { color: getChangeColor(diff) }]}>
                                {Math.abs(diff).toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {index < Math.min(9, weightData.length - 1) && <View style={styles.entryDivider} />}
                    </View>
                  );
                })}
            </Surface>
          </>
        )}

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB for adding weight */}
      <FAB
        icon="plus"
        label="Log Weight"
        style={styles.fab}
        onPress={() => navigation.navigate('DailyEntry')}
        color={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.sm,
  },
  periodSelector: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  segmentedButtons: {
    backgroundColor: colors.background,
  },
  emptyCard: {
    margin: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  currentWeightCard: {
    margin: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    alignItems: 'center',
  },
  currentWeightLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  currentWeightValue: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primary,
  },
  currentWeightUnit: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: -4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  section: {
    padding: spacing.md,
    paddingTop: 0,
  },
  trendCard: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  entriesCard: {
    margin: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  entryLeft: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  entryDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  entryDiffText: {
    fontSize: 12,
    marginLeft: 2,
  },
  entryDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  bottomSpacer: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
  },
});
