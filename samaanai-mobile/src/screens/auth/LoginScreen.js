import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Title, HelperText, Divider } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuth();

  const API_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8080';

  console.log('🔍 Frontend API_URL:', API_URL);
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'samaanai',
    useProxy: Platform.OS === 'web' ? false : !Constants.appOwnership || Constants.appOwnership === 'expo',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'EXPO_CLIENT', // Placeholder - will be handled by backend
      scopes: ['profile', 'email'],
      redirectUri,
    },
    {
      authorizationEndpoint: `${API_URL}/api/v1/auth/google`,
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { params } = response;
      if (params.accessToken && params.refreshToken) {
        handleGoogleCallback(params);
      }
    }
  }, [response]);

  // Check for Google OAuth callback params in URL (for web)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const userStr = urlParams.get('user');

      if (accessToken && refreshToken && userStr) {
        handleGoogleCallback({ accessToken, refreshToken, user: userStr });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      if (Platform.OS === 'web') {
        // For web, just redirect to the Google OAuth URL
        window.location.href = `${API_URL}/api/v1/auth/google`;
      } else {
        // For mobile, use WebBrowser with client parameter to indicate mobile client
        const authUrl = `${API_URL}/api/v1/auth/google?client=mobile`;
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.search);
          const accessToken = params.get('accessToken');
          const refreshToken = params.get('refreshToken');
          const userStr = params.get('user');

          if (accessToken && refreshToken && userStr) {
            const user = JSON.parse(userStr);
            await loginWithGoogle(accessToken, refreshToken, user);
          }
        }
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google login failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleGoogleCallback = async (params) => {
    try {
      console.log('Google callback params:', params);
      const user = typeof params.user === 'string' ? JSON.parse(params.user) : params.user;
      console.log('Parsed user:', user);
      const result = await loginWithGoogle(params.accessToken, params.refreshToken, user);
      console.log('Login with Google result:', result);

      if (!result.success) {
        setError(result.error || 'Failed to complete Google login');
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error('Google callback error:', err);
      setError('Failed to complete Google login');
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Title style={styles.title}>Welcome to Samaanai</Title>
        <Text style={styles.subtitle}>
          Manage your nutrition and tasks in one place
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        {error ? (
          <HelperText type="error" visible={true}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || googleLoading}
          style={styles.button}
        >
          Log In
        </Button>

        <View style={styles.dividerContainer}>
          <Divider style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <Divider style={styles.divider} />
        </View>

        <Button
          mode="outlined"
          onPress={handleGoogleLogin}
          loading={googleLoading}
          disabled={loading || googleLoading}
          style={styles.googleButton}
          textColor="#DB4437"
          icon="google"
        >
          Continue with Google
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
          textColor="#2E7D32"
        >
          Don't have an account? Sign up
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32
  },
  input: {
    marginBottom: 16
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    backgroundColor: '#1976D2' // Blue
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  divider: {
    flex: 1
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14
  },
  googleButton: {
    paddingVertical: 6,
    borderColor: '#DB4437', // Red
    borderWidth: 1,
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: '#2E7D32' // Green
  }
});