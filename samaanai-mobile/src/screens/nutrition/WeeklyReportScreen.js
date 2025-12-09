import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, Surface } from 'react-native-paper';
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryGroup,
  isVictoryAvailable,
} from '../../components/charts';
import { api } from '../../services/api';
import { format, subDays, addDays, getDay } from 'date-fns';
import { colors, spacing } from '../../theme';
import { StatCard, StatCardRow, ChartCard, ChartLegend } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Web fallback chart component
const WebBarChart = ({ data }) => {
  const maxValue = Math.max(...data.flatMap((d) => [d.food || 0, d.exercise || 0]), 1);
  const chartHeight = 180;

  return (
    <View style={webChartStyles.container}>
      <View style={webChartStyles.chart}>
        {data.map((item, index) => (
          <View key={index} style={webChartStyles.barGroup}>
            <View style={webChartStyles.barsContainer}>
              <View
                style={[
                  webChartStyles.bar,
                  {
                    height: Math.max(((item.food || 0) / maxValue) * chartHeight, 4),
                    backgroundColor: colors.caloriesConsumed,
                  },
                ]}
              />
              <View
                style={[
                  webChartStyles.bar,
                  {
                    height: Math.max(((item.exercise || 0) / maxValue) * chartHeight, 4),
                    backgroundColor: colors.caloriesBurned,
                  },
                ]}
              />
            </View>
            <Text style={webChartStyles.label}>{item.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const webChartStyles = StyleSheet.create({
  container: { padding: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 200, paddingBottom: 25 },
  barGroup: { alignItems: 'center' },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  label: { marginTop: 8, fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
});

const getStartOfCurrentWeek = (startOfWeek = 2) => {
  const today = new Date();
  const jsDayOfWeek = getDay(today);
  const pythonWeekday = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
  const daysToSubtract = (pythonWeekday - startOfWeek + 7) % 7;
  return subDays(today, daysToSubtract);
};

const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function WeeklyReportScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getStartOfCurrentWeek());
  const [weeklyData, setWeeklyData] = useState(null);
  const [error, setError] = useState(null);

  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 6);

      const startDateStr = format(selectedDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data } = await api.getWeeklyReport(startDateStr, endDateStr);
      setWeeklyData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load weekly data');
      console.error('Weekly report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [selectedDate]);

  const handlePreviousWeek = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 7));
  };

  const handleNextWeek = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 7));
  };

  const prepareChartData = () => {
    if (!weeklyData?.daily_summaries?.length) return null;

    const sortedEntries = [...weeklyData.daily_summaries].sort(
      (a, b) => parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    return sortedEntries.map((entry) => ({
      day: format(parseLocalDate(entry.date), 'EEE'),
      food: entry.total_food_calories || 0,
      exercise: entry.total_exercise_calories || 0,
    }));
  };

  const calculateTotals = () => {
    if (!weeklyData?.daily_summaries) {
      return { totalFood: 0, totalExercise: 0, netBalance: 0, daysLogged: 0 };
    }

    let totalFood = 0;
    let totalExercise = 0;
    let daysLogged = 0;

    weeklyData.daily_summaries.forEach((entry) => {
      totalFood += entry.total_food_calories || 0;
      totalExercise += entry.total_exercise_calories || 0;
      if (entry.total_food_calories > 0 || entry.total_exercise_calories > 0) {
        daysLogged++;
      }
    });

    return {
      totalFood,
      totalExercise,
      netBalance: totalFood - totalExercise,
      daysLogged,
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading weekly data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchWeeklyData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const chartData = prepareChartData();
  const totals = calculateTotals();
  const avgDaily = totals.daysLogged > 0 ? Math.round(totals.netBalance / totals.daysLogged) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Week Navigation */}
      <Surface style={styles.weekSelector} elevation={1}>
        <Button mode="text" onPress={handlePreviousWeek} icon="chevron-left" compact>
          Prev
        </Button>
        <View style={styles.weekDisplay}>
          {weeklyData?.start_date && weeklyData?.end_date ? (
            <Text style={styles.weekText}>
              {format(new Date(weeklyData.start_date), 'MMM d')} -{' '}
              {format(new Date(weeklyData.end_date), 'MMM d, yyyy')}
            </Text>
          ) : (
            <Text style={styles.weekText}>Select Week</Text>
          )}
        </View>
        <Button mode="text" onPress={handleNextWeek} icon="chevron-right" compact contentStyle={styles.nextButton}>
          Next
        </Button>
      </Surface>

      {/* Summary Stats */}
      <View style={styles.section}>
        <StatCardRow>
          <StatCard
            label="Food"
            value={totals.totalFood}
            unit="cal"
            icon="food"
            iconColor={colors.caloriesConsumed}
            valueColor={colors.caloriesConsumed}
            variant="compact"
          />
          <StatCard
            label="Exercise"
            value={totals.totalExercise}
            unit="cal"
            icon="run"
            iconColor={colors.caloriesBurned}
            valueColor={colors.caloriesBurned}
            variant="compact"
          />
          <StatCard
            label="Net"
            value={totals.netBalance}
            unit="cal"
            icon="calculator"
            iconColor={colors.netCalories}
            valueColor={totals.netBalance > 14000 ? colors.surplus : colors.deficit}
            variant="compact"
          />
        </StatCardRow>
      </View>

      {/* Insights */}
      <Surface style={styles.insightCard} elevation={1}>
        <View style={styles.insightRow}>
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>{totals.daysLogged}/7</Text>
            <Text style={styles.insightLabel}>Days Logged</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightItem}>
            <Text style={[styles.insightValue, { color: avgDaily > 2000 ? colors.surplus : colors.deficit }]}>
              {avgDaily}
            </Text>
            <Text style={styles.insightLabel}>Avg/Day</Text>
          </View>
        </View>
      </Surface>

      {/* Chart */}
      {chartData ? (
        <View style={styles.section}>
          <ChartCard
            title="Daily Breakdown"
            legend={
              <ChartLegend
                items={[
                  { label: 'Food', color: colors.caloriesConsumed },
                  { label: 'Exercise', color: colors.caloriesBurned },
                ]}
              />
            }
          >
            {isVictoryAvailable ? (
              <VictoryChart
                width={SCREEN_WIDTH - spacing.lg * 2}
                height={220}
                domainPadding={{ x: 25 }}
                padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t) => (t >= 1000 ? `${t / 1000}k` : t)}
                  style={{
                    axis: { stroke: colors.border },
                    tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                    grid: { stroke: colors.divider, strokeDasharray: '4,4' },
                  }}
                />
                <VictoryAxis
                  style={{
                    axis: { stroke: colors.border },
                    tickLabels: { fill: colors.textSecondary, fontSize: 11, fontWeight: '500' },
                  }}
                />
                <VictoryGroup offset={14} colorScale={[colors.caloriesConsumed, colors.caloriesBurned]}>
                  <VictoryBar
                    data={chartData}
                    x="day"
                    y="food"
                    barWidth={12}
                    cornerRadius={{ top: 4 }}
                  />
                  <VictoryBar
                    data={chartData}
                    x="day"
                    y="exercise"
                    barWidth={12}
                    cornerRadius={{ top: 4 }}
                  />
                </VictoryGroup>
              </VictoryChart>
            ) : (
              <WebBarChart data={chartData} />
            )}
          </ChartCard>
        </View>
      ) : (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text style={styles.emptyText}>No data available for this week.</Text>
          <Text style={styles.emptyHint}>Start logging your meals to see your progress!</Text>
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  weekDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  nextButton: {
    flexDirection: 'row-reverse',
  },
  section: {
    padding: spacing.md,
  },
  insightCard: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
