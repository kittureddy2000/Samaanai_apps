const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

// All user routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);
router.post('/push-token', userController.registerPushToken);
router.post('/test-notification', userController.sendTestNotification);

module.exports = router;