import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator } from 'react-native-paper';
import { api } from '../../services/api';
import { format, getYear, getMonth } from 'date-fns';

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
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const prepareChartData = () => {
    if (!monthlyData || !monthlyData.daily_entries || monthlyData.daily_entries.length === 0) {
      return null;
    }

    const sortedEntries = [...monthlyData.daily_entries].sort((a, b) =>
      parseLocalDate(a.date) - parseLocalDate(b.date)
    );

    const labels = sortedEntries.map(entry => format(parseLocalDate(entry.date), 'd'));

    // Consumed = Food - Exercise
    const consumedData = sortedEntries.map(entry => {
      const food = entry.total_food_calories || 0;
      const exercise = entry.total_exercise_calories || 0;
      return Math.max(0, food - exercise);
    });

    // Net calories (what's left after accounting for BMR goal)
    const netData = sortedEntries.map(entry => {
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return hasData ? Math.abs(entry.net_calories || 0) : 0;
    });

    return { labels, consumedData, netData };
  };

  const calculateTotals = () => {
    if (!monthlyData || !monthlyData.daily_entries) {
      return { totalFood: 0, totalExercise: 0, netBalance: 0, daysLogged: 0 };
    }

    let totalFood = 0;
    let totalExercise = 0;
    let netBalance = 0;

    monthlyData.daily_entries.forEach(entry => {
      totalFood += entry.total_food_calories || 0;
      totalExercise += entry.total_exercise_calories || 0;
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      netBalance += hasData ? (entry.net_calories || 0) : 0;
    });

    return {
      totalFood,
      totalExercise,
      netBalance,
      daysLogged: monthlyData.daily_entries.length
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
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

  return (
    <ScrollView style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthSelector}>
        <Button mode="outlined" onPress={handlePreviousMonth}>←</Button>
        <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <Button mode="outlined" onPress={handleNextMonth}>→</Button>
      </View>

      {/* Summary Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Monthly Calorie Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{totals.totalFood}</Text>
              <Text style={styles.summaryLabel}>Total Food</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{totals.totalExercise}</Text>
              <Text style={styles.summaryLabel}>Total Exercise</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryValue, totals.netBalance >= 0 ? styles.positive : styles.negative]}>
                {totals.netBalance}
              </Text>
              <Text style={styles.summaryLabel}>Net Balance</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{totals.daysLogged}</Text>
              <Text style={styles.summaryLabel}>Logged Days</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Chart Card */}
      {chartData && chartData.labels.length > 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Daily Calorie Trends</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.groupedBarChart}>
                <View style={styles.chartContainer}>
                  <View style={styles.barsContainer}>
                    {chartData.labels.map((label, index) => {
                      const consumed = chartData.consumedData[index];
                      const net = chartData.netData[index];
                      const maxValue = Math.max(...chartData.consumedData, ...chartData.netData);
                      const consumedHeight = (consumed / maxValue) * 120;
                      const netHeight = (net / maxValue) * 120;

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
            <Text style={styles.emptyText}>No data available for this month.</Text>
            <Text style={styles.emptySubText}>Start logging your food and exercise!</Text>
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  monthText: {
    fontSize: 18,
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
    fontSize: 20,
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
    gap: 12
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 40
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 8
  },
  barWrapper: {
    alignItems: 'center',
    width: 18
  },
  bar: {
    width: 16,
    borderRadius: 3,
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
    marginTop: 2
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
  }
});
