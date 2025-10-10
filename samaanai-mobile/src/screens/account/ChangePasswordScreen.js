import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, HelperText } from 'react-native-paper';
import { api } from '../../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validate = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await api.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Change password error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Change Password</Text>

          <TextInput
            label="Current Password *"
            value={formData.currentPassword}
            onChangeText={(value) => setFormData({ ...formData, currentPassword: value })}
            mode="outlined"
            secureTextEntry={!showPasswords.current}
            autoCapitalize="none"
            style={styles.input}
            error={!!errors.currentPassword}
            right={
              <TextInput.Icon
                icon={showPasswords.current ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              />
            }
          />
          {errors.currentPassword && <HelperText type="error">{errors.currentPassword}</HelperText>}

          <TextInput
            label="New Password *"
            value={formData.newPassword}
            onChangeText={(value) => setFormData({ ...formData, newPassword: value })}
            mode="outlined"
            secureTextEntry={!showPasswords.new}
            autoCapitalize="none"
            style={styles.input}
            error={!!errors.newPassword}
            right={
              <TextInput.Icon
                icon={showPasswords.new ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              />
            }
          />
          {errors.newPassword && <HelperText type="error">{errors.newPassword}</HelperText>}

          <TextInput
            label="Confirm New Password *"
            value={formData.confirmPassword}
            onChangeText={(value) => setFormData({ ...formData, confirmPassword: value })}
            mode="outlined"
            secureTextEntry={!showPasswords.confirm}
            autoCapitalize="none"
            style={styles.input}
            error={!!errors.confirmPassword}
            right={
              <TextInput.Icon
                icon={showPasswords.confirm ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              />
            }
          />
          {errors.confirmPassword && <HelperText type="error">{errors.confirmPassword}</HelperText>}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? 'Changing Password...' : 'Change Password'}
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
