import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, HelperText } from 'react-native-paper';
import { api } from '../../services/api';

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.getProfile();
      setProfile(data);
      setFormData({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        username: data.username || ''
      });
    } catch (err) {
      console.error('Fetch profile error:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const updateData = {
        firstName: formData.firstName.trim() || null,
        lastName: formData.lastName.trim() || null,
        email: formData.email.trim(),
        username: formData.username.trim()
      };

      await api.updateProfile(updateData);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (err) {
      console.error('Update profile error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Edit Profile</Text>

          <TextInput
            label="Username *"
            value={formData.username}
            onChangeText={(value) => setFormData({ ...formData, username: value })}
            mode="outlined"
            style={styles.input}
            error={!!errors.username}
          />
          {errors.username && <HelperText type="error">{errors.username}</HelperText>}

          <TextInput
            label="Email *"
            value={formData.email}
            onChangeText={(value) => setFormData({ ...formData, email: value })}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            error={!!errors.email}
          />
          {errors.email && <HelperText type="error">{errors.email}</HelperText>}

          <TextInput
            label="First Name"
            value={formData.firstName}
            onChangeText={(value) => setFormData({ ...formData, firstName: value })}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Last Name"
            value={formData.lastName}
            onChangeText={(value) => setFormData({ ...formData, lastName: value })}
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
    marginBottom: 24,
    color: '#333'
  },
  input: {
    marginBottom: 8
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 8
  },
  cancelButton: {
    marginTop: 8
  }
});
