import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, List, Avatar, Divider, Portal, Dialog } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { logout, user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

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

  useEffect(() => {
    fetchProfile();
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
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => logout()
          }
        ]
      );
    }
  };

  const confirmLogout = () => {
    setLogoutDialogVisible(false);
    logout();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchProfile} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const { username, email, created_at } = profile || {};
  const initials = username ? username.substring(0, 2).toUpperCase() : 'U';
  const memberSince = created_at ? new Date(created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  }) : 'Unknown';

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Text size={80} label={initials} style={styles.avatar} />
          <Title style={styles.username}>{username}</Title>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </Card.Content>
      </Card>

      {/* Account Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Account</Title>
        </Card.Content>
        <Divider />
        <List.Item
          title="Edit Profile"
          description="Update your personal information"
          left={props => <List.Icon {...props} icon="account-edit" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title="Change Password"
          description="Update your password"
          left={props => <List.Icon {...props} icon="lock-reset" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <Divider />
        <List.Item
          title="Preferences"
          description="Manage your app preferences"
          left={props => <List.Icon {...props} icon="cog" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Preferences')}
        />
      </Card>

      {/* Nutrition Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Nutrition</Title>
        </Card.Content>
        <Divider />
        <List.Item
          title="Daily Goals"
          description="Set your calorie and macro goals"
          left={props => <List.Icon {...props} icon="target" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            navigation.navigate('Nutrition', {
              screen: 'Goals'
            });
          }}
        />
        <Divider />
        <List.Item
          title="Food Preferences"
          description="Manage dietary preferences"
          left={props => <List.Icon {...props} icon="food-apple" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('FoodPreferences')}
        />
      </Card>

      {/* App Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>About</Title>
        </Card.Content>
        <Divider />
        <List.Item
          title="Help & Support"
          description="Get help with Samaanai"
          left={props => <List.Icon {...props} icon="help-circle" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Coming Soon', 'Help center will be available soon');
          }}
        />
        <Divider />
        <List.Item
          title="Privacy Policy"
          description="View our privacy policy"
          left={props => <List.Icon {...props} icon="shield-check" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Coming Soon', 'Privacy policy will be available soon');
          }}
        />
        <Divider />
        <List.Item
          title="Terms of Service"
          description="View terms of service"
          left={props => <List.Icon {...props} icon="file-document" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Coming Soon', 'Terms of service will be available soon');
          }}
        />
        <Divider />
        <List.Item
          title="App Version"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
      </Card>

      {/* Logout Button */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor="#d32f2f"
            icon="logout"
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />

      {/* Logout Dialog for Web */}
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
      </Portal>
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
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    marginTop: 8
  },
  headerCard: {
    margin: 16,
    marginBottom: 8
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24
  },
  avatar: {
    backgroundColor: '#1976d2',
    marginBottom: 16
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8
  },
  memberSince: {
    fontSize: 14,
    color: '#999'
  },
  card: {
    margin: 16,
    marginBottom: 8
  },
  logoutButton: {
    marginTop: 8
  },
  spacer: {
    height: 24
  }
});
