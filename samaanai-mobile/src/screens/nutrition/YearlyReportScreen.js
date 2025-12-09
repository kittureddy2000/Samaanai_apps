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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { StatCard, StatCardRow, ChartCard, ChartLegend } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Web fallback chart component
const WebBarChart = ({ data }) => {
  const maxValue = Math.max(...data.flatMap((d) => [d.food || 0, d.exercise || 0]), 1);
  const chartHeight = 160;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              <Text style={webChartStyles.label}>{item.month}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const webChartStyles = StyleSheet.create({
  container: { padding: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, paddingBottom: 20, minWidth: 350 },
  barGroup: { alignItems: 'center', marginHorizontal: 4 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  label: { marginTop: 6, fontSize: 10, color: colors.textSecondary },
});

export default function YearlyReportScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [error, setError] = useState(null);

  const fetchYearlyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.getYearlyReport(selectedYear);
      setYearlyData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load yearly data');
      console.error('Yearly report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearlyData();
  }, [selectedYear]);

  const handlePreviousYear = () => {
    setSelectedYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear((prev) => prev + 1);
  };

  const prepareChartData = () => {
    if (!yearlyData?.monthly_entries?.length) return null;

    return monthNames.map((month, index) => {
      const entry = yearlyData.monthly_entries.find((e) => e.month === index + 1);
      return {
        month,
        food: entry?.total_food_calories || 0,
        exercise: entry?.total_exercise_calories || 0,
      };
    });
  };

  const calculateYearlyStats = () => {
    if (!yearlyData?.monthly_entries?.length) {
      return {
        totalNetCalories: 0,
        totalFood: 0,
        totalExercise: 0,
        monthsTracked: 0,
        totalDaysTracked: 0,
      };
    }

    let totalFood = 0;
    let totalExercise = 0;
    let totalDaysTracked = 0;
    let monthsWithData = 0;

    yearlyData.monthly_entries.forEach((entry) => {
      totalFood += entry.total_food_calories || 0;
      totalExercise += entry.total_exercise_calories || 0;
      totalDaysTracked += entry.days_with_data || 0;
      if (entry.total_food_calories > 0 || entry.total_exercise_calories > 0) {
        monthsWithData++;
      }
    });

    return {
      totalNetCalories: totalFood - totalExercise,
      totalFood,
      totalExercise,
      monthsTracked: monthsWithData,
      totalDaysTracked,
    };
  };

  const getInsightMessage = (stats) => {
    if (stats.totalDaysTracked < 7) {
      return {
        icon: 'information',
        title: 'Just Getting Started',
        message: 'Track consistently to see meaningful yearly insights.',
        color: colors.info,
      };
    }

    const avgDaily = Math.round(stats.totalNetCalories / stats.totalDaysTracked);

    if (avgDaily < 1800) {
      return {
        icon: 'check-circle',
        title: 'Great Progress',
        message: `Averaging ${avgDaily} net calories/day - you're on track!`,
        color: colors.success,
      };
    } else if (avgDaily <= 2200) {
      return {
        icon: 'target',
        title: 'Maintaining Well',
        message: `Averaging ${avgDaily} net calories/day - balanced intake.`,
        color: colors.primary,
      };
    } else {
      return {
        icon: 'alert-circle',
        title: 'Above Target',
        message: `Averaging ${avgDaily} net calories/day - consider adjustments.`,
        color: colors.warning,
      };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading yearly data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchYearlyData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const chartData = prepareChartData();
  const stats = calculateYearlyStats();
  const hasData = chartData && chartData.some((d) => d.food > 0 || d.exercise > 0);
  const insight = getInsightMessage(stats);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Year Navigation */}
      <Surface style={styles.yearSelector} elevation={1}>
        <Button mode="text" onPress={handlePreviousYear} icon="chevron-left" compact>
          {selectedYear - 1}
        </Button>
        <View style={styles.yearDisplay}>
          <Text style={styles.yearText}>{selectedYear}</Text>
        </View>
        <Button mode="text" onPress={handleNextYear} icon="chevron-right" compact contentStyle={styles.nextButton}>
          {selectedYear + 1}
        </Button>
      </Surface>

      {/* Summary Stats */}
      <View style={styles.section}>
        <StatCardRow>
          <StatCard
            label="Food"
            value={stats.totalFood}
            unit="cal"
            icon="food"
            iconColor={colors.caloriesConsumed}
            valueColor={colors.caloriesConsumed}
            variant="compact"
          />
          <StatCard
            label="Exercise"
            value={stats.totalExercise}
            unit="cal"
            icon="run"
            iconColor={colors.caloriesBurned}
            valueColor={colors.caloriesBurned}
            variant="compact"
          />
          <StatCard
            label="Net"
            value={stats.totalNetCalories}
            unit="cal"
            icon="calculator"
            iconColor={colors.netCalories}
            valueColor={stats.totalNetCalories > 700000 ? colors.surplus : colors.deficit}
            variant="compact"
          />
        </StatCardRow>
      </View>

      {/* Tracking Stats */}
      <Surface style={styles.insightCard} elevation={1}>
        <View style={styles.insightRow}>
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>{stats.monthsTracked}/12</Text>
            <Text style={styles.insightLabel}>Months Tracked</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightItem}>
            <Text style={styles.insightValue}>{stats.totalDaysTracked}</Text>
            <Text style={styles.insightLabel}>Days Logged</Text>
          </View>
        </View>
      </Surface>

      {/* Chart */}
      {hasData ? (
        <View style={styles.section}>
          <ChartCard
            title="Monthly Breakdown"
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
                  width={Math.max(SCREEN_WIDTH - spacing.lg * 2, 400)}
                  height={220}
                  domainPadding={{ x: 15 }}
                  padding={{ top: 20, bottom: 40, left: 55, right: 20 }}
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
                  <VictoryGroup offset={12} colorScale={[colors.caloriesConsumed, colors.caloriesBurned]}>
                    <VictoryBar data={chartData} x="month" y="food" barWidth={10} cornerRadius={{ top: 4 }} />
                    <VictoryBar data={chartData} x="month" y="exercise" barWidth={10} cornerRadius={{ top: 4 }} />
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
          <Text style={styles.emptyText}>No data available for {selectedYear}.</Text>
          <Text style={styles.emptyHint}>Start logging your meals to see your yearly progress!</Text>
        </Surface>
      )}

      {/* Insight Card */}
      {stats.totalDaysTracked > 0 && (
        <Surface style={styles.yearlyInsightCard} elevation={1}>
          <View style={styles.insightHeader}>
            <Icon name={insight.icon} size={24} color={insight.color} />
            <Text style={[styles.insightTitle, { color: insight.color }]}>{insight.title}</Text>
          </View>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </Surface>
      )}

      {/* Yearly Summary Card */}
      {stats.totalDaysTracked > 0 && (
        <Surface style={styles.summaryCard} elevation={1}>
          <Text style={styles.summaryTitle}>Yearly Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Food Calories</Text>
            <Text style={[styles.summaryValue, { color: colors.caloriesConsumed }]}>
              {stats.totalFood.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Exercise Burned</Text>
            <Text style={[styles.summaryValue, { color: colors.caloriesBurned }]}>
              {stats.totalExercise.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Calories</Text>
            <Text
              style={[styles.summaryValue, { color: stats.totalNetCalories > 700000 ? colors.surplus : colors.deficit }]}
            >
              {stats.totalNetCalories.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average per Day</Text>
            <Text style={styles.summaryValue}>
              {stats.totalDaysTracked > 0 ? Math.round(stats.totalNetCalories / stats.totalDaysTracked).toLocaleString() : 0}
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
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  yearDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 24,
    fontWeight: '700',
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
  yearlyInsightCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  insightMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
});
