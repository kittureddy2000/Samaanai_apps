import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text, ActivityIndicator, Avatar, Portal, Dialog, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { logout, user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [disconnectMicrosoftDialogVisible, setDisconnectMicrosoftDialogVisible] = useState(false);
  const [disconnectGoogleDialogVisible, setDisconnectGoogleDialogVisible] = useState(false);

  // Integration states
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingIntegrations, setCheckingIntegrations] = useState(false);

  const fetchProfile = async () => {
    try {
      setError(null);
      const { data } = await api.getProfile();
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIntegrationStatus = async () => {
    try {
      setCheckingIntegrations(true);
      const [microsoftStatus, googleStatus] = await Promise.all([
        api.getMicrosoftStatus().catch(() => ({ data: { connected: false } })),
        api.getGoogleStatus().catch(() => ({ data: { connected: false } }))
      ]);
      setMicrosoftConnected(microsoftStatus.data.connected);
      setGoogleConnected(googleStatus.data.connected);
    } catch (err) {
      console.error('Integration status error:', err);
    } finally {
      setCheckingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    checkIntegrationStatus();
  }, []);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      setLogoutDialogVisible(true);
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: () => logout() }
        ]
      );
    }
  };

  const confirmLogout = () => {
    setLogoutDialogVisible(false);
    logout();
  };

  const handleConnectMicrosoft = async () => {
    try {
      const { data } = await api.connectMicrosoft();
      await WebBrowser.openBrowserAsync(data.authorizationUrl);
      setTimeout(() => checkIntegrationStatus(), 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to connect Microsoft To Do');
      console.error(err);
    }
  };

  const handleDisconnectMicrosoft = async () => {
    if (Platform.OS === 'web') {
      setDisconnectMicrosoftDialogVisible(true);
    } else {
      Alert.alert(
        'Disconnect Microsoft To Do',
        'Are you sure you want to disconnect Microsoft To Do? Your tasks will remain in Samaanai.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.disconnectMicrosoft();
                setMicrosoftConnected(false);
                Alert.alert('Success', 'Microsoft To Do disconnected');
              } catch (err) {
                Alert.alert('Error', 'Failed to disconnect Microsoft To Do');
              }
            }
          }
        ]
      );
    }
  };

  const confirmDisconnectMicrosoft = async () => {
    setDisconnectMicrosoftDialogVisible(false);
    try {
      await api.disconnectMicrosoft();
      setMicrosoftConnected(false);
      Alert.alert('Success', 'Microsoft To Do disconnected');
    } catch (err) {
      Alert.alert('Error', 'Failed to disconnect Microsoft To Do');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data } = await api.connectGoogle();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        setTimeout(() => checkIntegrationStatus(), 2000);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect Google Tasks');
      console.error(err);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (Platform.OS === 'web') {
      setDisconnectGoogleDialogVisible(true);
    } else {
      Alert.alert(
        'Disconnect Google Tasks',
        'Are you sure you want to disconnect Google Tasks? Your tasks will remain in Samaanai.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.disconnectGoogle();
                setGoogleConnected(false);
                Alert.alert('Success', 'Google Tasks disconnected');
              } catch (err) {
                Alert.alert('Error', 'Failed to disconnect Google Tasks');
              }
            }
          }
        ]
      );
    }
  };

  const confirmDisconnectGoogle = async () => {
    setDisconnectGoogleDialogVisible(false);
    try {
      await api.disconnectGoogle();
      setGoogleConnected(false);
      Alert.alert('Success', 'Google Tasks disconnected');
    } catch (err) {
      Alert.alert('Error', 'Failed to disconnect Google Tasks');
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

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { email, created_at } = profile || {};
  const initials = email ? email.substring(0, 2).toUpperCase() : 'U';
  const memberSince = created_at ? new Date(created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  }) : 'Unknown';

  const MenuItem = ({ icon, iconColor, title, subtitle, onPress, rightElement, showBorder = true }) => (
    <TouchableOpacity style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconCircle, { backgroundColor: iconColor + '15' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#bdbdbd" />
      )}
    </TouchableOpacity>
  );

  const IntegrationButton = ({ connected, onPress }) => (
    <TouchableOpacity
      style={[styles.integrationBtn, connected && styles.integrationBtnConnected]}
      onPress={onPress}
    >
      <Text style={[styles.integrationBtnText, connected && styles.integrationBtnTextConnected]}>
        {connected ? 'Disconnect' : 'Connect'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          <Avatar.Text size={90} label={initials} style={styles.avatar} labelStyle={styles.avatarLabel} />
          <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('EditProfile')}>
            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.memberBadge}>
          <MaterialCommunityIcons name="calendar-check" size={14} color="#8bc34a" />
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem
            icon="account-edit"
            iconColor="#1976d2"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="lock-reset"
            iconColor="#7b1fa2"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            icon="cog"
            iconColor="#616161"
            title="Preferences"
            subtitle="Manage your app preferences"
            onPress={() => navigation.navigate('Preferences')}
            showBorder={false}
          />
        </Surface>
      </View>

      {/* Nutrition Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem
            icon="target"
            iconColor="#ff9800"
            title="Daily Goals"
            subtitle="Set your calorie and macro goals"
            onPress={() => navigation.navigate('Nutrition', { screen: 'Goals' })}
            showBorder={false}
          />
        </Surface>
      </View>

      {/* Integrations Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem
            icon="microsoft"
            iconColor="#00A4EF"
            title="Microsoft To Do"
            subtitle={microsoftConnected ? 'Connected' : 'Not connected'}
            onPress={microsoftConnected ? handleDisconnectMicrosoft : handleConnectMicrosoft}
            rightElement={<IntegrationButton connected={microsoftConnected} onPress={microsoftConnected ? handleDisconnectMicrosoft : handleConnectMicrosoft} />}
          />
          <MenuItem
            icon="google"
            iconColor="#DB4437"
            title="Google Tasks"
            subtitle={googleConnected ? 'Connected' : 'Not connected'}
            onPress={googleConnected ? handleDisconnectGoogle : handleConnectGoogle}
            rightElement={<IntegrationButton connected={googleConnected} onPress={googleConnected ? handleDisconnectGoogle : handleConnectGoogle} />}
            showBorder={false}
          />
        </Surface>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem
            icon="help-circle"
            iconColor="#1976d2"
            title="Help & Support"
            subtitle="Get help with Samaanai"
            onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon')}
          />
          <MenuItem
            icon="shield-check"
            iconColor="#43a047"
            title="Privacy Policy"
            subtitle="View our privacy policy"
            onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be available soon')}
          />
          <MenuItem
            icon="file-document"
            iconColor="#ff9800"
            title="Terms of Service"
            subtitle="View terms of service"
            onPress={() => Alert.alert('Coming Soon', 'Terms of service will be available soon')}
          />
          <MenuItem
            icon="information"
            iconColor="#9e9e9e"
            title="App Version"
            subtitle="1.0.0"
            rightElement={<Text style={styles.versionText}>1.0.0</Text>}
            showBorder={false}
          />
        </Surface>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <MaterialCommunityIcons name="logout" size={20} color="#d32f2f" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />

      {/* Dialogs for Web */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmLogout} textColor="#d32f2f">Logout</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={disconnectMicrosoftDialogVisible} onDismiss={() => setDisconnectMicrosoftDialogVisible(false)}>
          <Dialog.Title>Disconnect Microsoft To Do</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to disconnect? Your tasks will remain in Samaanai.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDisconnectMicrosoftDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDisconnectMicrosoft} textColor="#d32f2f">Disconnect</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={disconnectGoogleDialogVisible} onDismiss={() => setDisconnectGoogleDialogVisible(false)}>
          <Dialog.Title>Disconnect Google Tasks</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to disconnect? Your tasks will remain in Samaanai.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDisconnectGoogleDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDisconnectGoogle} textColor="#d32f2f">Disconnect</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  // Header Section
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16
  },
  avatar: {
    backgroundColor: '#1976d2'
  },
  avatarLabel: {
    fontSize: 32,
    fontWeight: '600'
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#43a047',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff'
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  memberSince: {
    fontSize: 12,
    color: '#43a047',
    marginLeft: 6,
    fontWeight: '500'
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
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  menuItemNoBorder: {
    borderBottomWidth: 0
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  menuContent: {
    flex: 1
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#9e9e9e'
  },
  versionText: {
    fontSize: 14,
    color: '#9e9e9e',
    fontWeight: '500'
  },
  // Integration Button
  integrationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1976d2'
  },
  integrationBtnConnected: {
    backgroundColor: '#ffebee'
  },
  integrationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  integrationBtnTextConnected: {
    color: '#d32f2f'
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ffcdd2'
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginLeft: 8
  },
  bottomSpacer: {
    height: 40
  }
});
