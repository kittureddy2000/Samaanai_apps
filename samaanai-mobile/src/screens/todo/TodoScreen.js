import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Card, ActivityIndicator, FAB, Menu, Button, Chip, Searchbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function TodoScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTasks, setAllTasks] = useState([]); // Store all tasks from API
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'completed', 'overdue' - Default to pending
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'name', 'createdAt'
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Microsoft Integration state
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftSyncing, setMicrosoftSyncing] = useState(false);

  // Google Integration state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);

  const fetchTasks = async () => {
    try {
      setError(null);
      // Always fetch ALL tasks - filtering happens client-side
      const { data } = await api.getTasks({});
      setAllTasks(data.tasks);
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

  const checkGoogleStatus = async () => {
    try {
      const { data } = await api.getGoogleStatus();
      setGoogleConnected(data.connected);
    } catch (err) {
      console.error('Google status error:', err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data } = await api.connectGoogle();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        setGoogleConnected(true); // Optimistic update
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to initiate Google connection');
      console.error(err);
    }
  };

  const handleSyncGoogle = async () => {
    try {
      setGoogleSyncing(true);
      const { data } = await api.syncGoogleTasks();
      Alert.alert('Success', `Synced ${data.synced} tasks from Google`);
      setGoogleConnected(true);
      await fetchAllData();
    } catch (err) {
      console.error('Sync Google error:', err);
      // If 401/403, maybe not connected
      Alert.alert('Sync Failed', 'Failed to sync Google Tasks. Please connect again.');
      setGoogleConnected(false);
    } finally {
      setGoogleSyncing(false);
    }
  };

  // Client-side filtering and sorting using useMemo to prevent re-fetching
  const tasks = useMemo(() => {
    let filteredTasks = [...allTasks];

    // Apply filter
    if (filter === 'pending') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (filter === 'overdue') {
      filteredTasks = filteredTasks.filter(task => {
        return task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
      });
    }
    // 'all' includes everything

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(task => {
        return task.name.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query));
      });
    }

    // Apply sorting
    return sortTasks(filteredTasks, sortBy);
  }, [allTasks, filter, sortBy, searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchStats(), checkMicrosoftStatus(), checkGoogleStatus()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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

  const getPriorityColor = (task) => {
    // Determine priority color based on task properties
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
    if (isOverdue) return '#d32f2f'; // Red for overdue
    if (task.completed) return '#8bc34a'; // Light green for completed

    // Check if due today
    const today = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (dueDate) {
      const isToday = dueDate.toDateString() === today.toDateString();
      if (isToday) return '#ff9800'; // Orange for today
    }

    return '#42a5f5'; // Blue default
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const renderTaskCard = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
    const priorityColor = getPriorityColor(task);
    const dueDateText = formatDueDate(task.dueDate);

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskItem}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        activeOpacity={0.7}
      >
        <View style={styles.taskRow}>
          <TouchableOpacity
            onPress={() => handleToggleTask(task.id)}
            style={styles.checkboxContainer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[
              styles.checkbox,
              task.completed && styles.checkboxCompleted
            ]}>
              {task.completed && (
                <MaterialCommunityIcons name="check" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.taskContent}>
            <Text style={[
              styles.taskName,
              task.completed && styles.completedText
            ]}>
              {task.name}
            </Text>
            {dueDateText && (
              <Text style={[
                styles.dueDateText,
                isOverdue && styles.overdueText,
                task.completed && styles.completedDueDate
              ]}>
                Due {dueDateText}
                {task.reminderType && ` • ${task.reminderType}`}
              </Text>
            )}
          </View>

          <View style={styles.taskRightSection}>
            {task.microsoftTodoId && (
              <MaterialCommunityIcons
                name="microsoft"
                size={16}
                color="#00A4EF"
                style={styles.integrationIcon}
              />
            )}
            {task.googleTaskId && (
              <MaterialCommunityIcons
                name="google"
                size={16}
                color="#DB4437"
                style={styles.integrationIcon}
              />
            )}
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search tasks..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            icon="magnify"
            clearIcon={searchQuery ? "close" : undefined}
          />
          <View style={styles.headerIcons}>
            {microsoftConnected && (
              <TouchableOpacity
                onPress={handleSyncMicrosoft}
                disabled={microsoftSyncing}
                style={styles.syncIconButton}
              >
                <MaterialCommunityIcons
                  name={microsoftSyncing ? "sync" : "microsoft"}
                  size={22}
                  color={microsoftSyncing ? "#999" : "#00A4EF"}
                />
              </TouchableOpacity>
            )}
            {googleConnected && (
              <TouchableOpacity
                onPress={handleSyncGoogle}
                disabled={googleSyncing}
                style={styles.syncIconButton}
              >
                <MaterialCommunityIcons
                  name={googleSyncing ? "sync" : "google"}
                  size={22}
                  color={googleSyncing ? "#999" : "#DB4437"}
                />
              </TouchableOpacity>
            )}
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setSortMenuVisible(true)}
                  style={styles.sortIconButton}
                >
                  <MaterialCommunityIcons name="sort" size={22} color="#666" />
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
        </View>

        {/* Stats Chips */}
        {stats && (
          <View style={styles.statsChipsContainer}>
            <TouchableOpacity
              style={[styles.statChip, filter === 'all' && styles.statChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.statChipValue, filter === 'all' && styles.statChipValueActive]}>{stats.total}</Text>
              <Text style={[styles.statChipLabel, filter === 'all' && styles.statChipLabelActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statChip, filter === 'pending' && styles.statChipActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.statChipValue, styles.pendingValue, filter === 'pending' && styles.statChipValueActive]}>{stats.pending}</Text>
              <Text style={[styles.statChipLabel, filter === 'pending' && styles.statChipLabelActive]}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statChip, filter === 'completed' && styles.statChipActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.statChipValue, styles.completedValue, filter === 'completed' && styles.statChipValueActive]}>{stats.completed}</Text>
              <Text style={[styles.statChipLabel, filter === 'completed' && styles.statChipLabelActive]}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statChip, filter === 'overdue' && styles.statChipActive]}
              onPress={() => setFilter('overdue')}
            >
              <Text style={[styles.statChipValue, styles.overdueValue, filter === 'overdue' && styles.statChipValueActive]}>{stats.overdue}</Text>
              <Text style={[styles.statChipLabel, filter === 'overdue' && styles.statChipLabelActive]}>Overdue</Text>
            </TouchableOpacity>
          </View>
        )}
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
        color="#ffffff"
        onPress={() => navigation.navigate('AddTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8'
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
  headerSection: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  searchBar: {
    flex: 1,
    height: 42,
    elevation: 0,
    backgroundColor: '#f5f6f8',
    borderRadius: 21
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    paddingVertical: 0
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  syncIconButton: {
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#f5f6f8'
  },
  sortIconButton: {
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#f5f6f8'
  },
  statsChipsContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  statChip: {
    flex: 1,
    backgroundColor: '#f5f6f8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  statChipActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  statChipValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 2
  },
  statChipValueActive: {
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
  statChipLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  },
  statChipLabelActive: {
    color: '#1976d2',
    fontWeight: '600'
  },
  tasksList: {
    flex: 1,
    paddingTop: 8
  },
  taskItem: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxContainer: {
    marginRight: 14
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#bdbdbd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  checkboxCompleted: {
    backgroundColor: '#66bb6a',
    borderColor: '#66bb6a'
  },
  taskContent: {
    flex: 1,
    marginRight: 12
  },
  taskName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 4,
    lineHeight: 20
  },
  completedText: {
    color: '#9e9e9e',
    textDecorationLine: 'line-through'
  },
  dueDateText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2
  },
  completedDueDate: {
    color: '#bdbdbd',
    textDecorationLine: 'line-through'
  },
  overdueText: {
    color: '#e53935',
    fontWeight: '500'
  },
  taskRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  integrationIcon: {
    marginRight: 2
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff'
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
    right: 20,
    bottom: 20,
    backgroundColor: '#8bc34a',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  bottomSpacer: {
    height: 80
  }
});
