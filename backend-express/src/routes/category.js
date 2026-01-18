const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTasksByCategory
} = require('../controllers/categoryController');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// All category routes require authentication
router.use(authenticateToken);

// Get all categories
router.get('/', getCategories);

// Create a new category
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ max: 50 })
      .withMessage('Category name must be at most 50 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex code (e.g., #2196f3)'),
    body('icon')
      .optional()
      .isString()
      .withMessage('Icon must be a string'),
    validateRequest
  ],
  createCategory
);

// Update a category
router.patch(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category name cannot be empty')
      .isLength({ max: 50 })
      .withMessage('Category name must be at most 50 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex code (e.g., #2196f3)'),
    body('icon')
      .optional()
      .isString()
      .withMessage('Icon must be a string'),
    validateRequest
  ],
  updateCategory
);

// Delete a category
router.delete('/:id', deleteCategory);

// Get tasks by category
router.get('/:id/tasks', getTasksByCategory);

module.exports = router;
