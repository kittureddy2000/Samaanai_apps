const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const passport = require('../config/passport');

// Validation middleware
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Capture client parameter and pass it through state
  const client = req.query.client || 'web';
  const state = JSON.stringify({ client });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: state
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  // Store state for later use
  const state = req.query.state;
  if (state) {
    try {
      const parsed = JSON.parse(state);
      req.clientType = parsed.client;
    } catch (e) {
      // If parsing fails, keep as is
      req.clientType = 'web';
    }
  }

  passport.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, next);
}, authController.googleCallback);

// WebAuthn / Passkey routes
router.post('/passkey/register/begin', authenticate, authController.passkeyRegisterBegin);
router.post('/passkey/register/complete', authenticate, authController.passkeyRegisterComplete);
router.post('/passkey/authenticate/begin', authController.passkeyAuthenticateBegin);
router.post('/passkey/authenticate/complete', authController.passkeyAuthenticateComplete);
router.get('/passkey/credentials', authenticate, authController.getPasskeyCredentials);
router.delete('/passkey/credentials/:id', authenticate, authController.deletePasskeyCredential);

module.exports = router;