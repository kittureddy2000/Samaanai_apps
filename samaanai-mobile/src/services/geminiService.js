/**
 * Gemini AI Service (Secure Backend Proxy)
 * Handles LLM-based voice command parsing via backend API
 */

import api from './api';

class GeminiService {
  /**
   * Parse voice command using Gemini LLM (via backend)
   * @param {string} voiceText - The transcribed voice text
   * @returns {Promise<Object>} Parsed command object
   */
  async parseVoiceCommand(voiceText) {
    try {
      // Call backend endpoint instead of Gemini directly
      const response = await api.parseVoiceCommand(voiceText);

      if (!response.data.success) {
        // Backend returned error or wants us to fallback
        if (response.data.fallbackToPatterns) {
          throw new Error('LLM_FALLBACK'); // Special error to trigger pattern matching
        }
        throw new Error(response.data.error || 'Failed to parse command');
      }

      return response.data.data;
    } catch (error) {
      console.error('Voice parsing error:', error.message);
      throw error;
    }
  }

  /**
   * Test the voice parsing connection
   */
  async testConnection() {
    try {
      const result = await this.parseVoiceCommand('create task test');
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new GeminiService();
