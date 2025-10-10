import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, HelperText, IconButton, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { format } from 'date-fns';

export default function AddEditTaskScreen({ route, navigation }) {
  const { task } = route.params || {};
  const isEdit = !!task;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    dueDate: task?.dueDate || '',
    reminderType: task?.reminderType || '',
    imageUrl: task?.imageUrl || ''
  });
  const [errors, setErrors] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    task?.dueDate ? new Date(task.dueDate) : new Date()
  );
  const [selectedImage, setSelectedImage] = useState(task?.imageUrl || null);

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
  };

  const takePhoto = async () => {
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
  };

  const removeImage = () => {
    setSelectedImage(null);
    setFormData({ ...formData, imageUrl: '' });
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
        <View style={styles.headerSpacer} />
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
              <TextInput
                mode="outlined"
                value={formData.dueDate}
                onChangeText={(value) => setFormData({ ...formData, dueDate: value })}
                placeholder="YYYY-MM-DD"
                style={styles.input}
                right={
                  formData.dueDate ? (
                    <TextInput.Icon
                      icon="close"
                      onPress={() => setFormData({ ...formData, dueDate: '' })}
                    />
                  ) : null
                }
              />
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

            <Text style={styles.label}>Image</Text>
            <View style={styles.imageButtonsContainer}>
              <Button
                mode="outlined"
                onPress={takePhoto}
                style={styles.imageButton}
                icon="camera"
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                onPress={pickImageFromGallery}
                style={styles.imageButton}
                icon="image"
              >
                Choose from Gallery
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
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  imageButton: {
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
  submitButton: {
    marginTop: 24
  }
});
