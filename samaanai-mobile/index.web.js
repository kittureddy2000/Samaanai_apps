import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Set up web-specific configurations
if (Platform.OS === 'web') {
  // Set document title
  if (typeof document !== 'undefined') {
    document.title = 'Samaanai - Finance & Nutrition Tracker';
  }

  // Add viewport meta tag for responsive design
  if (typeof document !== 'undefined' && !document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1';
    document.head.appendChild(meta);
  }
}

registerRootComponent(App);