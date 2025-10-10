import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { api } from '../../services/api';
import { format, subDays, addDays, getDay } from 'date-fns';

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

      // Calculate start and end of week
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
    setSelectedDate(prevDate => subDays(prevDate, 7));
  };

  const handleNextWeek = () => {
    setSelectedDate(prevDate => addDays(prevDate, 7));
  };

  const prepareChartData = () => {
    if (!weeklyData || !weeklyData.daily_summaries || weeklyData.daily_summaries.length === 0) {
      return null;
    }

    const sortedEntries = [...weeklyData.daily_summaries].sort((a, b) =>
      parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    const labels = sortedEntries.map(entry => format(parseLocalDate(entry.date), 'EEE'));
    const foodData = sortedEntries.map(entry => entry.total_food_calories || 0);
    const exerciseData = sortedEntries.map(entry => entry.total_exercise_calories || 0);
    const netData = sortedEntries.map(entry => {
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return hasData ? (entry.net_calories || 0) : 0;
    });

    return { labels, foodData, exerciseData, netData };
  };

  const calculateTotals = () => {
    if (!weeklyData || !weeklyData.daily_summaries) {
      return { totalFood: 0, totalExercise: 0, netBalance: 0 };
    }

    let totalFood = 0;
    let totalExercise = 0;
    let netBalance = 0;

    weeklyData.daily_summaries.forEach(entry => {
      totalFood += entry.total_food_calories || 0;
      totalExercise += entry.total_exercise_calories || 0;
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      netBalance += hasData ? (entry.net_calories || 0) : 0;
    });

    return { totalFood, totalExercise, netBalance };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
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

  return (
    <ScrollView style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekSelector}>
        <Button mode="outlined" onPress={handlePreviousWeek}>←</Button>
        <View style={styles.weekDisplay}>
          {weeklyData && weeklyData.start_date && weeklyData.end_date ? (
            <Text style={styles.weekText}>
              {format(new Date(weeklyData.start_date), 'MMM d')} -{' '}
              {format(new Date(weeklyData.end_date), 'MMM d, yyyy')}
            </Text>
          ) : (
            <Text style={styles.weekText}>Loading...</Text>
          )}
        </View>
        <Button mode="outlined" onPress={handleNextWeek}>→</Button>
      </View>

      {/* Summary Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Weekly Calorie Balance</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{totals.totalFood} cal</Text>
              <Text style={styles.summaryLabel}>Total Food</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{totals.totalExercise} cal</Text>
              <Text style={styles.summaryLabel}>Total Exercise</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryValue, totals.netBalance >= 0 ? styles.positive : styles.negative]}>
                {totals.netBalance} cal
              </Text>
              <Text style={styles.summaryLabel}>Net Balance</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Chart Card */}
      {chartData ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Daily Breakdown</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.foodData,
                      color: () => 'rgba(255, 99, 132, 1)',
                    },
                    {
                      data: chartData.exerciseData,
                      color: () => 'rgba(75, 192, 192, 1)',
                    },
                  ],
                  legend: ['Food', 'Exercise']
                }}
                width={Math.max(Dimensions.get('window').width - 60, chartData.labels.length * 80)}
                height={220}
                yAxisLabel=""
                yAxisSuffix=" cal"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForLabels: {
                    fontSize: 12
                  }
                }}
                style={styles.chart}
              />
            </ScrollView>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 99, 132, 1)' }]} />
                <Text style={styles.legendText}>Food</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'rgba(75, 192, 192, 1)' }]} />
                <Text style={styles.legendText}>Exercise</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No data available for this week.</Text>
          </Card.Content>
        </Card>
      )}
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
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  weekDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600'
  },
  card: {
    margin: 16,
    marginBottom: 8
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center'
  },
  positive: {
    color: '#d32f2f'
  },
  negative: {
    color: '#4caf50'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24
  }
});
