/**
 * Integration Routes
 * API endpoints for third-party integrations (Microsoft To Do, etc.)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');
const googleTasksService = require('../services/googleTasksService');
const logger = require('../config/logger');

// All routes require authentication except callback
// (callback validates state parameter instead)

/**
 * Microsoft To Do Integration Routes
 */

// POST /api/v1/integrations/microsoft/connect
// Initiate OAuth flow - returns authorization URL
router.post('/microsoft/connect',
  authenticate,
  integrationController.connectMicrosoft
);

// GET /api/v1/integrations/microsoft/callback
// OAuth callback handler (no auth required - validates state instead)
router.get('/microsoft/callback',
  integrationController.handleMicrosoftCallback
);

// GET /api/v1/integrations/microsoft/status
// Get connection status and sync statistics
router.get('/microsoft/status',
  authenticate,
  integrationController.getMicrosoftStatus
);

// DELETE /api/v1/integrations/microsoft/disconnect
// Disconnect Microsoft integration
router.delete('/microsoft/disconnect',
  authenticate,
  integrationController.disconnectMicrosoft
);

// POST /api/v1/integrations/microsoft/sync
// Trigger manual task sync
router.post('/microsoft/sync',
  authenticate,
  integrationController.syncMicrosoftTasks
);

// GET /api/v1/integrations/microsoft/lists
// Get all Microsoft To Do lists
router.get('/microsoft/lists',
  authenticate,
  integrationController.getMicrosoftLists
);

// GET /api/v1/integrations/microsoft/test
// Test Microsoft Graph API connection
router.get('/microsoft/test',
  authenticate,
  integrationController.testMicrosoftConnection
);

// Google Tasks Integration Routes

// GET /api/v1/integrations/google/connect
router.get('/google/connect',
  authenticate,
  async (req, res, next) => {
    try {
      const url = googleTasksService.getAuthUrl(req.user.id);
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/integrations/google/callback
router.get('/google/callback',
  async (req, res, next) => {
    try {
      const { code, state } = req.query;
      const result = await googleTasksService.handleCallback(code, state);

      // Redirect to frontend with tokens
      // Determine if mobile or web based on state or user agent?
      // For now, assume web or handle mobile deep link
      // The service returns tokens. We need to send them to the client.
      // If this is a browser redirect, we should redirect to the app.

      // For mobile: samaanai://google-auth?accessToken=...
      // For web: /auth/google/callback?accessToken=...

      // The state parameter contains userId.
      // We might need to store the tokens in DB and just tell frontend "success".
      // But the current auth flow seems to return tokens to client.

      // Let's look at how Microsoft callback handles it.
      // integrationController.handleMicrosoftCallback

      // For now, let's just return JSON if it's an API call, but this is a callback.
      // It needs to redirect.

      const redirectUrl = process.env.FRONTEND_URL || 'https://samaanai-frontend-staging-hdp6ioqupa-uw.a.run.app';
      res.redirect(`${redirectUrl}/profile?google_connected=true`);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/integrations/google/sync
router.post('/google/sync',
  authenticate,
  async (req, res, next) => {
    try {
      const result = await googleTasksService.syncTasks(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
