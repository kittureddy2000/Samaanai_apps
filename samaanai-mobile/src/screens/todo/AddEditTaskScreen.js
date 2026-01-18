import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, ActivityIndicator, IconButton, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';
import { format, addDays, getDay } from 'date-fns';

const getEndOfWeek = () => {
  const today = new Date();
  const jsDayOfWeek = getDay(today);
  const daysUntilSunday = jsDayOfWeek === 0 ? 0 : 7 - jsDayOfWeek;
  return addDays(today, daysUntilSunday);
};

const REMINDER_OPTIONS = [
  { label: 'None', value: '', icon: 'bell-off-outline' },
  { label: 'Daily', value: 'daily', icon: 'calendar-today' },
  { label: 'Weekly', value: 'weekly', icon: 'calendar-week' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar-month' },
  { label: 'Yearly', value: 'yearly', icon: 'calendar-star' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low', icon: 'flag-outline', color: '#4caf50' },
  { label: 'Medium', value: 'medium', icon: 'flag', color: '#ff9800' },
  { label: 'High', value: 'high', icon: 'flag', color: '#f44336' },
  { label: 'Urgent', value: 'urgent', icon: 'flag-variant', color: '#d32f2f' },
];

export default function AddEditTaskScreen({ route, navigation }) {
  const { task } = route.params || {};
  const isEdit = !!task;

  const defaultDueDate = isEdit ? (task.dueDate || '') : format(getEndOfWeek(), 'yyyy-MM-dd');
  const defaultSelectedDate = isEdit
    ? (task?.dueDate ? new Date(task.dueDate) : new Date())
    : getEndOfWeek();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    dueDate: defaultDueDate,
    reminderType: task?.reminderType || '',
    priority: task?.priority || 'medium',
    imageUrl: task?.imageUrl || ''
  });
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(defaultSelectedDate);
  const [selectedImage, setSelectedImage] = useState(task?.imageUrl || null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && mediaStatus === 'granted';
  };

  const pickImageFromGallery = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target.result);
            setFormData({ ...formData, imageUrl: event.target.result });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Camera and photo library permissions are required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setFormData({ ...formData, imageUrl: result.assets[0].uri });
      }
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target.result);
            setFormData({ ...formData, imageUrl: event.target.result });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Camera permissions are required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setFormData({ ...formData, imageUrl: result.assets[0].uri });
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setFormData({ ...formData, imageUrl: '' });
  };

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedDocument({
              uri: event.target.result,
              name: file.name,
              size: file.size,
              mimeType: file.type
            });
            setFormData({ ...formData, imageUrl: event.target.result });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];
          const isImage = file.mimeType?.startsWith('image/');
          if (isImage) {
            setSelectedImage(file.uri);
            setFormData({ ...formData, imageUrl: file.uri });
          } else {
            setSelectedDocument({
              uri: file.uri,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType
            });
            setFormData({ ...formData, imageUrl: file.uri });
          }
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to pick document.');
      }
    }
  };

  const removeDocument = () => {
    setSelectedDocument(null);
    if (!selectedImage) {
      setFormData({ ...formData, imageUrl: '' });
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'file-document';
    if (mimeType.includes('pdf')) return 'file-pdf-box';
    if (mimeType.includes('word')) return 'file-word-box';
    if (mimeType.includes('excel')) return 'file-excel-box';
    if (mimeType.includes('powerpoint')) return 'file-powerpoint-box';
    if (mimeType.includes('text')) return 'file-document-outline';
    if (mimeType.includes('zip')) return 'zip-box';
    return 'file-document';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setFormData({ ...formData, dueDate: format(date, 'yyyy-MM-dd') });
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        dueDate: formData.dueDate || null,
        reminderType: formData.reminderType || null,
        priority: formData.priority || 'medium',
        imageUrl: formData.imageUrl.trim() || null
      };

      if (isEdit) {
        await api.updateTask(task.id, taskData);
      } else {
        await api.createTask(taskData);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const selectedReminder = REMINDER_OPTIONS.find(r => r.value === formData.reminderType) || REMINDER_OPTIONS[0];
  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === formData.priority) || PRIORITY_OPTIONS[1];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Task' : 'New Task'}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Name Input */}
        <View style={styles.inputSection}>
          <TextInput
            placeholder="What needs to be done?"
            value={formData.name}
            onChangeText={(value) => setFormData({ ...formData, name: value })}
            style={styles.titleInput}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="#2196f3"
            error={!!errors.name}
            placeholderTextColor="#999"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <TextInput
            placeholder="Add notes..."
            value={formData.description}
            onChangeText={(value) => setFormData({ ...formData, description: value })}
            style={styles.descriptionInput}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="#2196f3"
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>

        {/* Quick Options Row */}
        <View style={styles.optionsRow}>
          {/* Due Date */}
          <TouchableOpacity
            style={[styles.optionChip, formData.dueDate && styles.optionChipActive]}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={18}
              color={formData.dueDate ? '#2196f3' : '#666'}
            />
            <Text style={[styles.optionText, formData.dueDate && styles.optionTextActive]}>
              {formData.dueDate ? format(new Date(formData.dueDate), 'MMM d') : 'Due date'}
            </Text>
            {formData.dueDate && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setFormData({ ...formData, dueDate: '' });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Reminder */}
          <TouchableOpacity
            style={[styles.optionChip, formData.reminderType && styles.optionChipActive]}
            onPress={() => setShowReminderOptions(!showReminderOptions)}
          >
            <MaterialCommunityIcons
              name={selectedReminder.icon}
              size={18}
              color={formData.reminderType ? '#2196f3' : '#666'}
            />
            <Text style={[styles.optionText, formData.reminderType && styles.optionTextActive]}>
              {formData.reminderType ? selectedReminder.label : 'Remind'}
            </Text>
          </TouchableOpacity>

          {/* Priority */}
          <TouchableOpacity
            style={[styles.optionChip, styles.optionChipActive]}
            onPress={() => setShowPriorityOptions(!showPriorityOptions)}
          >
            <MaterialCommunityIcons
              name={selectedPriority.icon}
              size={18}
              color={selectedPriority.color}
            />
            <Text style={[styles.optionText, styles.optionTextActive, { color: selectedPriority.color }]}>
              {selectedPriority.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reminder Options Dropdown */}
        {showReminderOptions && (
          <View style={styles.reminderDropdown}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderOption,
                  formData.reminderType === option.value && styles.reminderOptionActive
                ]}
                onPress={() => {
                  setFormData({ ...formData, reminderType: option.value });
                  setShowReminderOptions(false);
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={formData.reminderType === option.value ? '#2196f3' : '#666'}
                />
                <Text style={[
                  styles.reminderOptionText,
                  formData.reminderType === option.value && styles.reminderOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {formData.reminderType === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color="#2196f3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Priority Options Dropdown */}
        {showPriorityOptions && (
          <View style={styles.reminderDropdown}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderOption,
                  formData.priority === option.value && styles.reminderOptionActive
                ]}
                onPress={() => {
                  setFormData({ ...formData, priority: option.value });
                  setShowPriorityOptions(false);
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={option.color}
                />
                <Text style={[
                  styles.reminderOptionText,
                  formData.priority === option.value && { color: option.color, fontWeight: '500' }
                ]}>
                  {option.label}
                </Text>
                {formData.priority === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color={option.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Date Picker */}
        {showDatePicker && Platform.OS !== 'web' && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {Platform.OS === 'web' && showDatePicker && (
          <View style={styles.webDatePickerContainer}>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => {
                setFormData({ ...formData, dueDate: e.target.value });
                setShowDatePicker(false);
              }}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#fff',
              }}
            />
          </View>
        )}

        {/* Attachments Section */}
        <View style={styles.attachmentsSection}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachButton} onPress={takePhoto}>
              <MaterialCommunityIcons name="camera" size={22} color="#666" />
              <Text style={styles.attachButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={pickImageFromGallery}>
              <MaterialCommunityIcons name="image" size={22} color="#666" />
              <Text style={styles.attachButtonText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
              <MaterialCommunityIcons name="file-document" size={22} color="#666" />
              <Text style={styles.attachButtonText}>File</Text>
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeAttachment} onPress={removeImage}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Document Preview */}
          {selectedDocument && (
            <View style={styles.documentPreview}>
              <MaterialCommunityIcons
                name={getFileIcon(selectedDocument.mimeType)}
                size={32}
                color="#2196f3"
              />
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={1}>
                  {selectedDocument.name}
                </Text>
                <Text style={styles.documentSize}>
                  {formatFileSize(selectedDocument.size)}
                </Text>
              </View>
              <TouchableOpacity onPress={removeDocument}>
                <MaterialCommunityIcons name="close-circle" size={22} color="#999" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isEdit ? 'Update Task' : 'Create Task'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 48,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputSection: {
    marginTop: 16,
  },
  titleInput: {
    backgroundColor: '#f8f9fa',
    fontSize: 18,
    fontWeight: '500',
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  descriptionInput: {
    backgroundColor: '#f8f9fa',
    fontSize: 15,
    borderRadius: 12,
    minHeight: 80,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  optionChipActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#2196f3',
  },
  reminderDropdown: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  reminderOptionActive: {
    backgroundColor: '#f0f7ff',
  },
  reminderOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  reminderOptionTextActive: {
    color: '#2196f3',
    fontWeight: '500',
  },
  datePickerContainer: {
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  datePickerDoneText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '600',
  },
  webDatePickerContainer: {
    marginTop: 12,
  },
  attachmentsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderStyle: 'dashed',
  },
  attachButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  imagePreview: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  removeAttachment: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  documentPreview: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
