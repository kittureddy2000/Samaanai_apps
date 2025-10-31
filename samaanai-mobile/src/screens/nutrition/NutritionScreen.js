import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { api } from '../../services/api';
import { format, subDays, getDay } from 'date-fns';

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

const formatCalories = (value) => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  return value.toString();
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
      // Don't set error state for weekly data, just log it
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading nutrition data...</Text>
      </View>
    );
  }

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

  const summary = dailyReport?.summary || {};
  const caloriesConsumed = summary.caloriesConsumed || 0;
  const caloriesBurned = summary.caloriesBurned || 0;
  const netCalories = summary.netCalories || 0;
  const calorieGoal = summary.dailyGoal || 2000;
  const remainingCalories = summary.remaining || 0;
  const calorieProgress = Math.min(caloriesConsumed / calorieGoal, 1);

  const prepareChartData = () => {
    if (!weeklyData || !weeklyData.daily_summaries || weeklyData.daily_summaries.length === 0) {
      return null;
    }

    const sortedEntries = [...weeklyData.daily_summaries].sort((a, b) =>
      parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    const labels = sortedEntries.map(entry => format(parseLocalDate(entry.date), 'EEE'));

    // Consumed = Food - Exercise
    const consumedData = sortedEntries.map(entry => {
      const food = entry.total_food_calories || 0;
      const exercise = entry.total_exercise_calories || 0;
      return Math.max(0, food - exercise);
    });

    // Net calories (preserve sign for color coding)
    const netData = sortedEntries.map(entry => {
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return hasData ? (entry.net_calories || 0) : 0;
    });

    return { labels, consumedData, netData };
  };

  const chartData = prepareChartData();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Date selector */}
      <View style={styles.dateSelector}>
        <Button mode="outlined" onPress={() => {
          const yesterday = new Date(selectedDate);
          yesterday.setDate(yesterday.getDate() - 1);
          setSelectedDate(yesterday);
        }}>
          ←
        </Button>
        <Text style={styles.dateText}>{format(selectedDate, 'MMM dd, yyyy')}</Text>
        <Button mode="outlined" onPress={() => {
          const tomorrow = new Date(selectedDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          setSelectedDate(tomorrow);
        }}>
          →
        </Button>
      </View>

      {/* Calorie Overview */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Calories</Title>
          <View style={styles.calorieOverview}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{caloriesConsumed}</Text>
              <Text style={styles.calorieLabel}>Consumed</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={[styles.calorieValue, styles.burned]}>-{caloriesBurned}</Text>
              <Text style={styles.calorieLabel}>Burned</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={[styles.calorieValue, styles.net]}>{netCalories}</Text>
              <Text style={styles.calorieLabel}>Net</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Daily Goal</Text>
              <Text style={styles.progressValue}>{caloriesConsumed} / {calorieGoal}</Text>
            </View>
            <ProgressBar
              progress={calorieProgress}
              color={calorieProgress > 1 ? '#d32f2f' : '#4caf50'}
              style={styles.progressBar}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Log Calories Button */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('DailyEntry')}
            style={styles.logButton}
            icon="calendar-today"
            contentStyle={styles.logButtonContent}
          >
            Log Daily Calories & Weight
          </Button>
        </Card.Content>
      </Card>

      {/* Weekly Tracking Graph */}
      {chartData ? (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>This Week's Progress</Title>
              <Button
                mode="text"
                onPress={() => navigation.navigate('WeeklyReport')}
                compact
              >
                View Details
              </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.groupedBarChart}>
                {/* Y-axis and grid */}
                <View style={styles.chartContainer}>
                  {/* Chart bars */}
                  <View style={styles.barsContainer}>
                    {chartData.labels.map((label, index) => {
                      const consumed = chartData.consumedData[index];
                      const net = chartData.netData[index];
                      const absNet = Math.abs(net);

                      // Calculate max value using absolute values for proper scaling
                      const allAbsValues = chartData.netData.map(n => Math.abs(n));
                      const maxValue = Math.max(...chartData.consumedData, ...allAbsValues, 1);
                      const consumedHeight = (consumed / maxValue) * 120;
                      const netHeight = (absNet / maxValue) * 120;

                      // Determine net bar color: red if negative (over goal/surplus), green if positive (under goal/deficit)
                      const netBarColor = net < 0 ? '#f44336' : net > 0 ? '#4caf50' : '#999';

                      return (
                        <View key={index} style={styles.barGroup}>
                          <View style={styles.barPair}>
                            <View style={styles.barWrapper}>
                              <View style={[styles.bar, styles.consumedBar, { height: consumedHeight }]} />
                              <Text style={styles.barValue}>{formatCalories(consumed)}</Text>
                            </View>
                            <View style={styles.barWrapper}>
                              <View style={[styles.bar, { backgroundColor: netBarColor, height: netHeight }]} />
                              <Text style={styles.barValue}>{formatCalories(absNet)}</Text>
                            </View>
                          </View>
                          <Text style={styles.barLabel}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>Consumed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#f44336' }]} />
                <Text style={styles.legendText}>Over Goal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.legendText}>Under Goal</Text>
              </View>
            </View>
            <Text style={styles.chartHelpText}>
              Red bars show you're over your daily goal (surplus), green bars show you're under (deficit)
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {/* Settings & Other Options */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Settings & Reports</Title>
          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Goals')}
              style={styles.actionButton}
              icon="target"
            >
              Nutrition Goals
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('MonthlyReport')}
              style={styles.actionButton}
              icon="calendar-month"
            >
              Monthly Report
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('YearlyReport')}
              style={styles.actionButton}
              icon="calendar"
            >
              Yearly Report
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    marginTop: 8
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600'
  },
  card: {
    margin: 12,
    marginBottom: 6
  },
  calorieOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12
  },
  calorieItem: {
    alignItems: 'center'
  },
  calorieValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  burned: {
    color: '#4caf50'
  },
  net: {
    color: '#ff9800'
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  progressContainer: {
    marginTop: 12
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 14,
    color: '#666'
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  progressBar: {
    height: 8,
    borderRadius: 4
  },
  remainingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center'
  },
  quickActions: {
    marginTop: 8,
    gap: 6
  },
  actionButton: {
    marginVertical: 2
  },
  logButton: {
    paddingVertical: 4
  },
  logButtonContent: {
    paddingVertical: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  groupedBarChart: {
    paddingVertical: 16,
    paddingHorizontal: 8
  },
  chartContainer: {
    height: 180
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 20
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 60
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 8
  },
  barWrapper: {
    alignItems: 'center',
    width: 24
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 2
  },
  consumedBar: {
    backgroundColor: '#2196F3'
  },
  netBar: {
    backgroundColor: '#FF9800'
  },
  barValue: {
    fontSize: 10,
    color: '#666',
    marginTop: 4
  },
  barLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6
  },
  legendText: {
    fontSize: 12,
    color: '#666'
  },
  chartHelpText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  }
});
