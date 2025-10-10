import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { format } from 'date-fns';

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [todoData, setTodoData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [nutritionRes, todoRes] = await Promise.all([
        api.getDailyReport(format(new Date(), 'yyyy-MM-dd')).catch(() => ({ data: null })),
        api.getTaskStats().catch(() => ({ data: null }))
      ]);

      setNutritionData(nutritionRes.data);
      setTodoData(todoRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
              <View style={styles.calorieBar}>
                <Text style={styles.bigNumber}>
                  {nutritionData.summary.caloriesConsumed || 0}
                </Text>
                <Text style={styles.bigNumberLabel}>/ {nutritionData.summary.dailyGoal || 2000} cal</Text>
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
              <View style={styles.row}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Consumed</Text>
                  <Text style={styles.statValue}>
                    {nutritionData.summary.caloriesConsumed || 0} cal
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Burned</Text>
                  <Text style={styles.statValue}>
                    {nutritionData.summary.caloriesBurned || 0} cal
                  </Text>
                </View>
              </View>
              <Text style={styles.subInfo}>
                {nutritionData.meals?.length || 0} meals logged today
              </Text>
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
  }
});
