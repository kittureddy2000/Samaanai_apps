/**
 * Integration Routes
 * API endpoints for third-party integrations (Microsoft To Do, etc.)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');

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

module.exports = router;
