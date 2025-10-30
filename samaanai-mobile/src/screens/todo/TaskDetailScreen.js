import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Linking, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.getTask(taskId);
      setTask(data.task);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load task');
      console.error('Task detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async () => {
    try {
      await api.toggleTaskCompletion(taskId);
      fetchTask();
    } catch (err) {
      console.error('Toggle task error:', err);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(taskId);
              navigation.goBack();
            } catch (err) {
              console.error('Delete task error:', err);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.startsWith('data:image');
  };

  const getFileIcon = (url) => {
    if (!url) return 'file-document';

    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'file-pdf-box';
    if (lowerUrl.includes('.doc') || lowerUrl.includes('.docx')) return 'file-word-box';
    if (lowerUrl.includes('.xls') || lowerUrl.includes('.xlsx')) return 'file-excel-box';
    if (lowerUrl.includes('.ppt') || lowerUrl.includes('.pptx')) return 'file-powerpoint-box';
    if (lowerUrl.includes('.txt')) return 'file-document-outline';
    if (lowerUrl.includes('.zip') || lowerUrl.includes('.rar')) return 'zip-box';

    return 'file-document';
  };

  const getFileName = (url) => {
    if (!url) return 'Attachment';
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Attachment';
  };

  const handleOpenFile = async (url) => {
    try {
      if (Platform.OS === 'web') {
        // For web, open in new tab or download
        if (url.startsWith('data:')) {
          // Data URL - download it
          const link = document.createElement('a');
          link.href = url;
          link.download = getFileName(url);
          link.click();
        } else {
          // Regular URL - open in new tab
          window.open(url, '_blank');
        }
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      }
    } catch (err) {
      console.error('Error opening file:', err);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Task not found'}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.retryButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Task Details</Text>
        <IconButton
          icon="pencil"
          size={24}
          onPress={() => navigation.navigate('EditTask', { task })}
        />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Chip
                mode="flat"
                selected
                style={[styles.statusChip, task.completed ? styles.completedChip : styles.pendingChip]}
              >
                {task.completed ? 'Completed' : 'Pending'}
              </Chip>
              {isOverdue && (
                <Chip mode="flat" selected style={styles.overdueChip}>
                  Overdue
                </Chip>
              )}
            </View>

            <Title style={styles.taskName}>{task.name}</Title>

            {task.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {task.dueDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Due Date</Text>
                <Text style={[styles.infoText, isOverdue && styles.overdueText]}>
                  {format(new Date(task.dueDate), 'MMMM dd, yyyy')}
                </Text>
              </View>
            )}

            {task.reminderType && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reminder</Text>
                <Text style={styles.infoText}>{task.reminderType}</Text>
              </View>
            )}

            {task.imageUrl && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attachment</Text>
                {isImageFile(task.imageUrl) ? (
                  <Image
                    source={{ uri: task.imageUrl }}
                    style={styles.taskImage}
                    resizeMode="cover"
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.fileAttachment}
                    onPress={() => handleOpenFile(task.imageUrl)}
                  >
                    <MaterialCommunityIcons
                      name={getFileIcon(task.imageUrl)}
                      size={48}
                      color="#1976d2"
                    />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={2}>
                        {getFileName(task.imageUrl)}
                      </Text>
                      <Text style={styles.fileAction}>Tap to open</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="open-in-new"
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Created</Text>
              <Text style={styles.infoText}>
                {format(new Date(task.createdAt), 'MMM dd, yyyy hh:mm a')}
              </Text>
            </View>

            {task.completedAt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed</Text>
                <Text style={styles.infoText}>
                  {format(new Date(task.completedAt), 'MMM dd, yyyy hh:mm a')}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleToggleCompletion}
              style={styles.actionButton}
              icon={task.completed ? 'checkbox-blank-outline' : 'checkbox-marked'}
            >
              Mark as {task.completed ? 'Incomplete' : 'Complete'}
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('EditTask', { task })}
              style={styles.actionButton}
              icon="pencil"
            >
              Edit Task
            </Button>

            <Button
              mode="outlined"
              onPress={handleDelete}
              style={styles.actionButton}
              buttonColor="#fff"
              textColor="#d32f2f"
              icon="delete"
            >
              Delete Task
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center'
  },
  content: {
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
  card: {
    margin: 16,
    marginBottom: 8
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  statusChip: {
    height: 32
  },
  completedChip: {
    backgroundColor: '#4caf50'
  },
  pendingChip: {
    backgroundColor: '#ff9800'
  },
  overdueChip: {
    backgroundColor: '#d32f2f'
  },
  taskName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24
  },
  infoText: {
    fontSize: 16,
    color: '#333'
  },
  overdueText: {
    color: '#d32f2f',
    fontWeight: '600'
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
    gap: 12
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  fileAction: {
    fontSize: 12,
    color: '#1976d2'
  },
  actionButton: {
    marginVertical: 8
  }
});
