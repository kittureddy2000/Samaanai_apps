import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Title, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import api from '../services/api';
import { format, subDays, addDays, getDay } from 'date-fns';

const getStartOfWeek = (date, startOfWeek = 2) => {
  const jsDayOfWeek = getDay(date);
  const pythonWeekday = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
  const daysToSubtract = (pythonWeekday - startOfWeek + 7) % 7;
  return subDays(date, daysToSubtract);
};

const getStartOfCurrentWeek = (startOfWeek = 2) => {
  return getStartOfWeek(new Date(), startOfWeek);
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

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [todoData, setTodoData] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getStartOfCurrentWeek());

  const fetchDashboardData = async () => {
    try {
      const startOfWeek = selectedWeekStart;
      const endDate = new Date(startOfWeek);
      endDate.setDate(endDate.getDate() + 6);

      const startDateStr = format(startOfWeek, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const [nutritionRes, weeklyRes, todoRes] = await Promise.all([
        api.getDailyReport(format(new Date(), 'yyyy-MM-dd')).catch(() => ({ data: null })),
        api.getWeeklyReport(startDateStr, endDateStr).catch(() => ({ data: null })),
        api.getTaskStats().catch(() => ({ data: null }))
      ]);

      setNutritionData(nutritionRes.data);
      setWeeklyData(weeklyRes.data);
      setTodoData(todoRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchDashboardData();
    }
  }, [isFocused, selectedWeekStart]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handlePreviousWeek = () => {
    setSelectedWeekStart(prevWeek => subDays(prevWeek, 7));
  };

  const handleNextWeek = () => {
    setSelectedWeekStart(prevWeek => addDays(prevWeek, 7));
  };

  const isCurrentWeek = () => {
    const currentWeekStart = getStartOfCurrentWeek();
    return format(selectedWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');
  };

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

    return { labels, consumedData, netData, sortedEntries };
  };

  const calculateWeeklyStats = () => {
    if (!weeklyData || !weeklyData.daily_summaries) {
      return { daysLogged: 0, avgCalories: 0, totalNetCalories: 0 };
    }

    const daysLogged = weeklyData.daily_summaries.filter(entry =>
      (entry.total_food_calories > 0 || entry.total_exercise_calories > 0)
    ).length;

    const totalConsumed = weeklyData.daily_summaries.reduce((sum, entry) =>
      sum + (entry.total_food_calories || 0), 0
    );
    const avgCalories = daysLogged > 0 ? Math.round(totalConsumed / daysLogged) : 0;

    // Calculate total net calories for the week
    const totalNetCalories = weeklyData.daily_summaries.reduce((sum, entry) => {
      const hasData = (entry.total_food_calories > 0 || entry.total_exercise_calories > 0);
      return sum + (hasData ? (entry.net_calories || 0) : 0);
    }, 0);

    return { daysLogged, avgCalories, totalNetCalories };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const chartData = prepareChartData();
  const weeklyStats = calculateWeeklyStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Title style={styles.headerTitle}>Dashboard</Title>
        <Text style={styles.headerSubtitle}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>
      </View>

      {/* Nutrition Summary */}
      <Card style={styles.card} onPress={() => navigation.navigate('Nutrition')}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="food-apple" size={24} color="#4caf50" />
            <Title style={styles.cardTitle}>Today's Calories</Title>
          </View>
          {nutritionData?.summary ? (
            <>
              <View style={styles.splitContainer}>
                {/* Today's Data - Left Half */}
                <View style={styles.leftHalf}>
                  <View style={styles.calorieBar}>
                    <Text style={styles.bigNumber}>
                      {nutritionData.summary.caloriesConsumed || 0}
                    </Text>
                    <Text style={styles.bigNumberLabel}>/ {nutritionData.summary.dailyGoal || 2000}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(nutritionData.summary.percentOfGoal || 0, 100)}%`,
                          backgroundColor: (nutritionData.summary.percentOfGoal || 0) > 100 ? theme.colors.error : '#4caf50'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.subInfo}>
                    {nutritionData.meals?.length || 0} meals logged
                  </Text>
                </View>

                {/* Weekly Progress - Right Half */}
                <View style={styles.rightHalf}>
                  {weeklyData ? (
                    <>
                      <Text style={styles.weekLabel}>This Week</Text>
                      <View style={styles.weeklyStats}>
                        <View style={styles.weekStatItem}>
                          <Text style={styles.weekStatValue}>
                            {weeklyStats.daysLogged}/7
                          </Text>
                          <Text style={styles.weekStatLabel}>Days</Text>
                        </View>
                        <View style={styles.weekStatItem}>
                          <Text style={[
                            styles.weekStatValue,
                            { color: weeklyStats.totalNetCalories < 0 ? '#f44336' : weeklyStats.totalNetCalories > 0 ? '#4caf50' : '#ff9800' }
                          ]}>
                            {weeklyStats.totalNetCalories > 0 ? '+' : ''}{Math.round(weeklyStats.totalNetCalories)}
                          </Text>
                          <Text style={styles.weekStatLabel}>Net Cal</Text>
                        </View>
                      </View>
                      <View style={styles.weekProgressBar}>
                        <View
                          style={[
                            styles.weekProgressFill,
                            {
                              width: `${(weeklyStats.daysLogged / 7) * 100}%`,
                              backgroundColor: '#ff9800'
                            }
                          ]}
                        />
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>No weekly data</Text>
                  )}
                </View>
              </View>

              {/* Weekly Bar Chart */}
              {chartData && (
                <View style={styles.weeklyChartSection}>
                  <View style={styles.weekNavigationHeader}>
                    <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekNavButton}>
                      <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.weekTitleContainer}>
                      <Text style={styles.weeklyChartTitle}>Weekly Overview</Text>
                      <Text style={styles.weekDateRange}>
                        {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleNextWeek}
                      style={styles.weekNavButton}
                      disabled={isCurrentWeek()}
                    >
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={isCurrentWeek() ? '#ccc' : '#666'}
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.groupedBarChart}>
                      <View style={styles.chartContainer}>
                        <View style={styles.barsContainer}>
                          {chartData.labels.map((label, index) => {
                            const consumed = chartData.consumedData[index];
                            const net = chartData.netData[index];
                            const absNet = Math.abs(net);

                            // Calculate max value using absolute values for proper scaling
                            const allAbsValues = chartData.netData.map(n => Math.abs(n));
                            const maxValue = Math.max(...chartData.consumedData, ...allAbsValues, 1);
                            const consumedHeight = (consumed / maxValue) * 100;
                            const netHeight = (absNet / maxValue) * 100;

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
                </View>
              )}
            </>
          ) : (
            <Text>No nutrition data for today. Start logging your meals!</Text>
          )}
        </Card.Content>
      </Card>

      {/* Todo Summary */}
      <Card style={styles.card} onPress={() => navigation.navigate('Todo')}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={24} color="#ff9800" />
            <Title style={styles.cardTitle}>Tasks</Title>
          </View>
          {todoData?.stats ? (
            <>
              <View style={styles.todoStats}>
                <View style={styles.todoStatBox}>
                  <Text style={[styles.bigNumber, { fontSize: 28 }]}>
                    {todoData.stats.pending || 0}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.todoStatBox}>
                  <Text style={[styles.bigNumber, { fontSize: 28, color: '#4caf50' }]}>
                    {todoData.stats.completed || 0}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.todoStatBox}>
                  <Text style={[styles.bigNumber, { fontSize: 28, color: '#d32f2f' }]}>
                    {todoData.stats.overdue || 0}
                  </Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </View>
              </View>
              <Text style={styles.subInfo}>
                {todoData.stats.total || 0} total tasks
              </Text>
            </>
          ) : (
            <Text>No tasks found. Create your first task to get started!</Text>
          )}
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
    alignItems: 'center'
  },
  header: {
    padding: 24,
    paddingTop: 40
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    marginBottom: 4
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 14
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 18
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8
  },
  bigNumberLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8
  },
  calorieBar: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 8
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600'
  },
  subInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  todoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12
  },
  todoStatBox: {
    alignItems: 'center'
  },
  splitContainer: {
    flexDirection: 'row',
    gap: 16
  },
  leftHalf: {
    flex: 1,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0'
  },
  rightHalf: {
    flex: 1,
    paddingLeft: 8
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4
  },
  weekStatItem: {
    alignItems: 'center'
  },
  weekStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff9800'
  },
  weekStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2
  },
  weekProgressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden'
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: 3
  },
  noDataText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20
  },
  weeklyChartSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  weekNavigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  weekNavButton: {
    padding: 4,
    borderRadius: 4
  },
  weekTitleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  weeklyChartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  weekDateRange: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  groupedBarChart: {
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  chartContainer: {
    height: 150
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
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
    marginBottom: 6
  },
  barWrapper: {
    alignItems: 'center',
    width: 20
  },
  bar: {
    width: 18,
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
    marginHorizontal: 6
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 5
  },
  legendText: {
    fontSize: 11,
    color: '#666'
  }
});
