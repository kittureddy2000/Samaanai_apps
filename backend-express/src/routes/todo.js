const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const todoController = require('../controllers/todoController');

// All todo routes require authentication
router.use(authenticate);

router.get('/tasks', todoController.getTasks);
router.get('/tasks/stats', todoController.getTaskStats);
router.get('/tasks/:id', todoController.getTask);
router.post('/tasks', todoController.createTask);
router.put('/tasks/:id', todoController.updateTask);
router.delete('/tasks/:id', todoController.deleteTask);
router.patch('/tasks/:id/toggle', todoController.toggleTaskCompletion);

module.exports = router;
