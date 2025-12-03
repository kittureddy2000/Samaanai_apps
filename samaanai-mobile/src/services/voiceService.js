/**
 * Voice Recognition Service
 * Handles speech-to-text conversion for both mobile and web
 */

import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

class VoiceService {
  constructor() {
    this.isRecording = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;

    if (Platform.OS !== 'web') {
      // Setup voice recognition for mobile
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
    }
  }

  /**
   * Start listening for voice input
   * @param {Function} onResult - Callback with transcribed text
   * @param {Function} onError - Callback for errors
   */
  async startListening(onResult, onError) {
    try {
      this.onResultCallback = onResult;
      this.onErrorCallback = onError;

      if (Platform.OS === 'web') {
        await this.startWebSpeechRecognition();
      } else {
        await this.startMobileSpeechRecognition();
      }

      this.isRecording = true;
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Stop listening for voice input
   */
  async stopListening() {
    try {
      if (Platform.OS === 'web') {
        if (this.recognition) {
          this.recognition.stop();
        }
      } else {
        await Voice.stop();
      }
      this.isRecording = false;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  /**
   * Web Speech Recognition (for browsers)
   */
  async startWebSpeechRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Web speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };

    this.recognition.start();
  }

  /**
   * Mobile Speech Recognition (React Native Voice)
   */
  async startMobileSpeechRecognition() {
    await Voice.start('en-US');
  }

  /**
   * Handle speech results from mobile
   */
  onSpeechResults(event) {
    if (event.value && event.value.length > 0) {
      const transcript = event.value[0];
      if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }
    }
  }

  /**
   * Handle speech errors from mobile
   */
  onSpeechError(event) {
    console.error('Mobile speech recognition error:', event.error);
    if (this.onErrorCallback) {
      this.onErrorCallback(new Error(event.error?.message || 'Speech recognition error'));
    }
  }

  /**
   * Check if voice recognition is available
   */
  async isAvailable() {
    if (Platform.OS === 'web') {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    } else {
      return await Voice.isAvailable();
    }
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    if (Platform.OS !== 'web') {
      Voice.destroy().then(Voice.removeAllListeners);
    }
  }
}

export default new VoiceService();
