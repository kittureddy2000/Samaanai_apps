import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure storage wrapper that uses:
 * - expo-secure-store for sensitive data (tokens) on native platforms
 * - AsyncStorage for web (with warning)
 *
 * This ensures tokens are encrypted at rest on mobile devices.
 */

const isWeb = Platform.OS === 'web';

if (isWeb) {
  console.warn('⚠️  Running on web - using AsyncStorage instead of SecureStore. Tokens are not encrypted.');
}

export const secureStorage = {
  /**
   * Save a secure item (e.g., auth tokens)
   */
  async setItem(key, value) {
    if (isWeb) {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },

  /**
   * Retrieve a secure item
   */
  async getItem(key) {
    if (isWeb) {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  /**
   * Delete a secure item
   */
  async removeItem(key) {
    if (isWeb) {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },

  /**
   * Delete multiple secure items
   */
  async multiRemove(keys) {
    if (isWeb) {
      return AsyncStorage.multiRemove(keys);
    }
    // SecureStore doesn't have multiRemove, so delete one by one
    return Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
  }
};

/**
 * Storage for non-sensitive data (use regular AsyncStorage)
 * Use this for app state, preferences, cache, etc.
 */
export const appStorage = {
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  getItem: (key) => AsyncStorage.getItem(key),
  removeItem: (key) => AsyncStorage.removeItem(key),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
  multiGet: (keys) => AsyncStorage.multiGet(keys),
  getAllKeys: () => AsyncStorage.getAllKeys(),
  clear: () => AsyncStorage.clear()
};

export default secureStorage;
