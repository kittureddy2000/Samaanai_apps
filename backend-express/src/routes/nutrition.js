const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const nutritionController = require('../controllers/nutritionController');

// All nutrition routes require authentication
router.use(authenticate);

router.get('/meals', nutritionController.getMeals);
router.post('/meals', nutritionController.createMeal);
router.put('/meals/:id', nutritionController.updateMeal);
router.delete('/meals/:id', nutritionController.deleteMeal);

router.get('/exercises', nutritionController.getExercises);
router.post('/exercises', nutritionController.createExercise);
router.put('/exercises/:id', nutritionController.updateExercise);
router.delete('/exercises/:id', nutritionController.deleteExercise);

router.get('/weight', nutritionController.getWeightEntries);
router.post('/weight', nutritionController.createWeightEntry);

router.get('/reports/daily', nutritionController.getDailyReport);
router.get('/reports/weekly', nutritionController.getWeeklyReport);
router.get('/reports/monthly', nutritionController.getMonthlyReport);
router.get('/reports/yearly', nutritionController.getYearlyReport);

module.exports = router;