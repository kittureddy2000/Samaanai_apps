/**
 * Voice Command Parser
 * Parses voice commands into structured data for tasks and calories
 */

import * as chrono from 'chrono-node';
import { format } from 'date-fns';

/**
 * Parse task from voice command
 * Handles patterns like:
 * - "create task call doctor tomorrow at 2 PM"
 * - "remind me to buy groceries on Friday"
 * - "add task follow up on email"
 */
export const parseTaskCommand = (text) => {
  const lowerText = text.toLowerCase().trim();

  // Check if it's a task command
  const taskPatterns = [
    /(?:create|add|new)\s+task\s+(.+)/i,
    /remind\s+me\s+to\s+(.+)/i,
    /(?:todo|to do)[\s:]+(.+)/i,
  ];

  let taskName = null;
  for (const pattern of taskPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      taskName = match[1];
      break;
    }
  }

  if (!taskName) {
    return null;
  }

  // Parse dates using chrono
  const parsedDates = chrono.parse(taskName);
  let dueDate = null;
  let cleanTaskName = taskName;

  if (parsedDates.length > 0) {
    dueDate = parsedDates[0].start.date();
    // Remove the date text from task name
    const dateText = parsedDates[0].text;
    cleanTaskName = taskName.replace(new RegExp(dateText, 'i'), '').trim();
  }

  // Extract time if present
  const timeMatch = cleanTaskName.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/i);
  if (timeMatch) {
    cleanTaskName = cleanTaskName.replace(timeMatch[0], '').trim();
  }

  // Clean up common words
  cleanTaskName = cleanTaskName
    .replace(/^(to|for)\s+/i, '')
    .replace(/\s+(on|at)\s*$/i, '')
    .trim();

  return {
    type: 'task',
    name: cleanTaskName,
    dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
    description: '',
    reminderType: null,
    confidence: 0.9
  };
};

/**
 * Parse calorie command
 * Handles patterns like:
 * - "log 500 calories for lunch"
 * - "I ate chicken sandwich for dinner"
 * - "add 350 calories breakfast"
 */
export const parseCalorieCommand = (text) => {
  const lowerText = text.toLowerCase().trim();

  // Pattern 1: Explicit calories "log 500 calories for lunch"
  const explicitCaloriePattern = /(?:log|add|record)\s+(\d+)\s+calories?\s+(?:for\s+)?(breakfast|lunch|dinner|snack)/i;
  let match = lowerText.match(explicitCaloriePattern);

  if (match) {
    return {
      type: 'calorie',
      calories: parseInt(match[1]),
      mealType: match[2].toLowerCase(),
      description: '',
      confidence: 0.95
    };
  }

  // Pattern 2: Food description with meal "I ate chicken sandwich for lunch"
  const foodDescPattern = /(?:i\s+)?(?:ate|had|consumed)\s+(.+?)\s+(?:for\s+)?(breakfast|lunch|dinner|snack)/i;
  match = lowerText.match(foodDescPattern);

  if (match) {
    return {
      type: 'calorie',
      calories: null, // User needs to specify
      mealType: match[2].toLowerCase(),
      description: match[1].trim(),
      confidence: 0.8
    };
  }

  // Pattern 3: Just calories and meal type "500 calories lunch"
  const simplePattern = /(\d+)\s+calories?\s+(breakfast|lunch|dinner|snack)/i;
  match = lowerText.match(simplePattern);

  if (match) {
    return {
      type: 'calorie',
      calories: parseInt(match[1]),
      mealType: match[2].toLowerCase(),
      description: '',
      confidence: 0.9
    };
  }

  // Pattern 4: Food with calories "chicken sandwich 500 calories for lunch"
  const foodWithCaloriesPattern = /(.+?)\s+(\d+)\s+calories?\s+(?:for\s+)?(breakfast|lunch|dinner|snack)/i;
  match = lowerText.match(foodWithCaloriesPattern);

  if (match) {
    return {
      type: 'calorie',
      calories: parseInt(match[2]),
      mealType: match[3].toLowerCase(),
      description: match[1].trim(),
      confidence: 0.85
    };
  }

  return null;
};

/**
 * Parse exercise command
 * Handles patterns like:
 * - "log 30 minutes running burned 250 calories"
 * - "I ran for 30 minutes"
 */
export const parseExerciseCommand = (text) => {
  const lowerText = text.toLowerCase().trim();

  // Pattern 1: Full details "30 minutes running 250 calories"
  const fullPattern = /(?:log|add|record)?\s*(\d+)\s+minutes?\s+(.+?)\s+(?:burned\s+)?(\d+)\s+calories?/i;
  let match = lowerText.match(fullPattern);

  if (match) {
    return {
      type: 'exercise',
      duration: parseInt(match[1]),
      description: match[2].trim(),
      caloriesBurned: parseInt(match[3]),
      confidence: 0.9
    };
  }

  // Pattern 2: Just activity and duration "I ran for 30 minutes"
  const durationPattern = /(?:i\s+)?(.+?)\s+for\s+(\d+)\s+minutes?/i;
  match = lowerText.match(durationPattern);

  if (match) {
    return {
      type: 'exercise',
      duration: parseInt(match[2]),
      description: match[1].trim(),
      caloriesBurned: null, // User needs to specify
      confidence: 0.8
    };
  }

  return null;
};

/**
 * Main parser - tries all parsers and returns the best match
 */
export const parseVoiceCommand = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Try parsing as different command types
  const taskResult = parseTaskCommand(text);
  const calorieResult = parseCalorieCommand(text);
  const exerciseResult = parseExerciseCommand(text);

  // Return the result with highest confidence
  const results = [taskResult, calorieResult, exerciseResult].filter(r => r !== null);

  if (results.length === 0) {
    return null;
  }

  // Sort by confidence and return best match
  results.sort((a, b) => b.confidence - a.confidence);
  return results[0];
};

/**
 * Get suggested commands for help
 */
export const getSuggestedCommands = () => {
  return {
    tasks: [
      "Create task call doctor tomorrow at 2 PM",
      "Remind me to buy groceries on Friday",
      "Add task follow up on email",
      "New task submit report by Monday"
    ],
    calories: [
      "Log 500 calories for lunch",
      "I ate chicken sandwich for dinner",
      "Add 350 calories breakfast",
      "Record 600 calories for lunch"
    ],
    exercise: [
      "Log 30 minutes running burned 250 calories",
      "I ran for 45 minutes",
      "Add 60 minutes cycling 400 calories"
    ]
  };
};
