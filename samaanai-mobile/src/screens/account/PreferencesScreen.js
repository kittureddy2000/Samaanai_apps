import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, List, Switch, Divider } from 'react-native-paper';
import { api } from '../../services/api';

export default function PreferencesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    emailNotifications: true,
    weeklyReports: true
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
