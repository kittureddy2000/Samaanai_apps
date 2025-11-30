import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, HelperText, IconButton, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';
import { format, addDays, getDay } from 'date-fns';
import VoiceInputButton from '../../components/VoiceInputButton';

// Helper function to get end of current week (Sunday)
const getEndOfWeek = () => {
  const today = new Date();
  const jsDayOfWeek = getDay(today); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = jsDayOfWeek === 0 ? 0 : 7 - jsDayOfWeek;
  return addDays(today, daysUntilSunday);
};

export default function AddEditTaskScreen({ route, navigation }) {
  const { task } = route.params || {};
  const isEdit = !!task;

  // Calculate default due date (end of week) for new tasks
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
    imageUrl: task?.imageUrl || ''
  });
  const [errors, setErrors] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(defaultSelectedDate);
  const [selectedImage, setSelectedImage] = useState(task?.imageUrl || null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const reminderTypes = [
    { label: 'None', value: '' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' }
  ];

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission needed', 'Camera and photo library permissions are required to use this feature.');
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    if (Platform.OS === 'web') {
      // Web-specific image picker
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
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setFormData({ ...formData, imageUrl: imageUri });
      }
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      // Web doesn't support camera directly, use file input with capture
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
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setFormData({ ...formData, imageUrl: imageUri });
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setFormData({ ...formData, imageUrl: '' });
  };

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      // Web-specific file picker using HTML input
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
      // Mobile: Use expo-document-picker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];

          // Check if the picked file is an image
          const isImage = file.mimeType?.startsWith('image/');

          if (isImage) {
            // If it's an image, show it as image preview
            setSelectedImage(file.uri);
            setFormData({ ...formData, imageUrl: file.uri });
          } else {
            // Otherwise, show as document
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
        console.error('Error picking document:', err);
        Alert.alert('Error', 'Failed to pick document. Please try again.');
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
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word-box';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel-box';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint-box';
    if (mimeType.includes('text')) return 'file-document-outline';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip-box';

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

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVoiceCommand = (parsedCommand, transcript) => {
    if (parsedCommand.type === 'task') {
      // Populate form with voice command data
      setFormData({
        ...formData,
        name: parsedCommand.name || formData.name,
        description: parsedCommand.description || formData.description,
        dueDate: parsedCommand.dueDate || formData.dueDate,
        reminderType: parsedCommand.reminderType || formData.reminderType
      });

      // Update selected date if due date was parsed
      if (parsedCommand.dueDate) {
        setSelectedDate(new Date(parsedCommand.dueDate));
      }
    }
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
        imageUrl: formData.imageUrl.trim() || null
      };

      if (isEdit) {
        await api.updateTask(task.id, taskData);
        Alert.alert('Success', 'Task updated successfully');
      } else {
        await api.createTask(taskData);
        Alert.alert('Success', 'Task created successfully');
      }

      navigation.goBack();
    } catch (err) {
      console.error('Save task error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Task' : 'Add Task'}</Text>
        <VoiceInputButton
          onCommandParsed={handleVoiceCommand}
          commandType="task"
        />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Task Name *"
              value={formData.name}
              onChangeText={(value) => setFormData({ ...formData, name: value })}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            {errors.name && <HelperText type="error">{errors.name}</HelperText>}

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(value) => setFormData({ ...formData, description: value })}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <Text style={styles.label}>Due Date</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webDatePickerContainer}>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    fontFamily: 'inherit'
                  }}
                />
                {formData.dueDate && (
                  <Button
                    mode="text"
                    onPress={() => setFormData({ ...formData, dueDate: '' })}
                    style={styles.clearButton}
                  >
                    Clear Date
                  </Button>
                )}
              </View>
            ) : (
              <>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                  icon="calendar"
                >
                  {formData.dueDate ? format(new Date(formData.dueDate), 'MMMM dd, yyyy') : 'Select Due Date'}
                </Button>
                {formData.dueDate && (
                  <Button
                    mode="text"
                    onPress={() => setFormData({ ...formData, dueDate: '' })}
                    style={styles.clearButton}
                  >
                    Clear Date
                  </Button>
                )}
                {showDatePicker && (
                  <View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                    />
                    {Platform.OS === 'ios' && (
                      <Button
                        mode="contained"
                        onPress={closeDatePicker}
                        style={styles.datePickerButton}
                      >
                        Done
                      </Button>
                    )}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Reminder Type</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  style={styles.menuButton}
                  contentStyle={styles.menuButtonContent}
                >
                  {reminderTypes.find(r => r.value === formData.reminderType)?.label || 'Select Reminder'}
                </Button>
              }
            >
              {reminderTypes.map((type) => (
                <Menu.Item
                  key={type.value}
                  onPress={() => {
                    setFormData({ ...formData, reminderType: type.value });
                    setMenuVisible(false);
                  }}
                  title={type.label}
                />
              ))}
            </Menu>

            <Text style={styles.label}>Attachments</Text>
            <View style={styles.attachmentButtonsContainer}>
              <Button
                mode="outlined"
                onPress={takePhoto}
                style={styles.attachmentButton}
                icon="camera"
              >
                Camera
              </Button>
              <Button
                mode="outlined"
                onPress={pickImageFromGallery}
                style={styles.attachmentButton}
                icon="image"
              >
                Photo
              </Button>
              <Button
                mode="outlined"
                onPress={pickDocument}
                style={styles.attachmentButton}
                icon="file-document"
              >
                File
              </Button>
            </View>

            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <IconButton
                  icon="close-circle"
                  size={30}
                  style={styles.removeImageButton}
                  onPress={removeImage}
                />
              </View>
            )}

            {selectedDocument && (
              <View style={styles.documentPreviewContainer}>
                <View style={styles.documentInfo}>
                  <MaterialCommunityIcons
                    name={getFileIcon(selectedDocument.mimeType)}
                    size={40}
                    color="#1976d2"
                  />
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {selectedDocument.name}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formatFileSize(selectedDocument.size)}
                    </Text>
                  </View>
                  <IconButton
                    icon="close-circle"
                    size={24}
                    onPress={removeDocument}
                  />
                </View>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
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
    textAlign: 'center',
    marginRight: 40
  },
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    margin: 16
  },
  input: {
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 8
  },
  webDatePickerContainer: {
    marginBottom: 8
  },
  menuButton: {
    marginBottom: 16
  },
  menuButtonContent: {
    justifyContent: 'flex-start'
  },
  dateButton: {
    marginBottom: 8
  },
  clearButton: {
    marginBottom: 16
  },
  datePickerButton: {
    marginTop: 8,
    marginBottom: 16
  },
  attachmentButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  attachmentButton: {
    flex: 1
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0'
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 15
  },
  documentPreviewContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9'
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  documentDetails: {
    flex: 1
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  documentSize: {
    fontSize: 12,
    color: '#666'
  },
  submitButton: {
    marginTop: 24
  }
});
