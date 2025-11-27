import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { format, subDays, addDays, getDay } from 'date-fns';

const { width } = Dimensions.get('window');

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chartData = prepareChartData();
  const weeklyStats = calculateWeeklyStats();

  // Glassmorphism Card Component
  const GlassCard = ({ children, style, onPress }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.glassCardContainer, style]}>
        <LinearGradient
          colors={theme.colors.gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassCardGradient}
        >
          <View style={styles.glassCardContent}>
            {children}
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.background]}
        style={styles.backgroundGradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>Dashboard</Text>
          <Text variant="titleMedium" style={styles.headerSubtitle}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Nutrition Summary */}
        <GlassCard style={styles.card} onPress={() => navigation.navigate('Nutrition')}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="food-apple" size={24} color="#2E7D32" />
            </View>
            <Text variant="titleLarge" style={styles.cardTitle}>Nutrition</Text>
          </View>

          {nutritionData?.summary ? (
            <>
              <View style={styles.splitContainer}>
                {/* Today's Data - Left Half */}
                <View style={styles.leftHalf}>
                  <Text variant="labelLarge" style={styles.sectionLabel}>TODAY</Text>
                  <View style={styles.calorieContainer}>
                    <Text variant="displayMedium" style={[styles.bigNumber, { color: theme.colors.primary }]}>
                      {nutritionData.summary.caloriesConsumed || 0}
                    </Text>
                    <Text variant="bodyMedium" style={styles.goalLabel}>
                      / {nutritionData.summary.dailyGoal || 2000} kcal
                    </Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={theme.colors.gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(nutritionData.summary.percentOfGoal || 0, 100)}%` }
                      ]}
                    />
                  </View>
                  <Text variant="bodySmall" style={styles.subInfo}>
                    {nutritionData.meals?.length || 0} meals logged
                  </Text>
                </View>

                {/* Weekly Progress - Right Half */}
                <View style={styles.rightHalf}>
                  <Text variant="labelLarge" style={styles.sectionLabel}>THIS WEEK</Text>
                  {weeklyData ? (
                    <View style={styles.weeklyStatsContainer}>
                      <View style={styles.weekStatRow}>
                        <Text variant="headlineSmall" style={styles.weekStatValue}>
                          {weeklyStats.daysLogged}<Text variant="bodySmall" style={styles.weekStatTotal}>/7</Text>
                        </Text>
                        <Text variant="bodySmall" style={styles.weekStatLabel}>Days Active</Text>
                      </View>

                      <View style={styles.weekStatRow}>
                        <Text variant="headlineSmall" style={[
                          styles.weekStatValue,
                          { color: weeklyStats.totalNetCalories < 0 ? theme.colors.error : theme.colors.tertiary }
                        ]}>
                          {weeklyStats.totalNetCalories > 0 ? '+' : ''}{Math.round(weeklyStats.totalNetCalories)}
                        </Text>
                        <Text variant="bodySmall" style={styles.weekStatLabel}>Net Calories</Text>
                      </View>
                    </View>
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
                      <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <View style={styles.weekTitleContainer}>
                      <Text variant="titleSmall" style={styles.weeklyChartTitle}>Weekly Overview</Text>
                      <Text variant="bodySmall" style={styles.weekDateRange}>
                        {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d')}
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
                        color={isCurrentWeek() ? theme.colors.surfaceVariant : theme.colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScrollContent}>
                    <View style={styles.barsContainer}>
                      {chartData.labels.map((label, index) => {
                        const consumed = chartData.consumedData[index];
                        const net = chartData.netData[index];
                        const absNet = Math.abs(net);

                        // Calculate max value using absolute values for proper scaling
                        const allAbsValues = chartData.netData.map(n => Math.abs(n));
                        const maxValue = Math.max(...chartData.consumedData, ...allAbsValues, 1);
                        const consumedHeight = Math.max((consumed / maxValue) * 100, 4); // Min height 4
                        const netHeight = Math.max((absNet / maxValue) * 100, 4); // Min height 4

                        // Determine net bar color
                        const netBarColor = net < 0 ? theme.colors.error : theme.colors.tertiary;

                        return (
                          <View key={index} style={styles.barGroup}>
                            <View style={styles.barPair}>
                              <View style={styles.barWrapper}>
                                <View style={[styles.bar, { height: `${consumedHeight}%`, backgroundColor: theme.colors.primary }]} />
                              </View>
                              <View style={styles.barWrapper}>
                                <View style={[styles.bar, { height: `${netHeight}%`, backgroundColor: netBarColor }]} />
                              </View>
                            </View>
                            <Text style={styles.barLabel}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyStateText}>No nutrition data for today.</Text>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Start logging your meals!</Text>
            </View>
          )}
        </GlassCard>

        {/* Todo Summary */}
        <GlassCard style={styles.card} onPress={() => navigation.navigate('Todo')}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={24} color="#EF6C00" />
            </View>
            <Text variant="titleLarge" style={styles.cardTitle}>Tasks</Text>
          </View>

          {todoData?.stats ? (
            <>
              <View style={styles.todoStats}>
                <View style={styles.todoStatBox}>
                  <Text variant="displaySmall" style={[styles.todoStatNumber, { color: theme.colors.onSurface }]}>
                    {todoData.stats.pending || 0}
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.todoStatBox}>
                  <Text variant="displaySmall" style={[styles.todoStatNumber, { color: theme.colors.tertiary }]}>
                    {todoData.stats.completed || 0}
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.todoStatBox}>
                  <Text variant="displaySmall" style={[styles.todoStatNumber, { color: theme.colors.error }]}>
                    {todoData.stats.overdue || 0}
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>Overdue</Text>
                </View>
              </View>
              <View style={styles.todoFooter}>
                <Text variant="bodySmall" style={styles.subInfo}>
                  {todoData.stats.total || 0} total tasks
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.outline} />
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyStateText}>No tasks found.</Text>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Create your first task!</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  glassCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  glassCardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: '#1A1C1E',
  },
  splitContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  leftHalf: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    paddingRight: 16,
  },
  rightHalf: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#9E9E9E',
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1,
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  bigNumber: {
    lineHeight: 45,
  },
  goalLabel: {
    color: '#757575',
    marginLeft: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subInfo: {
    color: '#757575',
  },
  weeklyStatsContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  weekStatRow: {
    marginBottom: 12,
  },
  weekStatValue: {
    fontWeight: '700',
  },
  weekStatTotal: {
    color: '#9E9E9E',
    fontSize: 14,
  },
  weekStatLabel: {
    color: '#757575',
  },
  noDataText: {
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
  },
  weeklyChartSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  weekNavigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  weekTitleContainer: {
    alignItems: 'center',
  },
  weeklyChartTitle: {
    color: '#424242',
  },
  weekDateRange: {
    color: '#9E9E9E',
    marginTop: 2,
  },
  chartScrollContent: {
    paddingHorizontal: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 12,
    paddingBottom: 4,
  },
  barGroup: {
    alignItems: 'center',
    width: 32,
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120,
    marginBottom: 8,
  },
  barWrapper: {
    width: 8,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  todoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  todoStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  todoStatNumber: {
    marginBottom: 4,
  },
  statLabel: {
    color: '#757575',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: '#757575',
    marginBottom: 4,
  },
});
