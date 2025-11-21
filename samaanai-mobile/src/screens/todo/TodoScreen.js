import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Card, ActivityIndicator, FAB, Menu, Button, Chip, Banner } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function TodoScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed', 'overdue'
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'name', 'createdAt'
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // Microsoft Integration state
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftSyncing, setMicrosoftSyncing] = useState(false);
  const [showMicrosoftBanner, setShowMicrosoftBanner] = useState(true);

  const fetchTasks = async () => {
    try {
      setError(null);
      let params = {};

      if (filter === 'pending') {
        params.completed = false;
      } else if (filter === 'completed') {
        params.completed = true;
      }
      // 'all' and 'overdue' fetch all tasks, filtering happens client-side for overdue

      const { data } = await api.getTasks(params);
      let filteredTasks = data.tasks;

      // Filter overdue tasks client-side
      if (filter === 'overdue') {
        filteredTasks = filteredTasks.filter(task => {
          return task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        });
      }

      // Sort tasks
      const sortedTasks = sortTasks(filteredTasks, sortBy);
      setTasks(sortedTasks);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
      console.error('Tasks error:', err);
    }
  };

  const sortTasks = (tasksList, sortMethod) => {
    const sorted = [...tasksList];

    switch (sortMethod) {
      case 'dueDate':
        return sorted.sort((a, b) => {
          // Tasks without due date go to the end
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'createdAt':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      default:
        return sorted;
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

  const checkMicrosoftStatus = async () => {
    try {
      const { data } = await api.getMicrosoftStatus();
      setMicrosoftConnected(data.connected);
    } catch (err) {
      console.error('Microsoft status error:', err);
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      const { data } = await api.connectMicrosoft();

      // Open Microsoft OAuth in browser
      const result = await WebBrowser.openBrowserAsync(data.authorizationUrl);

      if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Microsoft authentication was cancelled');
        return;
      }

      // Check connection status after OAuth
      setTimeout(async () => {
        await checkMicrosoftStatus();
        if (microsoftConnected) {
          Alert.alert('Success', 'Microsoft To Do connected successfully!');
        }
      }, 2000);
    } catch (err) {
      console.error('Connect Microsoft error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to connect to Microsoft');
    }
  };

  const handleSyncMicrosoft = async () => {
    try {
      setMicrosoftSyncing(true);
      const { data } = await api.syncMicrosoftTasks();

      Alert.alert(
        'Sync Complete',
        `Imported: ${data.imported}\nUpdated: ${data.updated}\nErrors: ${data.errors}`
      );

      // Refresh tasks
      await fetchAllData();
    } catch (err) {
      console.error('Sync Microsoft error:', err);
      Alert.alert('Sync Failed', err.response?.data?.error || 'Failed to sync Microsoft tasks');
    } finally {
      setMicrosoftSyncing(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchStats(), checkMicrosoftStatus()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [filter, sortBy]);

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
    const hasMeta = task.dueDate || task.reminderType;
    const hasAttachment = task.imageUrl && task.imageUrl.trim() !== '';

    return (
      <Card key={task.id} style={[styles.taskCard, task.completed && styles.completedTask]}>
        <Card.Content style={styles.compactCardContent}>
          <View style={styles.taskHeader}>
            <TouchableOpacity onPress={() => handleToggleTask(task.id)} style={styles.checkboxContainer}>
              <MaterialCommunityIcons
                name={task.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={task.completed ? '#4caf50' : '#999'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.taskContent}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <View style={styles.taskNameRow}>
                <Text style={[styles.taskName, task.completed && styles.completedText]}>
                  {task.name}
                </Text>
                {task.microsoftTodoId && (
                  <MaterialCommunityIcons
                    name="microsoft"
                    size={14}
                    color="#00A4EF"
                    style={styles.microsoftIcon}
                  />
                )}
                {hasAttachment && (
                  <MaterialCommunityIcons
                    name="paperclip"
                    size={14}
                    color="#666"
                    style={styles.attachmentIcon}
                  />
                )}
              </View>
              {task.description && (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              )}
              {hasMeta && (
                <View style={styles.taskMeta}>
                  {task.dueDate && (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={12}
                        color={isOverdue ? '#d32f2f' : '#666'}
                      />
                      <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                        {format(new Date(task.dueDate), 'MMM dd')}
                      </Text>
                    </View>
                  )}
                  {task.reminderType && (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="bell"
                        size={12}
                        color="#666"
                      />
                      <Text style={styles.metaText}>
                        {task.reminderType}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.taskActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditTask', { task })}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#1976d2" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteTask(task.id)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Microsoft Integration Banner */}
      {showMicrosoftBanner && (
        <Banner
          visible={true}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => setShowMicrosoftBanner(false),
            },
            microsoftConnected
              ? {
                  label: microsoftSyncing ? 'Syncing...' : 'Sync Now',
                  onPress: handleSyncMicrosoft,
                  disabled: microsoftSyncing,
                  icon: microsoftSyncing ? 'sync' : 'cloud-sync',
                }
              : {
                  label: 'Connect',
                  onPress: handleConnectMicrosoft,
                  icon: 'link-variant',
                },
          ]}
          icon={microsoftConnected ? 'microsoft' : 'microsoft'}
          style={styles.microsoftBanner}
        >
          {microsoftConnected
            ? 'Microsoft To Do connected. Tap Sync Now to import tasks.'
            : 'Connect Microsoft To Do to sync your tasks.'}
        </Banner>
      )}

      {/* Stats Card */}
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Tasks Overview</Text>
              <Menu
                visible={sortMenuVisible}
                onDismiss={() => setSortMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setSortMenuVisible(true)}
                    style={styles.sortIconButton}
                  >
                    <MaterialCommunityIcons name="sort" size={20} color="#666" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSortBy('dueDate');
                    setSortMenuVisible(false);
                  }}
                  title="Sort by Due Date"
                  leadingIcon={sortBy === 'dueDate' ? 'check' : undefined}
                />
                <Menu.Item
                  onPress={() => {
                    setSortBy('name');
                    setSortMenuVisible(false);
                  }}
                  title="Sort by Name"
                  leadingIcon={sortBy === 'name' ? 'check' : undefined}
                />
                <Menu.Item
                  onPress={() => {
                    setSortBy('createdAt');
                    setSortMenuVisible(false);
                  }}
                  title="Sort by Created Date"
                  leadingIcon={sortBy === 'createdAt' ? 'check' : undefined}
                />
              </Menu>
            </View>
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setFilter('all')}
              >
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setFilter('pending')}
              >
                <Text style={[styles.statValue, styles.pendingValue]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setFilter('completed')}
              >
                <Text style={[styles.statValue, styles.completedValue]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setFilter('overdue')}
              >
                <Text style={[styles.statValue, styles.overdueValue]}>{stats.overdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      )}

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
        color="#ffffff"
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
    margin: 12,
    marginBottom: 6
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  sortIconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 4
  },
  statValue: {
    fontSize: 20,
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
    fontSize: 11,
    color: '#666',
    marginTop: 2
  },
  tasksList: {
    flex: 1
  },
  taskCard: {
    marginHorizontal: 12,
    marginVertical: 4
  },
  completedTask: {
    opacity: 0.7
  },
  compactCardContent: {
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  checkboxContainer: {
    padding: 2,
    marginRight: 4
  },
  taskContent: {
    flex: 1,
    marginLeft: 6
  },
  taskNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  taskName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
    flex: 1
  },
  attachmentIcon: {
    marginLeft: 2,
    marginTop: -2
  },
  microsoftIcon: {
    marginLeft: 2,
    marginTop: -2
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  taskDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginTop: 1
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
    alignItems: 'center'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  },
  overdueText: {
    color: '#d32f2f',
    fontWeight: '600'
  },
  taskActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 6
  },
  iconButton: {
    padding: 4
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
    backgroundColor: '#4caf50',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  bottomSpacer: {
    height: 80
  },
  microsoftBanner: {
    backgroundColor: '#e3f2fd',
    marginBottom: 0
  }
});
