/**
 * OCR Routes
 * Handles image processing for extracting calories from exercise machine displays
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// All OCR routes require authentication
router.use(authenticate);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Extract calories from exercise machine display image
 * POST /api/v1/ocr/extract-calories
 */
router.post(
  '/extract-calories',
  [
    body('image').isString().notEmpty().withMessage('Base64 image is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { image } = req.body;

      if (!GEMINI_API_KEY) {
        req.log.error('Gemini API key not configured');
        return res.status(500).json({
          error: 'OCR service not configured',
          calories: null,
          confidence: 0,
          rawText: ''
        });
      }

      // Build prompt for Gemini Vision
      const prompt = buildOCRPrompt();

      // Call Gemini Vision API
      const response = await axios.post(
        `${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: image
                }
              }
            ]
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
          timeout: 30000 // 30 second timeout for image processing
        }
      );

      // Extract generated text
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        req.log.warn('No response from Gemini Vision');
        return res.status(200).json({
          calories: null,
          confidence: 0,
          rawText: '',
          error: 'Could not process image'
        });
      }

      // Parse JSON response
      const result = extractJsonFromResponse(generatedText);

      req.log.info({ result }, 'OCR extraction successful');

      return res.status(200).json(result);

    } catch (error) {
      req.log.error({ error: error.message }, 'Error extracting calories from image');

      return res.status(500).json({
        error: error.message || 'Failed to process image',
        calories: null,
        confidence: 0,
        rawText: ''
      });
    }
  }
);

/**
 * Build prompt for Gemini Vision OCR
 */
function buildOCRPrompt() {
  return `You are an OCR assistant specialized in reading exercise machine displays. Analyze this image of an exercise machine display (treadmill, elliptical, stationary bike, rowing machine, etc.) and extract the calories burned value.

Look for:
1. A number labeled "CALORIES" or "CAL" or similar
2. Numbers on LED/LCD displays
3. Common display layouts for gym equipment

Return ONLY a valid JSON object (no markdown, no explanations, just JSON) in this format:
{
  "calories": <number or null if not found>,
  "confidence": <0.0 to 1.0 - how confident you are in the reading>,
  "rawText": "<the text you see on the display related to calories>"
}

Important rules:
1. Only extract the CALORIES BURNED value, not time, distance, speed, or heart rate
2. If you see multiple numbers, identify which one is calories (usually labeled)
3. If the image is blurry or unclear, set confidence lower
4. If you cannot find calories, set calories to null and confidence to 0
5. Include any relevant text you see in rawText for debugging
6. Exercise machines typically show calories as whole numbers (no decimals)

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

    // Validate and sanitize the response
    return {
      calories: typeof parsed.calories === 'number' ? Math.round(parsed.calories) : null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
      rawText: typeof parsed.rawText === 'string' ? parsed.rawText : ''
    };
  } catch (error) {
    return {
      calories: null,
      confidence: 0,
      rawText: '',
      error: 'Failed to parse OCR response'
    };
  }
}

module.exports = router;
