import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { secureStorage, appStorage } from '../services/secureStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await appStorage.getItem('user');
      const token = await secureStorage.getItem('accessToken');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        // Register push token for existing session
        await registerPushToken();
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerPushToken = async () => {
    try {
      console.log('=== Starting Push Token Registration ===');
      const pushToken = await registerForPushNotificationsAsync();

      console.log('Push token obtained:', pushToken ? 'YES' : 'NO');
      if (pushToken) {
        console.log('Push token value:', pushToken);
        console.log('Calling backend API to register push token...');

        const response = await api.registerPushToken(pushToken);

        console.log('✅ Backend response:', response.data);
        console.log('✅ Push token registered successfully');
      } else {
        console.warn('⚠️  No push token obtained (might be simulator or permissions denied)');
      }
    } catch (error) {
      // Don't fail authentication if push token registration fails
      console.error('❌ Error registering push token:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login...', { email });
      const { data } = await api.login(email, password);
      console.log('Login response:', data);

      // Store tokens securely, user data in app storage
      await Promise.all([
        appStorage.setItem('user', JSON.stringify(data.user)),
        secureStorage.setItem('accessToken', data.accessToken),
        secureStorage.setItem('refreshToken', data.refreshToken)
      ]);

      setUser(data.user);
      setIsAuthenticated(true);

      // Register push token after successful login
      await registerPushToken();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = 'Login failed';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('Attempting registration...', { username, email });
      const { data } = await api.register(username, email, password);
      console.log('Registration response:', data);

      // Store tokens securely, user data in app storage
      await Promise.all([
        appStorage.setItem('user', JSON.stringify(data.user)),
        secureStorage.setItem('accessToken', data.accessToken),
        secureStorage.setItem('refreshToken', data.refreshToken)
      ]);

      setUser(data.user);
      setIsAuthenticated(true);

      // Register push token after successful registration
      await registerPushToken();

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = 'Registration failed';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const loginWithGoogle = async (accessToken, refreshToken, user) => {
    try {
      // Store tokens securely, user data in app storage
      await Promise.all([
        appStorage.setItem('user', JSON.stringify(user)),
        secureStorage.setItem('accessToken', accessToken),
        secureStorage.setItem('refreshToken', refreshToken)
      ]);

      setUser(user);
      setIsAuthenticated(true);

      // Register push token after successful Google login
      await registerPushToken();

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: 'Failed to complete Google login'
      };
    }
  };

  const logout = async () => {
    try {
      // Clear tokens from secure storage and user from app storage
      await Promise.all([
        appStorage.removeItem('user'),
        secureStorage.multiRemove(['accessToken', 'refreshToken'])
      ]);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};