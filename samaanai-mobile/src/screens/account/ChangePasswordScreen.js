import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, HelperText, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-reset" size={40} color="#7b1fa2" />
        </View>
        <Text style={styles.headerTitle}>Change Password</Text>
        <Text style={styles.headerSubtitle}>Enter your current password and choose a new one</Text>
      </View>

      {/* Form Section */}
      <View style={styles.section}>
        <Surface style={styles.formCard} elevation={1}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              value={formData.currentPassword}
              onChangeText={(value) => setFormData({ ...formData, currentPassword: value })}
              mode="outlined"
              secureTextEntry={!showPasswords.current}
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              error={!!errors.currentPassword}
              placeholder="Enter current password"
              right={
                <TextInput.Icon
                  icon={showPasswords.current ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  color="#9e9e9e"
                />
              }
            />
            {errors.currentPassword && <HelperText type="error" style={styles.errorText}>{errors.currentPassword}</HelperText>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              value={formData.newPassword}
              onChangeText={(value) => setFormData({ ...formData, newPassword: value })}
              mode="outlined"
              secureTextEntry={!showPasswords.new}
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              error={!!errors.newPassword}
              placeholder="Enter new password"
              right={
                <TextInput.Icon
                  icon={showPasswords.new ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  color="#9e9e9e"
                />
              }
            />
            {errors.newPassword && <HelperText type="error" style={styles.errorText}>{errors.newPassword}</HelperText>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              value={formData.confirmPassword}
              onChangeText={(value) => setFormData({ ...formData, confirmPassword: value })}
              mode="outlined"
              secureTextEntry={!showPasswords.confirm}
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              error={!!errors.confirmPassword}
              placeholder="Confirm new password"
              right={
                <TextInput.Icon
                  icon={showPasswords.confirm ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  color="#9e9e9e"
                />
              }
            />
            {errors.confirmPassword && <HelperText type="error" style={styles.errorText}>{errors.confirmPassword}</HelperText>}
          </View>
        </Surface>
      </View>

      {/* Password Requirements */}
      <View style={styles.section}>
        <Surface style={styles.infoCard} elevation={1}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#1976d2" />
            <Text style={styles.infoText}>Password must be at least 6 characters</Text>
          </View>
        </Surface>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <Text style={styles.primaryButtonText}>Changing Password...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Change Password</Text>
            </>
          )}
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
    backgroundColor: '#f3e5f5',
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
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20
  },
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 15
  },
  inputOutline: {
    borderRadius: 12,
    borderColor: '#e0e0e0'
  },
  errorText: {
    marginTop: 4,
    marginLeft: 0,
    paddingLeft: 0
  },
  // Info Card
  infoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 14
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoText: {
    fontSize: 13,
    color: '#1976d2',
    marginLeft: 10,
    flex: 1
  },
  // Buttons
  buttonSection: {
    paddingHorizontal: 16,
    marginTop: 32
  },
  primaryButton: {
    backgroundColor: '#7b1fa2',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7b1fa2',
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
