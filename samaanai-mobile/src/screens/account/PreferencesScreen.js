import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Switch, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    notificationTime: '14:30'
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
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to test push notifications.'
        );
        setTestingNotification(false);
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Samaanai. Your notifications are working!',
          data: { test: true },
        },
        trigger: { seconds: 2 },
      });

      try {
        await api.updatePreferences({ ...preferences, testEmail: true });
        Alert.alert(
          'Test Notification Sent',
          'Push notification will appear in 2 seconds.\n\nAn email has also been sent to your registered email address.'
        );
      } catch (emailErr) {
        Alert.alert(
          'Push Notification Scheduled',
          'Push notification will appear in 2 seconds.\n\nNote: Email test failed.'
        );
      }
    } catch (err) {
      console.error('Test notification error:', err);
      Alert.alert('Error', 'Failed to send test notification.');
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
      setPreferences({ ...preferences, notificationTime: `${hours}:${minutes}` });
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
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  const SettingItem = ({ icon, iconColor, title, subtitle, rightElement, onPress, showBorder = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, !showBorder && styles.settingItemNoBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIconCircle, { backgroundColor: iconColor + '15' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="cog" size={40} color="#616161" />
        </View>
        <Text style={styles.headerTitle}>Preferences</Text>
        <Text style={styles.headerSubtitle}>Customize your app experience</Text>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Surface style={styles.settingsCard} elevation={1}>
          <SettingItem
            icon="bell"
            iconColor="#1976d2"
            title="Push Notifications"
            subtitle="Receive push notifications"
            rightElement={
              <Switch
                value={preferences.notifications}
                onValueChange={() => handleToggle('notifications')}
                color="#1976d2"
              />
            }
          />
          <SettingItem
            icon="email"
            iconColor="#43a047"
            title="Email Notifications"
            subtitle="Receive email updates"
            rightElement={
              <Switch
                value={preferences.emailNotifications}
                onValueChange={() => handleToggle('emailNotifications')}
                color="#43a047"
              />
            }
          />
          <SettingItem
            icon="chart-line"
            iconColor="#ff9800"
            title="Weekly Reports"
            subtitle="Receive weekly summary emails"
            rightElement={
              <Switch
                value={preferences.weeklyReports}
                onValueChange={() => handleToggle('weeklyReports')}
                color="#ff9800"
              />
            }
          />
          <SettingItem
            icon="clock-outline"
            iconColor="#7b1fa2"
            title="Daily Notification Time"
            subtitle={`Reminders at ${formatTime(preferences.notificationTime)}`}
            onPress={() => setShowTimePicker(true)}
            rightElement={
              <MaterialCommunityIcons name="chevron-right" size={24} color="#bdbdbd" />
            }
          />
          <SettingItem
            icon="bell-check"
            iconColor="#00897b"
            title="Test Notifications"
            subtitle="Send test push and email"
            showBorder={false}
            rightElement={
              <TouchableOpacity
                style={[styles.testButton, testingNotification && styles.testButtonDisabled]}
                onPress={handleTestNotification}
                disabled={testingNotification}
              >
                <Text style={styles.testButtonText}>
                  {testingNotification ? 'Sending...' : 'Test'}
                </Text>
              </TouchableOpacity>
            }
          />
        </Surface>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={getTimeDate()}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Surface style={styles.settingsCard} elevation={1}>
          <SettingItem
            icon="theme-light-dark"
            iconColor="#616161"
            title="Dark Mode"
            subtitle="Use dark theme"
            showBorder={false}
            rightElement={
              <Switch
                value={preferences.darkMode}
                onValueChange={() => handleToggle('darkMode')}
                color="#616161"
              />
            }
          />
        </Surface>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
    padding: 24,
    backgroundColor: '#f5f6f8'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  // Header
  headerSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 32
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
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingItemNoBorder: {
    borderBottomWidth: 0
  },
  settingIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  settingContent: {
    flex: 1
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9e9e9e'
  },
  testButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  testButtonDisabled: {
    opacity: 0.7
  },
  testButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  // Buttons
  buttonSection: {
    paddingHorizontal: 16,
    marginTop: 32
  },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0'
  },
  secondaryButtonText: {
    color: '#616161',
    fontSize: 16,
    fontWeight: '600'
  },
  bottomSpacer: {
    height: 40
  }
});
