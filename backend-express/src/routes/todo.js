const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const todoController = require('../controllers/todoController');

// All todo routes require authentication
router.use(authenticate);

// Validation middleware
const taskValidation = [
  body('name')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task name is required and must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('reminderType')
    .optional()
    .isIn(['none', 'morning', 'evening', 'custom'])
    .withMessage('Reminder type must be none, morning, evening, or custom'),
  body('imageUrl')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Image URL must be less than 500 characters')
];

const taskUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task name must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  body('reminderType')
    .optional()
    .isIn(['none', 'morning', 'evening', 'custom'])
    .withMessage('Reminder type must be none, morning, evening, or custom')
];

router.get('/tasks', todoController.getTasks);
router.get('/tasks/stats', todoController.getTaskStats);
router.get('/tasks/:id', param('id').isUUID(), todoController.getTask);
router.post('/tasks', taskValidation, todoController.createTask);
router.put('/tasks/:id', param('id').isUUID(), taskUpdateValidation, todoController.updateTask);
router.delete('/tasks/:id', param('id').isUUID(), todoController.deleteTask);
router.patch('/tasks/:id/toggle', param('id').isUUID(), todoController.toggleTaskCompletion);

module.exports = router;
