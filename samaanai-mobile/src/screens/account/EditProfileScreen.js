import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, ActivityIndicator, HelperText, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const InputField = ({ label, value, onChangeText, icon, error, ...props }) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputIconContainer}>
        <MaterialCommunityIcons name={icon} size={20} color="#9e9e9e" />
      </View>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        mode="flat"
        style={styles.input}
        underlineColor="transparent"
        activeUnderlineColor="#1976d2"
        error={!!error}
        {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {formData.username ? formData.username.substring(0, 2).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Update your personal information</Text>
        </View>

        {/* Form */}
        <Surface style={styles.formCard} elevation={1}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Username *</Text>
            <View style={[styles.inputBox, errors.username && styles.inputBoxError]}>
              <MaterialCommunityIcons name="account" size={20} color="#9e9e9e" style={styles.inputIcon} />
              <TextInput
                value={formData.username}
                onChangeText={(value) => setFormData({ ...formData, username: value })}
                style={styles.textInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholder="Enter username"
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
              <MaterialCommunityIcons name="email" size={20} color="#9e9e9e" style={styles.inputIcon} />
              <TextInput
                value={formData.email}
                onChangeText={(value) => setFormData({ ...formData, email: value })}
                style={styles.textInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="badge-account" size={20} color="#9e9e9e" style={styles.inputIcon} />
              <TextInput
                value={formData.firstName}
                onChangeText={(value) => setFormData({ ...formData, firstName: value })}
                style={styles.textInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholder="Enter first name"
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="badge-account-outline" size={20} color="#9e9e9e" style={styles.inputIcon} />
              <TextInput
                value={formData.lastName}
                onChangeText={(value) => setFormData({ ...formData, lastName: value })}
                style={styles.textInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholder="Enter last name"
              />
            </View>
          </View>
        </Surface>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9e9e9e'
  },
  // Form
  formCard: {
    margin: 16,
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 20
  },
  inputWrapper: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
    marginBottom: 8,
    marginLeft: 4
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6f8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12
  },
  inputBoxError: {
    borderColor: '#d32f2f'
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    height: 48
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
    marginLeft: 4
  },
  // Buttons
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#43a047',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575'
  },
  bottomSpacer: {
    height: 40
  }
});
