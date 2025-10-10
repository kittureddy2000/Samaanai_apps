import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, FAB, Chip, Checkbox } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function TodoScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'

  const fetchTasks = async () => {
    try {
      setError(null);
      const params = filter === 'all' ? {} : { completed: filter === 'completed' };
      const { data } = await api.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
      console.error('Tasks error:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.getTaskStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchStats()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [filter]);

  useEffect(() => {
    if (isFocused) {
      fetchAllData();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleToggleTask = async (taskId) => {
    try {
      await api.toggleTaskCompletion(taskId);
      fetchAllData();
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      fetchAllData();
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
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

  const renderTaskCard = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

    return (
      <Card key={task.id} style={[styles.taskCard, task.completed && styles.completedTask]}>
        <Card.Content>
          <View style={styles.taskHeader}>
            <Checkbox
              status={task.completed ? 'checked' : 'unchecked'}
              onPress={() => handleToggleTask(task.id)}
            />
            <TouchableOpacity
              style={styles.taskContent}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <Text style={[styles.taskName, task.completed && styles.completedText]}>
                {task.name}
              </Text>
              {task.description && (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              )}
              <View style={styles.taskMeta}>
                {task.dueDate && (
                  <Chip
                    mode="outlined"
                    compact
                    style={[styles.chip, isOverdue && styles.overdueChip]}
                    textStyle={[styles.chipText, isOverdue && styles.overdueText]}
                  >
                    {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                  </Chip>
                )}
                {task.reminderType && (
                  <Chip mode="outlined" compact style={styles.chip} textStyle={styles.chipText}>
                    {task.reminderType}
                  </Chip>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.taskActions}>
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('EditTask', { task })}
              >
                Edit
              </Button>
              <Button
                mode="text"
                compact
                textColor="#d32f2f"
                onPress={() => handleDeleteTask(task.id)}
              >
                Delete
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Card */}
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.pendingValue]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.completedValue]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.overdueValue]}>{stats.overdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          mode={filter === 'all' ? 'flat' : 'outlined'}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          mode={filter === 'pending' ? 'flat' : 'outlined'}
          selected={filter === 'pending'}
          onPress={() => setFilter('pending')}
          style={styles.filterChip}
        >
          Pending
        </Chip>
        <Chip
          mode={filter === 'completed' ? 'flat' : 'outlined'}
          selected={filter === 'completed'}
          onPress={() => setFilter('completed')}
          style={styles.filterChip}
        >
          Completed
        </Chip>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>Create your first task to get started!</Text>
          </View>
        ) : (
          tasks.map(renderTaskCard)
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddTask')}
      />
    </View>
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
  statsCard: {
    margin: 16,
    marginBottom: 8
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  pendingValue: {
    color: '#ff9800'
  },
  completedValue: {
    color: '#4caf50'
  },
  overdueValue: {
    color: '#d32f2f'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8
  },
  filterChip: {
    marginHorizontal: 4
  },
  tasksList: {
    flex: 1
  },
  taskCard: {
    margin: 16,
    marginBottom: 8
  },
  completedTask: {
    opacity: 0.7
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  taskContent: {
    flex: 1,
    marginLeft: 8
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  chip: {
    height: 28
  },
  chipText: {
    fontSize: 12
  },
  overdueChip: {
    borderColor: '#d32f2f'
  },
  overdueText: {
    color: '#d32f2f'
  },
  taskActions: {
    marginLeft: 8
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb'
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1976d2'
  },
  bottomSpacer: {
    height: 80
  }
});
