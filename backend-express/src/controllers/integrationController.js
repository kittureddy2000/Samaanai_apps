/**
 * Integration Controller
 * Handles HTTP requests for Microsoft To Do integration
 */

const { prisma } = require('../config/database');
const microsoftOAuthService = require('../services/microsoftOAuthService');
const microsoftGraphService = require('../services/microsoftGraphService');
const taskSyncService = require('../services/taskSyncService');

/**
 * POST /api/v1/integrations/microsoft/connect
 * Initiate Microsoft OAuth flow
 */
exports.connectMicrosoft = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if integration already exists
    const existingIntegration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (existingIntegration) {
      return res.status(400).json({
        error: 'Microsoft integration already connected. Disconnect first to reconnect.'
      });
    }

    // Get redirect URI from environment or request
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
      `${req.protocol}://${req.get('host')}/api/v1/integrations/microsoft/callback`;

    // Generate authorization URL
    const { url, state } = await microsoftOAuthService.getAuthorizationUrl(userId, redirectUri);

    res.json({
      authorizationUrl: url,
      state: state
    });
  } catch (error) {
    console.error('Error initiating Microsoft OAuth:', error);
    next(error);
  }
};

/**
 * GET /api/v1/integrations/microsoft/callback
 * Handle OAuth callback from Microsoft
 */
exports.handleMicrosoftCallback = async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      console.error('OAuth error from Microsoft:', oauthError);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Connection Failed</h1>
            <p>Failed to connect Microsoft account: ${oauthError}</p>
            <p>You can close this window and try again.</p>
          </body>
        </html>
      `);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Request</title>
          </head>
          <body>
            <h1>Invalid Request</h1>
            <p>Missing authorization code or state parameter.</p>
          </body>
        </html>
      `);
    }

    // Validate state and get userId
    const userId = microsoftOAuthService.validateState(state);

    if (!userId) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid State</title>
          </head>
          <body>
            <h1>Invalid State</h1>
            <p>Invalid or expired state parameter. Please try connecting again.</p>
          </body>
        </html>
      `);
    }

    // Get redirect URI (must match the one used in connect)
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
      `${req.protocol}://${req.get('host')}/api/v1/integrations/microsoft/callback`;

    // Exchange code for tokens
    const tokens = await microsoftOAuthService.exchangeCodeForTokens(code, redirectUri);

    // Store integration in database
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      },
      create: {
        userId: userId,
        provider: 'microsoft',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope
      }
    });

    console.log(`Microsoft integration connected for user ${userId}`);

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connected Successfully</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .success {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 10px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #4caf50; margin-bottom: 20px; }
            p { font-size: 16px; line-height: 1.6; }
            .icon { font-size: 60px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="success">
            <div class="icon">✓</div>
            <h1>Successfully Connected!</h1>
            <p>Your Microsoft To Do account has been connected to Samaanai.</p>
            <p>You can now sync your tasks from Microsoft To Do.</p>
            <p style="margin-top: 30px; color: #666;">You can close this window and return to the app.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error handling Microsoft OAuth callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>Failed to complete Microsoft integration. Please try again.</p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }
};

/**
 * GET /api/v1/integrations/microsoft/status
 * Get Microsoft integration status
 */
exports.getMicrosoftStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      return res.json({
        connected: false,
        provider: 'microsoft',
        lastSync: null
      });
    }

    // Get sync stats
    const syncStats = await taskSyncService.getSyncStats(userId);

    res.json({
      connected: true,
      provider: 'microsoft',
      lastSync: syncStats.lastSync,
      syncedTasks: syncStats.syncedTasks,
      totalTasks: syncStats.totalTasks
    });
  } catch (error) {
    console.error('Error getting Microsoft status:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/integrations/microsoft/disconnect
 * Disconnect Microsoft integration
 */
exports.disconnectMicrosoft = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      return res.status(404).json({
        error: 'Microsoft integration not found'
      });
    }

    // Clear microsoftTodoId from synced tasks (keep the tasks, just remove sync link)
    await taskSyncService.clearSyncedTasks(userId);

    // Delete integration
    await prisma.integration.delete({
      where: {
        id: integration.id
      }
    });

    console.log(`Microsoft integration disconnected for user ${userId}`);

    res.json({
      message: 'Microsoft integration disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Microsoft integration:', error);
    next(error);
  }
};

/**
 * POST /api/v1/integrations/microsoft/sync
 * Trigger manual sync from Microsoft To Do
 */
exports.syncMicrosoftTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate prerequisites
    const validation = await taskSyncService.validateSyncPrerequisites(userId);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.message
      });
    }

    // Trigger sync
    console.log(`Manual sync triggered for user ${userId}`);
    const syncResult = await taskSyncService.syncTasksFromMicrosoft(userId);

    res.json({
      success: syncResult.success,
      results: syncResult.results,
      tasks: syncResult.tasks.map(task => ({
        id: task.id,
        name: task.name,
        completed: task.completed,
        dueDate: task.dueDate,
        microsoftTodoId: task.microsoftTodoId
      })),
      error: syncResult.error
    });
  } catch (error) {
    console.error('Error syncing Microsoft tasks:', error);
    next(error);
  }
};

/**
 * GET /api/v1/integrations/microsoft/lists
 * Get all Microsoft To Do lists
 */
exports.getMicrosoftLists = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      return res.status(404).json({
        error: 'Microsoft integration not found. Please connect your account first.'
      });
    }

    // Get valid access token
    const accessToken = await microsoftOAuthService.getValidAccessToken(
      integration,
      async (updatedTokens) => {
        await prisma.integration.update({
          where: { id: integration.id },
          data: updatedTokens
        });
      }
    );

    // Fetch lists from Microsoft
    const lists = await microsoftGraphService.getTodoLists(accessToken);

    res.json({
      lists: lists
    });
  } catch (error) {
    console.error('Error fetching Microsoft To Do lists:', error);
    next(error);
  }
};

/**
 * GET /api/v1/integrations/microsoft/test
 * Test Microsoft Graph API connection
 */
exports.testMicrosoftConnection = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      return res.status(404).json({
        error: 'Microsoft integration not found'
      });
    }

    // Get valid access token
    const accessToken = await microsoftOAuthService.getValidAccessToken(
      integration,
      async (updatedTokens) => {
        await prisma.integration.update({
          where: { id: integration.id },
          data: updatedTokens
        });
      }
    );

    // Test connection
    const testResult = await microsoftGraphService.testConnection(accessToken);

    res.json(testResult);
  } catch (error) {
    console.error('Error testing Microsoft connection:', error);
    next(error);
  }
};
