const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const nutritionController = require('../controllers/nutritionController');

// All nutrition routes require authentication
router.use(authenticate);

// Validation middleware
const mealValidation = [
  body('mealType')
    .isIn(['breakfast', 'lunch', 'dinner', 'snacks'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snacks'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('calories')
    .isInt({ min: 0, max: 10000 })
    .withMessage('Calories must be between 0 and 10000'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

const exerciseValidation = [
  body('description')
    .trim()
    .notEmpty()
    .isLength({ max: 500 })
    .withMessage('Description is required and must be less than 500 characters'),
  body('caloriesBurned')
    .isInt({ min: 0, max: 5000 })
    .withMessage('Calories burned must be between 0 and 5000'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

const weightValidation = [
  body('weight')
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

router.get('/meals', nutritionController.getMeals);
router.post('/meals', mealValidation, nutritionController.createMeal);
router.put('/meals/:id', param('id').isUUID(), mealValidation, nutritionController.updateMeal);
router.delete('/meals/:id', param('id').isUUID(), nutritionController.deleteMeal);

router.get('/exercises', nutritionController.getExercises);
router.post('/exercises', exerciseValidation, nutritionController.createExercise);
router.put('/exercises/:id', param('id').isUUID(), exerciseValidation, nutritionController.updateExercise);
router.delete('/exercises/:id', param('id').isUUID(), nutritionController.deleteExercise);

router.get('/weight', nutritionController.getWeightEntries);
router.post('/weight', weightValidation, nutritionController.createWeightEntry);
router.get('/weight/history', nutritionController.getWeightHistory);

router.get('/reports/daily', nutritionController.getDailyReport);
router.get('/reports/weekly', nutritionController.getWeeklyReport);
router.get('/reports/monthly', nutritionController.getMonthlyReport);
router.get('/reports/yearly', nutritionController.getYearlyReport);

module.exports = router;