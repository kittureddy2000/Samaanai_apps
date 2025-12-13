import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Button, ActivityIndicator, Surface } from 'react-native-paper';
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryGroup,
  isVictoryAvailable,
} from '../../components/charts';
import { api } from '../../services/api';
import { format, getYear, getMonth } from 'date-fns';
import { colors, spacing } from '../../theme';
import { StatCard, StatCardRow, ChartCard, ChartLegend } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Web fallback chart component
const WebBarChart = ({ data }) => {
  const maxValue = Math.max(...data.flatMap((d) => [d.food || 0, d.exercise || 0]), 1);
  const chartHeight = 160;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={webChartStyles.container}>
        <View style={[webChartStyles.chart, { minWidth: data.length * 28 }]}>
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
    </ScrollView>
  );
};

const webChartStyles = StyleSheet.create({
  container: { padding: spacing.xs },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180, paddingBottom: 20 },
  barGroup: { alignItems: 'center', width: 24, marginHorizontal: 2 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 4 },
  label: { marginTop: 6, fontSize: 9, color: colors.textSecondary },
});

const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function MonthlyReportScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState(null);
  const [error, setError] = useState(null);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const year = getYear(currentMonth);
      const month = getMonth(currentMonth) + 1;
      const { data } = await api.getMonthlyReport(month, year);
      setMonthlyData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load monthly data');
      console.error('Monthly report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [currentMonth]);

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const prepareChartData = () => {
    if (!monthlyData?.daily_entries?.length) return null;

    const sortedEntries = [...monthlyData.daily_entries].sort(
      (a, b) => parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    return sortedEntries.map((entry) => ({
      day: format(parseLocalDate(entry.date), 'd'),
      food: entry.total_food_calories || 0,
      exercise: entry.total_exercise_calories || 0,
    }));
  };

  const calculateTotals = () => {
    if (!monthlyData?.daily_entries) {
      return { totalFood: 0, totalExercise: 0, netBalance: 0, daysLogged: 0 };
    }

    let totalFood = 0;
    let totalExercise = 0;
    let daysLogged = 0;

    monthlyData.daily_entries.forEach((entry) => {
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
        <Text style={styles.loadingText}>Loading monthly data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchMonthlyData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const chartData = prepareChartData();
  const totals = calculateTotals();
  const daysInMonth = new Date(getYear(currentMonth), getMonth(currentMonth) + 1, 0).getDate();
  const avgDaily = totals.daysLogged > 0 ? Math.round(totals.netBalance / totals.daysLogged) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Month Navigation */}
      <Surface style={styles.monthSelector} elevation={1}>
        <Button mode="text" onPress={handlePreviousMonth} icon="chevron-left" compact>
          Prev
        </Button>
        <View style={styles.monthDisplay}>
          <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
        </View>
        <Button mode="text" onPress={handleNextMonth} icon="chevron-right" compact contentStyle={styles.nextButton}>
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
            valueColor={totals.netBalance > 60000 ? colors.surplus : colors.deficit}
            variant="compact"
          />
        </StatCardRow>
      </View>

      {/* Insights */}
      <Surface style={styles.insightCard} elevation={1}>
        <View style={styles.insightRow}>
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>
              {totals.daysLogged}/{daysInMonth}
            </Text>
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
      {chartData && chartData.length > 0 ? (
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <VictoryChart
                  width={Math.max(SCREEN_WIDTH - spacing.lg * 2, chartData.length * 25)}
                  height={220}
                  domainPadding={{ x: 15 }}
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
                      tickLabels: { fill: colors.textSecondary, fontSize: 9 },
                    }}
                  />
                  <VictoryGroup offset={10} colorScale={[colors.caloriesConsumed, colors.caloriesBurned]}>
                    <VictoryBar data={chartData} x="day" y="food" barWidth={8} cornerRadius={{ top: 3 }} />
                    <VictoryBar data={chartData} x="day" y="exercise" barWidth={8} cornerRadius={{ top: 3 }} />
                  </VictoryGroup>
                </VictoryChart>
              </ScrollView>
            ) : (
              <WebBarChart data={chartData} />
            )}
          </ChartCard>
        </View>
      ) : (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text style={styles.emptyText}>No data available for this month.</Text>
          <Text style={styles.emptyHint}>Start logging your meals to see your progress!</Text>
        </Surface>
      )}

      {/* Monthly Summary Card */}
      {totals.daysLogged > 0 && (
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>Monthly Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Food Calories</Text>
            <Text style={[styles.summaryValue, { color: colors.caloriesConsumed }]}>
              {totals.totalFood.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Exercise Burned</Text>
            <Text style={[styles.summaryValue, { color: colors.caloriesBurned }]}>
              {totals.totalExercise.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Calories</Text>
            <Text style={[styles.summaryValue, { color: totals.netBalance > 60000 ? colors.surplus : colors.deficit }]}>
              {totals.netBalance.toLocaleString()}
            </Text>
          </View>
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
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
  summaryCard: {
    margin: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
});
