import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener
} from './src/services/notificationService';

import { premiumTheme } from './src/theme/premiumTheme';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // You can show a custom in-app notification here if desired
    });

    responseListener.current = addNotificationResponseListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Handle navigation based on notification type
      if (data.type === 'task_reminder' && data.taskId) {
        console.log('Navigate to task:', data.taskId);
        // Navigation will be handled by the navigator
      } else if (data.type === 'weekly_report') {
        console.log('Navigate to dashboard');
        // Navigation will be handled by the navigator
      } else if (data.type === 'calorie_reminder') {
        console.log('Navigate to nutrition screen');
        // Navigation will be handled by the navigator
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={premiumTheme}>
          <AuthProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
