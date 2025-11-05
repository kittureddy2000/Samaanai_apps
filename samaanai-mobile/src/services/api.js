import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { secureStorage, appStorage } from './secureStorage';

// Robust API URL detection with multiple fallbacks
const getApiBaseUrl = () => {
  // Try multiple sources in order of preference
  const sources = [
    Constants.expoConfig?.extra?.API_BASE_URL,
    Constants.manifest?.extra?.API_BASE_URL,
    Constants.manifest2?.extra?.expoClient?.extra?.API_BASE_URL,
    process.env.API_BASE_URL,
    process.env.EXPO_PUBLIC_API_BASE_URL,
  ];

  for (const url of sources) {
    if (url && typeof url === 'string' && url.trim()) {
      console.log('🔍 API Service - Using API_BASE_URL from:', url);
      return url;
    }
  }

  // Default fallback - always use custom domain for production
  const defaultUrl = 'https://api.samaanai.com';
  console.log('⚠️  API Service - Using default API_BASE_URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔍 API Service - Final API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken
        });

        // Save both tokens securely (backend may rotate refresh token for security)
        await secureStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          await secureStorage.setItem('refreshToken', data.refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear all auth data and logout user
        await secureStorage.multiRemove(['accessToken', 'refreshToken']);
        await appStorage.removeItem('user'); // User data is non-sensitive, stored in appStorage
        // Navigate to login (use navigation ref)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

  register: (username, email, password) =>
    apiClient.post('/auth/register', { username, email, password }),

  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  // Nutrition
  getMeals: (params) =>
    apiClient.get('/nutrition/meals', { params }),

  createMeal: (mealData) =>
    apiClient.post('/nutrition/meals', mealData),

  updateMeal: (id, mealData) =>
    apiClient.put(`/nutrition/meals/${id}`, mealData),

  deleteMeal: (id) =>
    apiClient.delete(`/nutrition/meals/${id}`),

  getExercises: (params) =>
    apiClient.get('/nutrition/exercises', { params }),

  createExercise: (exerciseData) =>
    apiClient.post('/nutrition/exercises', exerciseData),

  getWeightEntries: () =>
    apiClient.get('/nutrition/weight'),

  createWeightEntry: (weightData) =>
    apiClient.post('/nutrition/weight', weightData),

  getDailyReport: (date) =>
    apiClient.get('/nutrition/reports/daily', { params: { date } }),

  getWeeklyReport: (startDate, endDate) =>
    apiClient.get('/nutrition/reports/weekly', { params: { startDate, endDate } }),

  getMonthlyReport: (month, year) =>
    apiClient.get('/nutrition/reports/monthly', { params: { month, year } }),

  getYearlyReport: (year) =>
    apiClient.get('/nutrition/reports/yearly', { params: { year } }),

  addOrUpdateMealEntry: (mealData) => {
    if (mealData.id) {
      const { id, ...data } = mealData;
      return apiClient.put(`/nutrition/meals/${id}`, data);
    }
    return apiClient.post('/nutrition/meals', mealData);
  },

  deleteMealEntry: (id) =>
    apiClient.delete(`/nutrition/meals/${id}`),

  addOrUpdateExerciseEntry: (exerciseData) => {
    if (exerciseData.id) {
      const { id, ...data } = exerciseData;
      return apiClient.put(`/nutrition/exercises/${id}`, data);
    }
    return apiClient.post('/nutrition/exercises', exerciseData);
  },

  deleteExerciseEntry: (id) =>
    apiClient.delete(`/nutrition/exercises/${id}`),

  addOrUpdateWeightEntry: (weightData) =>
    apiClient.post('/nutrition/weight', weightData),

  getWeightHistory: () =>
    apiClient.get('/nutrition/weight'),

  // Todo
  getTasks: (params) =>
    apiClient.get('/todo/tasks', { params }),

  getTask: (id) =>
    apiClient.get(`/todo/tasks/${id}`),

  createTask: (taskData) =>
    apiClient.post('/todo/tasks', taskData),

  updateTask: (id, taskData) =>
    apiClient.put(`/todo/tasks/${id}`, taskData),

  deleteTask: (id) =>
    apiClient.delete(`/todo/tasks/${id}`),

  toggleTaskCompletion: (id) =>
    apiClient.patch(`/todo/tasks/${id}/toggle`),

  getTaskStats: () =>
    apiClient.get('/todo/tasks/stats'),

  // User
  getProfile: () => apiClient.get('/user/profile'),

  updateProfile: (profileData) =>
    apiClient.put('/user/profile', profileData),

  changePassword: (passwordData) =>
    apiClient.put('/user/password', passwordData),

  getPreferences: () => apiClient.get('/user/preferences'),

  updatePreferences: (preferences) =>
    apiClient.put('/user/preferences', preferences),

  registerPushToken: (pushToken) =>
    apiClient.post('/user/push-token', { pushToken })
};

export default api;