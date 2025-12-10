import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, FAB, Menu, Button, Chip, Searchbar, IconButton, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../services/api';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TodoScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTasks, setAllTasks] = useState([]); // Store all tasks from API
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'overdue', 'dueThisWeek', 'pending' - Default to pending
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

  // Helper to check if date is within this week
  const isWithinWeek = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return date >= today && date <= weekFromNow;
  };

  // Calculate stats for new filters
  const filterStats = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && !t.completed).length;
    const dueThisWeek = allTasks.filter(t => {
      if (!t.dueDate || t.completed) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= weekFromNow;
    }).length;
    const pending = allTasks.filter(t => !t.completed).length;
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;

    // Today's tasks
    const dueToday = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length;

    const completedToday = allTasks.filter(t => {
      if (!t.dueDate || !t.completed) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { overdue, dueThisWeek, pending, completed, total, dueToday, completedToday, completionRate };
  }, [allTasks]);

  // Client-side filtering and sorting using useMemo to prevent re-fetching
  const tasks = useMemo(() => {
    let filteredTasks = [...allTasks];
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    // Apply filter
    if (filter === 'pending') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (filter === 'overdue') {
      filteredTasks = filteredTasks.filter(task => {
        return task.dueDate && new Date(task.dueDate) < now && !task.completed;
      });
    } else if (filter === 'dueThisWeek') {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.dueDate || task.completed) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= now && dueDate <= weekFromNow;
      });
    }

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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      {/* Dashboard Summary */}
      <View style={styles.dashboardHeader}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Microsoft Integration Button */}
            <TouchableOpacity
              onPress={microsoftConnected ? handleSyncMicrosoft : handleConnectMicrosoft}
              disabled={microsoftSyncing}
              style={[styles.integrationButton, microsoftConnected && styles.integrationButtonConnected]}
            >
              <MaterialCommunityIcons
                name={microsoftSyncing ? "sync" : "microsoft"}
                size={18}
                color={microsoftConnected ? "#00A4EF" : "#999"}
              />
            </TouchableOpacity>
            {/* Google Integration Button */}
            <TouchableOpacity
              onPress={googleConnected ? handleSyncGoogle : handleConnectGoogle}
              disabled={googleSyncing}
              style={[styles.integrationButton, googleConnected && styles.integrationButtonConnected]}
            >
              <MaterialCommunityIcons
                name={googleSyncing ? "sync" : "google"}
                size={18}
                color={googleConnected ? "#DB4437" : "#999"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={2}>
            <View style={[styles.statIconCircle, { backgroundColor: '#e3f2fd' }]}>
              <MaterialCommunityIcons name="calendar-today" size={20} color="#1976d2" />
            </View>
            <Text style={styles.statNumber}>{filterStats.dueToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={2}>
            <View style={[styles.statIconCircle, { backgroundColor: '#fff3e0' }]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#ff9800" />
            </View>
            <Text style={styles.statNumber}>{filterStats.dueThisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={2}>
            <View style={[styles.statIconCircle, { backgroundColor: '#ffebee' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#d32f2f" />
            </View>
            <Text style={[styles.statNumber, filterStats.overdue > 0 && { color: '#d32f2f' }]}>{filterStats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={2}>
            <View style={[styles.statIconCircle, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#43a047" />
            </View>
            <Text style={[styles.statNumber, { color: '#43a047' }]}>{filterStats.completionRate}%</Text>
            <Text style={styles.statLabel}>Done</Text>
          </Surface>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
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
              onPress={() => { setSortBy('dueDate'); setSortMenuVisible(false); }}
              title="Sort by Due Date"
              leadingIcon={sortBy === 'dueDate' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setSortBy('name'); setSortMenuVisible(false); }}
              title="Sort by Name"
              leadingIcon={sortBy === 'name' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setSortBy('createdAt'); setSortMenuVisible(false); }}
              title="Sort by Created Date"
              leadingIcon={sortBy === 'createdAt' ? 'check' : undefined}
            />
          </Menu>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipsContainer}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'overdue' && styles.filterChipOverdueActive]}
            onPress={() => setFilter('overdue')}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={filter === 'overdue' ? '#fff' : '#d32f2f'}
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filter === 'overdue' && styles.filterChipTextActive]}>
              Overdue ({filterStats.overdue})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'dueThisWeek' && styles.filterChipWeekActive]}
            onPress={() => setFilter('dueThisWeek')}
          >
            <MaterialCommunityIcons
              name="calendar-week"
              size={14}
              color={filter === 'dueThisWeek' ? '#fff' : '#ff9800'}
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filter === 'dueThisWeek' && styles.filterChipTextActive]}>
              This Week ({filterStats.dueThisWeek})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'pending' && styles.filterChipPendingActive]}
            onPress={() => setFilter('pending')}
          >
            <MaterialCommunityIcons
              name="format-list-checks"
              size={14}
              color={filter === 'pending' ? '#fff' : '#1976d2'}
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
              Pending ({filterStats.pending})
            </Text>
          </TouchableOpacity>
        </View>
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
  // Dashboard Header
  dashboardHeader: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121'
  },
  dateText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121'
  },
  statLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 2,
    fontWeight: '500'
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  searchBar: {
    flex: 1,
    height: 42,
    elevation: 0,
    backgroundColor: '#fff',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    paddingVertical: 0
  },
  integrationButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  integrationButtonConnected: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0'
  },
  sortIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  // Filter chips
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0'
  },
  filterChipIcon: {
    marginRight: 3
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  filterChipOverdueActive: {
    backgroundColor: '#d32f2f',
    borderColor: '#d32f2f'
  },
  filterChipWeekActive: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800'
  },
  filterChipPendingActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2'
  },
  tasksList: {
    flex: 1,
    paddingTop: 4
  },
  taskItem: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxContainer: {
    marginRight: 14
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#d0d0d0',
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
    fontWeight: '600',
    color: '#212121',
    marginBottom: 5,
    lineHeight: 20
  },
  completedText: {
    color: '#9e9e9e',
    textDecorationLine: 'line-through',
    fontWeight: '400'
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
    fontWeight: '600'
  },
  taskRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  integrationIcon: {
    marginRight: 0
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    marginHorizontal: 12,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16
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
