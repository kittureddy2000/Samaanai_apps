import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, List, Switch, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { api } from '../../services/api';

export default function PreferencesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    emailNotifications: true,
    weeklyReports: true,
    notificationTime: '14:30' // Default to 2:30 PM UTC
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const { data } = await api.getPreferences();
      if (data && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Fetch preferences error:', err);
      // Use default preferences if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updatePreferences(preferences);
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (err) {
      console.error('Save preferences error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestingNotification(true);

      // Test push notification
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to test push notifications.'
        );
        setTestingNotification(false);
        return;
      }

      // Schedule a test notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification 📬',
          body: 'This is a test notification from Samaanai. Your notifications are working!',
          data: { test: true },
        },
        trigger: { seconds: 2 },
      });

      // Test email notification via backend
      try {
        await api.updatePreferences({ ...preferences, testEmail: true });
        Alert.alert(
          'Test Notification Sent',
          'Push notification will appear in 2 seconds.\n\nAn email has also been sent to your registered email address.',
          [{ text: 'OK' }]
        );
      } catch (emailErr) {
        console.error('Email test error:', emailErr);
        Alert.alert(
          'Push Notification Scheduled',
          'Push notification will appear in 2 seconds.\n\nNote: Email test failed. Please check your email settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Test notification error:', err);
      Alert.alert('Error', 'Failed to send test notification. Please try again.');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setPreferences({ ...preferences, notificationTime: timeString });
    }
  };

  const getTimeDate = () => {
    if (!preferences.notificationTime) {
      const now = new Date();
      now.setHours(14, 30, 0, 0);
      return now;
    }
    const [hours, minutes] = preferences.notificationTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '2:30 PM';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Preferences</Text>
        </Card.Content>

        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          <Divider />
          <List.Item
            title="Push Notifications"
            description="Receive push notifications"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={preferences.notifications}
                onValueChange={() => handleToggle('notifications')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Email Notifications"
            description="Receive email updates"
            left={props => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={preferences.emailNotifications}
                onValueChange={() => handleToggle('emailNotifications')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Weekly Reports"
            description="Receive weekly summary emails"
            left={props => <List.Icon {...props} icon="chart-line" />}
            right={() => (
              <Switch
                value={preferences.weeklyReports}
                onValueChange={() => handleToggle('weeklyReports')}
              />
            )}
          />
          <Divider />
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <List.Item
              title="Daily Notification Time"
              description={`Receive daily reminders at ${formatTime(preferences.notificationTime)}`}
              left={props => <List.Icon {...props} icon="clock-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={getTimeDate()}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
          <Divider />
          <List.Item
            title="Test Notifications"
            description="Send test push and email notification"
            left={props => <List.Icon {...props} icon="bell-check" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={handleTestNotification}
                loading={testingNotification}
                disabled={testingNotification}
                compact
              >
                Test
              </Button>
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <Divider />
          <List.Item
            title="Dark Mode"
            description="Use dark theme"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={preferences.darkMode}
                onValueChange={() => handleToggle('darkMode')}
              />
            )}
          />
        </List.Section>

        <Card.Content>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
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
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  card: {
    margin: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 8
  },
  cancelButton: {
    marginTop: 8
  }
});
