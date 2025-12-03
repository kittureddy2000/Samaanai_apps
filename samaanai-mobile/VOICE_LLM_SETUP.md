# Voice Command LLM Setup Guide

This guide explains how to configure Gemini AI for intelligent voice command parsing in the Samaanai mobile app.

## Overview

The voice command system now uses Google Gemini LLM to parse voice commands with better accuracy and natural language understanding. It automatically falls back to pattern matching if the LLM fails.

### Features
- **LLM-powered parsing**: Natural language understanding using Google Gemini
- **Automatic fallback**: Falls back to regex patterns if LLM fails
- **Multiple command types**: Tasks, calorie logging, and exercise tracking
- **Smart date parsing**: Understands "tomorrow", "next Monday", etc.
- **Confidence scoring**: Only uses LLM results with confidence >= 0.5

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

**Important**: The Gemini API has a free tier with generous limits:
- 15 requests per minute
- 1 million tokens per minute
- 1500 requests per day

### 2. Configure Environment Variable

1. Open `.env` file in the `samaanai-mobile` directory
2. Find the line: `EXPO_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE`
3. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:

```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Restart Your Development Server

After updating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Clear the cache and restart
npm start -- --clear
```

## How It Works

### Architecture

```
User speaks → Speech-to-Text → Gemini LLM → Structured Data → App Action
                                    ↓ (on failure)
                              Pattern Matching
```

### File Structure

- **`src/services/geminiService.js`**: Gemini API integration
- **`src/services/voiceCommandParser.js`**: Main parser with LLM + fallback
- **`src/components/VoiceInputButton.js`**: UI component with async handling

### Voice Command Examples

#### Task Commands
```
"Create task call doctor tomorrow"
"Remind me to buy groceries on Friday"
"Add task submit report by Monday"
"New task follow up on email in 3 days"
```

#### Calorie Commands
```
"Log 500 calories for lunch"
"I ate chicken sandwich for dinner"
"Add 350 calories breakfast"
"Record 600 calories for lunch"
```

#### Exercise Commands
```
"Log 30 minutes running burned 250 calories"
"I ran for 45 minutes"
"Add 60 minutes cycling 400 calories"
```

## Configuration Options

### Disable LLM Parsing

If you want to use only pattern matching, edit `src/services/voiceCommandParser.js`:

```javascript
// Change this to false
const USE_LLM_PARSING = false;
```

### Adjust Confidence Threshold

In `src/services/voiceCommandParser.js`, line 201:

```javascript
// Default is 0.5 (50% confidence)
if (llmResult && llmResult.type !== 'unknown' && llmResult.confidence >= 0.5) {
```

### Customize Gemini Model

In `src/services/geminiService.js`, you can adjust the generation config:

```javascript
generationConfig: {
  temperature: 0.1,  // Lower = more focused, Higher = more creative
  topK: 1,
  topP: 1,
  maxOutputTokens: 500,
}
```

## Troubleshooting

### Error: "Gemini API key not configured"

**Solution**: Make sure you've set `EXPO_PUBLIC_GEMINI_API_KEY` in `.env` and restarted the server with cache cleared.

### Error: "Failed to parse command"

**Causes**:
1. Invalid API key
2. Network connectivity issues
3. API rate limit exceeded

**Solution**: Check the console logs for detailed error messages. The system will automatically fall back to pattern matching.

### Commands not being understood

**Check**:
1. Look at console logs to see if LLM or pattern matching was used
2. Check the confidence score in the logs
3. Try more explicit commands (e.g., "create task" instead of just the task name)

### Rate Limiting

If you hit rate limits, the system will:
1. Log a warning to console
2. Automatically fall back to pattern matching
3. Continue working without LLM

## Testing

### Test LLM Connection

Add this to your code temporarily:

```javascript
import geminiService from './services/geminiService';

// Test the connection
geminiService.testConnection().then(result => {
  console.log('Gemini Test:', result);
});
```

### Check Logs

When using voice commands, check the console for:
- `✅ LLM parsing successful:` - LLM worked
- `⚠️ LLM result low confidence, falling back to pattern matching` - Low confidence
- `⚠️ LLM parsing failed, falling back to pattern matching:` - LLM error
- `Using pattern matching fallback` - Pattern matching used

## API Cost & Limits

### Free Tier (Generous)
- **Free forever** for moderate use
- 15 requests per minute
- 1,500 requests per day
- More than enough for personal use

### Estimated Usage
- Average voice command: ~200 tokens (~$0.00001 if you exceed free tier)
- 100 voice commands/day = well within free tier

## Security Notes

1. **Never commit** your API key to version control
2. The `.env` file is already in `.gitignore`
3. For production apps, consider using a backend proxy to hide the API key
4. Rotate your API key if it's ever exposed

## Next Steps

- ✅ LLM parsing is now configured
- ✅ Automatic fallback ensures reliability
- ✅ Natural language understanding improves UX

Try speaking naturally to the app - it should understand context better than before!

## Support

For issues or questions:
1. Check console logs for error details
2. Verify your API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Ensure you have internet connectivity
4. Try the pattern matching fallback by disabling LLM (set `USE_LLM_PARSING = false`)
