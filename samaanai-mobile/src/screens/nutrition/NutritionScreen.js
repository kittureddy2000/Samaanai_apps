import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Button, FAB } from 'react-native-paper';
import { format, subDays, getDay } from 'date-fns';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import {
  CalorieRing,
  StatCard,
  StatCardRow,
  DateNavigator,
  ChartCard,
  ChartLegend,
  QuickActionButton,
  QuickActionGrid,
} from '../../components/common';
import { WeeklyBarChart } from '../../components/charts';

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

export default function NutritionScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchDailyReport = async () => {
    try {
      setError(null);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await api.getDailyReport(dateStr);
      setDailyReport(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load nutrition data');
      console.error('Nutrition report error:', err);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const startOfWeek = getStartOfCurrentWeek();
      const endDate = new Date(startOfWeek);
      endDate.setDate(endDate.getDate() + 6);

      const startDateStr = format(startOfWeek, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data } = await api.getWeeklyReport(startDateStr, endDateStr);
      setWeeklyData(data);
    } catch (err) {
      console.error('Weekly data error:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchDailyReport(), fetchWeeklyData()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading nutrition data...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchAllData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  // Extract data
  const summary = dailyReport?.summary || {};
  const caloriesConsumed = summary.caloriesConsumed || 0;
  const caloriesBurned = summary.caloriesBurned || 0;
  const netCalories = summary.netCalories || 0;
  const calorieGoal = summary.dailyGoal || 2000;

  // Prepare chart data for Victory
  const prepareChartData = () => {
    if (!weeklyData?.daily_summaries?.length) return [];

    const sortedEntries = [...weeklyData.daily_summaries].sort(
      (a, b) => parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    return sortedEntries.map((entry) => {
      const food = entry.total_food_calories || 0;
      const exercise = entry.total_exercise_calories || 0;
      const consumed = Math.max(0, food - exercise);
      const net = entry.net_calories || 0;

      return {
        day: format(parseLocalDate(entry.date), 'EEE'),
        consumed,
        net: Math.abs(net),
        goal: calorieGoal,
        isOverGoal: net > calorieGoal,
      };
    });
  };

  const chartData = prepareChartData();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Date Navigator */}
        <DateNavigator
          date={selectedDate}
          onDateChange={setSelectedDate}
          showPicker={true}
          allowFuture={false}
        />

        {/* Calorie Ring */}
        <View style={styles.ringContainer}>
          <CalorieRing
            consumed={caloriesConsumed}
            goal={calorieGoal}
            size={200}
            strokeWidth={16}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.section}>
          <StatCardRow>
            <StatCard
              label="Food"
              value={caloriesConsumed}
              unit="cal"
              icon="food"
              iconColor={colors.caloriesConsumed}
              valueColor={colors.caloriesConsumed}
            />
            <StatCard
              label="Exercise"
              value={caloriesBurned}
              unit="cal"
              icon="run"
              iconColor={colors.caloriesBurned}
              valueColor={colors.caloriesBurned}
            />
            <StatCard
              label="Net"
              value={netCalories}
              unit="cal"
              icon="calculator"
              iconColor={colors.netCalories}
              valueColor={netCalories > calorieGoal ? colors.surplus : colors.deficit}
            />
          </StatCardRow>
        </View>

        {/* Weekly Progress Chart */}
        {chartData.length > 0 && (
          <View style={styles.section}>
            <ChartCard
              title="This Week's Progress"
              legend={
                <ChartLegend
                  items={[
                    { label: 'Consumed', color: colors.caloriesConsumed },
                    { label: 'Under Goal', color: colors.deficit },
                    { label: 'Over Goal', color: colors.surplus },
                  ]}
                />
              }
            >
              <WeeklyBarChart data={chartData} goal={calorieGoal} />
            </ChartCard>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <QuickActionGrid columns={2}>
            <QuickActionButton
              icon="target"
              label="Goals"
              onPress={() => navigation.navigate('Goals')}
              color={colors.primary}
            />
            <QuickActionButton
              icon="scale-bathroom"
              label="Weight"
              onPress={() => navigation.navigate('WeightTracking')}
              color={colors.primary}
            />
            <QuickActionButton
              icon="calendar-month"
              label="Monthly"
              onPress={() => navigation.navigate('MonthlyReport')}
              color={colors.primary}
            />
            <QuickActionButton
              icon="calendar"
              label="Yearly"
              onPress={() => navigation.navigate('YearlyReport')}
              color={colors.primary}
            />
          </QuickActionGrid>
        </View>

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Log Entry"
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
  ringContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
