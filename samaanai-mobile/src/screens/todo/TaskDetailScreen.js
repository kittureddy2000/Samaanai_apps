import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Linking, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Refresh task data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      fetchTask();
    }, [taskId])
  );

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
      setToggling(true);
      await api.toggleTaskCompletion(taskId);
      // Navigate back to task dashboard after marking complete
      navigation.goBack();
    } catch (err) {
      console.error('Toggle task error:', err);
      Alert.alert('Error', 'Failed to update task');
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this task?');
      if (confirmed) {
        try {
          await api.deleteTask(taskId);
          navigation.goBack();
        } catch (err) {
          console.error('Delete task error:', err);
          window.alert('Failed to delete task');
        }
      }
    } else {
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
    }
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
        if (url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = url;
          link.download = getFileName(url);
          link.click();
        } else {
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
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>{error || 'Task not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  const DetailRow = ({ icon, iconColor, label, value, valueStyle }) => (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconCircle, { backgroundColor: iconColor + '15' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              task.completed ? styles.statusCompleted : (isOverdue ? styles.statusOverdue : styles.statusPending)
            ]}>
              <MaterialCommunityIcons
                name={task.completed ? 'check-circle' : (isOverdue ? 'alert-circle' : 'clock-outline')}
                size={16}
                color="#fff"
              />
              <Text style={styles.statusText}>
                {task.completed ? 'Completed' : (isOverdue ? 'Overdue' : 'Pending')}
              </Text>
            </View>
          </View>

          {/* Task Name */}
          <Text style={styles.taskName}>{task.name}</Text>

          {/* Description */}
          {task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Surface style={styles.detailsCard} elevation={1}>
            {task.dueDate && (
              <DetailRow
                icon="calendar"
                iconColor={isOverdue ? '#d32f2f' : '#ff9800'}
                label="Due Date"
                value={format(new Date(task.dueDate), 'MMMM dd, yyyy')}
                valueStyle={isOverdue && styles.overdueValue}
              />
            )}
            {task.reminderType && (
              <DetailRow
                icon="bell"
                iconColor="#7b1fa2"
                label="Reminder"
                value={task.reminderType}
              />
            )}
            <DetailRow
              icon="clock-outline"
              iconColor="#1976d2"
              label="Created"
              value={format(new Date(task.createdAt), 'MMM dd, yyyy h:mm a')}
            />
            {task.completedAt && (
              <DetailRow
                icon="check-circle"
                iconColor="#43a047"
                label="Completed"
                value={format(new Date(task.completedAt), 'MMM dd, yyyy h:mm a')}
              />
            )}
          </Surface>
        </View>

        {/* Attachments Section */}
        {task.imageUrl && (() => {
          let attachments = [];
          try {
            const parsed = JSON.parse(task.imageUrl);
            if (Array.isArray(parsed)) {
              attachments = parsed;
            } else if (parsed && typeof parsed === 'object') {
              // Handle single object format
              attachments = [parsed];
            }
          } catch (e) {
            // Not JSON, treat as direct URL
            attachments = [{ name: getFileName(task.imageUrl), url: task.imageUrl }];
          }

          // Filter out empty/invalid attachments
          attachments = attachments.filter(att => att && (att.url || att.name || att.title || att.resourceName));

          if (attachments.length === 0) {
            return null;
          }

          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Attachments ({attachments.length})
              </Text>
              <Surface style={styles.detailsCard} elevation={1}>
                {attachments.map((attachment, index) => {
                  // Get display name from various possible fields
                  const displayName = attachment.name || attachment.title || attachment.resourceName || getFileName(attachment.url) || 'Attachment';

                  // Get URL from various possible fields
                  const fileUrl = attachment.url || attachment.fileUrl || attachment.driveItem?.resourceName;

                  if (fileUrl && typeof fileUrl === 'string' && fileUrl.length > 0) {
                    return isImageFile(fileUrl) ? (
                      <View key={index} style={styles.imageContainer}>
                        <Image
                          source={{ uri: fileUrl }}
                          style={styles.taskImage}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        key={index}
                        style={styles.fileAttachment}
                        onPress={() => handleOpenFile(fileUrl)}
                      >
                        <View style={[styles.fileIconCircle, { backgroundColor: '#e3f2fd' }]}>
                          <MaterialCommunityIcons
                            name={getFileIcon(fileUrl)}
                            size={24}
                            color="#1976d2"
                          />
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Text style={styles.fileAction}>Tap to open</Text>
                        </View>
                        <MaterialCommunityIcons name="open-in-new" size={20} color="#9e9e9e" />
                      </TouchableOpacity>
                    );
                  }

                  // No URL - show as external reference (Google Tasks or Microsoft To Do)
                  const isGoogleTask = attachment.driveItem || attachment.resourceName || task.googleTaskId;
                  return (
                    <View key={index} style={styles.fileAttachment}>
                      <View style={[styles.fileIconCircle, { backgroundColor: isGoogleTask ? '#e8f5e9' : '#f5f5f5' }]}>
                        <MaterialCommunityIcons
                          name={getFileIcon(displayName)}
                          size={24}
                          color={isGoogleTask ? '#4caf50' : '#9e9e9e'}
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>{displayName}</Text>
                        <Text style={[styles.msNote, isGoogleTask && { color: '#4caf50' }]}>
                          {isGoogleTask ? 'Available in Google Tasks' : 'Available in Microsoft To Do'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={isGoogleTask ? 'google' : 'microsoft'}
                        size={20}
                        color={isGoogleTask ? '#4285F4' : '#00A4EF'}
                      />
                    </View>
                  );
                })}
              </Surface>
            </View>
          );
        })()}

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {/* Mark Complete Button */}
          <TouchableOpacity
            style={[
              styles.completeButton,
              task.completed ? styles.incompleteButton : styles.markCompleteButton,
              toggling && styles.buttonDisabled
            ]}
            onPress={handleToggleCompletion}
            disabled={toggling}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={task.completed ? 'checkbox-blank-outline' : 'checkbox-marked-circle'}
              size={22}
              color="#fff"
            />
            <Text style={styles.completeButtonText}>
              {toggling ? 'Updating...' : (task.completed ? 'Mark as Incomplete' : 'Mark as Complete')}
            </Text>
          </TouchableOpacity>

          {/* Edit and Delete */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditTask', { task })}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#1976d2" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#d32f2f" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8'
  },
  scrollView: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f6f8'
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
    marginTop: 12,
    marginBottom: 16
  },
  backButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  // Header Section
  headerSection: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusCompleted: {
    backgroundColor: '#43a047'
  },
  statusPending: {
    backgroundColor: '#ff9800'
  },
  statusOverdue: {
    backgroundColor: '#d32f2f'
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6
  },
  taskName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8
  },
  taskDescription: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 22
  },
  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  detailContent: {
    flex: 1
  },
  detailLabel: {
    fontSize: 12,
    color: '#9e9e9e',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121'
  },
  overdueValue: {
    color: '#d32f2f',
    fontWeight: '600'
  },
  // Attachments
  imageContainer: {
    padding: 12
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 12
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  fileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2
  },
  fileAction: {
    fontSize: 12,
    color: '#1976d2'
  },
  msNote: {
    fontSize: 12,
    color: '#00A4EF',
    fontStyle: 'italic'
  },
  // Actions
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12
  },
  markCompleteButton: {
    backgroundColor: '#43a047',
    shadowColor: '#43a047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  incompleteButton: {
    backgroundColor: '#ff9800',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.7
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1976d2'
  },
  editButtonText: {
    color: '#1976d2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ffcdd2'
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8
  },
  bottomSpacer: {
    height: 40
  }
});
