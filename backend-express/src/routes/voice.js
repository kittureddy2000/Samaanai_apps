/**
 * Voice Command Parsing Routes
 * Secure endpoint for voice command parsing using Gemini AI
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Parse voice command using Gemini AI
 * POST /api/v1/voice/parse
 */
router.post(
  '/parse',
  [
    body('transcript').isString().trim().notEmpty().withMessage('Transcript is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { transcript } = req.body;

      if (!GEMINI_API_KEY) {
        req.log.error('Gemini API key not configured');
        // Fallback to pattern matching if no API key
        return res.status(200).json({
          success: false,
          error: 'LLM not configured',
          fallbackToPatterns: true
        });
      }

      // Build prompt for Gemini
      const prompt = buildPrompt(transcript);

      // Call Gemini API
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
          timeout: 10000
        }
      );

      // Extract generated text
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        req.log.warn('No response from Gemini');
        return res.status(200).json({
          success: false,
          error: 'No response from LLM',
          fallbackToPatterns: true
        });
      }

      // Parse JSON response
      const parsedCommand = extractJsonFromResponse(generatedText);

      req.log.info({ parsedCommand }, 'Voice command parsed successfully');

      return res.status(200).json({
        success: true,
        data: parsedCommand
      });

    } catch (error) {
      req.log.error({ error: error.message }, 'Error parsing voice command');

      // Return error but allow fallback
      return res.status(200).json({
        success: false,
        error: error.message,
        fallbackToPatterns: true
      });
    }
  }
);

/**
 * Build prompt for Gemini
 */
function buildPrompt(voiceText) {
  const today = new Date().toISOString().split('T')[0];

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
1. For dates: Use today's date as reference. Today is ${today}.
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
 * Extract JSON from Gemini response
 */
function extractJsonFromResponse(text) {
  try {
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    jsonText = jsonText.replace(/```json\s*/g, '');
    jsonText = jsonText.replace(/```\s*/g, '');

    // Find JSON object
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
    throw new Error('Failed to parse JSON response from Gemini');
  }
}

module.exports = router;
