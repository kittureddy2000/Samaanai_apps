/**
 * Gemini AI Service
 * Handles LLM-based voice command parsing using Google Gemini
 */

import axios from 'axios';

// You'll need to set this in your environment
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

class GeminiService {
  /**
   * Parse voice command using Gemini LLM
   * @param {string} voiceText - The transcribed voice text
   * @returns {Promise<Object>} Parsed command object
   */
  async parseVoiceCommand(voiceText) {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your environment.');
    }

    try {
      const prompt = this.buildPrompt(voiceText);

      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 500,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Extract the generated text from Gemini response
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No response from Gemini');
      }

      // Parse the JSON response
      const parsedCommand = this.extractJsonFromResponse(generatedText);

      return parsedCommand;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw new Error(`Failed to parse command: ${error.message}`);
    }
  }

  /**
   * Build the prompt for Gemini
   */
  buildPrompt(voiceText) {
    return `You are a voice command parser for a personal productivity app. Parse the following voice command and return ONLY a valid JSON object (no markdown, no explanations, just JSON).

Voice Command: "${voiceText}"

Identify if this is a TASK, CALORIE, or EXERCISE command and extract relevant information.

Return JSON in one of these formats:

For TASK commands:
{
  "type": "task",
  "name": "task name (cleaned up, without date/time references)",
  "dueDate": "YYYY-MM-DD or null",
  "description": "optional description",
  "reminderType": null,
  "confidence": 0.0-1.0
}

For CALORIE commands:
{
  "type": "calorie",
  "mealType": "breakfast|lunch|dinner|snack",
  "calories": number or null,
  "description": "food description",
  "confidence": 0.0-1.0
}

For EXERCISE commands:
{
  "type": "exercise",
  "description": "exercise activity name",
  "duration": number (minutes) or null,
  "caloriesBurned": number or null,
  "confidence": 0.0-1.0
}

Important rules:
1. For dates: Use today's date as reference. Today is ${new Date().toISOString().split('T')[0]}.
2. Common date phrases:
   - "tomorrow" = add 1 day to today
   - "next Monday/Tuesday/etc" = next occurrence of that day
   - "in 3 days" = add 3 days to today
3. Clean up task names by removing date/time references (e.g., "call doctor tomorrow" -> "call doctor")
4. If calories are not mentioned for calorie commands, set to null
5. Set confidence based on how clear the command is (0.9+ for clear, 0.5-0.8 for ambiguous, <0.5 for unclear)
6. If the command doesn't match any category, return: {"type": "unknown", "confidence": 0}

Return ONLY the JSON object, nothing else.`;
  }

  /**
   * Extract JSON from Gemini response (handles markdown code blocks)
   */
  extractJsonFromResponse(text) {
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();

      // Remove ```json and ``` markers
      jsonText = jsonText.replace(/```json\s*/g, '');
      jsonText = jsonText.replace(/```\s*/g, '');

      // Find JSON object (between { and })
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the response
      if (!parsed.type) {
        throw new Error('Invalid response: missing type field');
      }

      return parsed;
    } catch (error) {
      console.error('JSON Parse Error:', error.message);
      console.error('Raw text:', text);
      throw new Error('Failed to parse JSON response from Gemini');
    }
  }

  /**
   * Test the Gemini API connection
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
