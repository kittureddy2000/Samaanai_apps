import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator } from 'react-native-paper';
import { api } from '../../services/api';

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const prepareChartData = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return null;
    }

    const consumedData = Array(12).fill(0);
    const netData = Array(12).fill(0);

    yearlyData.monthly_entries.forEach(entry => {
      const monthIndex = entry.month - 1;
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);

      if (hasData && entry.days_with_data > 0 && entry.days_in_month > 0) {
        const food = entry.total_food_calories || 0;
        const exercise = entry.total_exercise_calories || 0;
        const consumed = Math.max(0, food - exercise);
        consumedData[monthIndex] = Math.round(consumed);

        const adjustedNetCalories = entry.days_with_data > 0
          ? Math.abs((entry.net_calories || 0) * (entry.days_with_data / entry.days_in_month))
          : 0;
        netData[monthIndex] = Math.round(adjustedNetCalories);
      }
    });

    return { consumedData, netData };
  };

  const calculateYearlyStats = () => {
    if (!yearlyData || !yearlyData.monthly_entries || yearlyData.monthly_entries.length === 0) {
      return {
        totalNetCalories: 0,
        totalFood: 0,
        totalExercise: 0,
        monthsTracked: 0,
        totalDaysTracked: 0
      };
    }

    let totalNetCalories = 0;
    let totalFood = 0;
    let totalExercise = 0;
    let totalDaysTracked = 0;

    yearlyData.monthly_entries.forEach(entry => {
      totalFood += entry.total_food_calories || 0;
      totalExercise += entry.total_exercise_calories || 0;
      totalDaysTracked += entry.days_with_data || 0;

      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      if (hasData && entry.days_with_data > 0 && entry.days_in_month > 0) {
        const adjustedNetCalories = (entry.net_calories || 0) * (entry.days_with_data / entry.days_in_month);
        totalNetCalories += Math.round(adjustedNetCalories);
      }
    });

    return {
      totalNetCalories,
      totalFood,
      totalExercise,
      monthsTracked: yearlyData.monthly_entries.length,
      totalDaysTracked
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
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

  return (
    <ScrollView style={styles.container}>
      {/* Year Navigation */}
      <View style={styles.yearSelector}>
        <Button mode="outlined" onPress={handlePreviousYear}>←</Button>
        <Text style={styles.yearText}>{selectedYear}</Text>
        <Button mode="outlined" onPress={handleNextYear}>→</Button>
      </View>

      {/* Summary Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Yearly Nutrition Summary - {selectedYear}</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, stats.totalNetCalories < 0 ? styles.negative : styles.positive]}>
                {stats.totalNetCalories.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Net Calories</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalFood.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Food</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalExercise.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Exercise</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalDaysTracked}</Text>
              <Text style={styles.statLabel}>Days Tracked</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Chart Card */}
      {chartData && (chartData.consumedData.some(val => val !== 0) || chartData.netData.some(val => val !== 0)) ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Monthly Calorie Trends</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.groupedBarChart}>
                <View style={styles.chartContainer}>
                  <View style={styles.barsContainer}>
                    {monthNames.map((month, index) => {
                      const consumed = chartData.consumedData[index];
                      const net = chartData.netData[index];
                      const maxValue = Math.max(...chartData.consumedData, ...chartData.netData);
                      const consumedHeight = maxValue > 0 ? (consumed / maxValue) * 120 : 0;
                      const netHeight = maxValue > 0 ? (net / maxValue) * 120 : 0;

                      return (
                        <View key={index} style={styles.barGroup}>
                          <View style={styles.barPair}>
                            <View style={styles.barWrapper}>
                              <View style={[styles.bar, styles.consumedBar, { height: consumedHeight }]} />
                              <Text style={styles.barValue}>{consumed}</Text>
                            </View>
                            <View style={styles.barWrapper}>
                              <View style={[styles.bar, styles.netBar, { height: netHeight }]} />
                              <Text style={styles.barValue}>{net}</Text>
                            </View>
                          </View>
                          <Text style={styles.barLabel}>{month}</Text>
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
                <Text style={styles.legendText}>Consumed (Food-Exercise)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>Net Calories</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No data available for {selectedYear}.</Text>
            <Text style={styles.emptySubText}>
              Start logging your food and exercise to see your yearly trends!
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Insights Card */}
      {yearlyData && yearlyData.monthly_entries && yearlyData.monthly_entries.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Yearly Insights</Title>
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>Overall Trend</Text>
              <Text style={styles.insightText}>
                {stats.totalNetCalories < -10000
                  ? 'Strong progress toward weight loss goals'
                  : stats.totalNetCalories < 0
                  ? 'Moderate progress toward weight loss goals'
                  : stats.totalNetCalories < 10000
                  ? 'Slight calorie surplus for the year'
                  : 'Significant calorie surplus for the year'}
              </Text>
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>Recommendation</Text>
              <Text style={styles.insightText}>
                {stats.totalNetCalories < 0
                  ? "Continue your current approach - you're making progress!"
                  : stats.monthsTracked < 3
                  ? 'Track consistently to get better insights'
                  : stats.totalNetCalories > 10000
                  ? 'Consider adjusting your calorie intake or increasing activity'
                  : 'Make small adjustments to achieve a calorie deficit'}
              </Text>
            </View>
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
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  yearText: {
    fontSize: 20,
    fontWeight: '600'
  },
  card: {
    margin: 16,
    marginBottom: 8
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16
  },
  statBox: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  statLabel: {
    fontSize: 11,
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
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    gap: 16
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 50
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 8
  },
  barWrapper: {
    alignItems: 'center',
    width: 22
  },
  bar: {
    width: 18,
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
    fontSize: 9,
    color: '#666',
    marginTop: 3
  },
  barLabel: {
    fontSize: 10,
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12
  },
  emptySubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  },
  insightBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  insightText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  }
});
