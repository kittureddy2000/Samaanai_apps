/**
 * Task Sync Service
 * Orchestrates synchronization between Microsoft To Do and Samaanai tasks
 */

const { prisma } = require('../config/database');
const microsoftOAuthService = require('./microsoftOAuthService');
const microsoftGraphService = require('./microsoftGraphService');

/**
 * Sync tasks from Microsoft To Do to Samaanai
 * @param {string} userId - User ID to sync tasks for
 * @returns {Promise<{success: boolean, results: Object, tasks: Array, error: string|null}>}
 */
exports.syncTasksFromMicrosoft = async (userId) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  const syncedTasks = [];
  let error = null;

  try {
    // 1. Get user's Microsoft integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      throw new Error('Microsoft integration not found. Please connect your Microsoft account first.');
    }

    // 2. Get valid access token (refresh if needed)
    const accessToken = await microsoftOAuthService.getValidAccessToken(
      integration,
      async (updatedTokens) => {
        // Update integration with new tokens
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: updatedTokens.accessToken,
            refreshToken: updatedTokens.refreshToken,
            expiresAt: updatedTokens.expiresAt
          }
        });
      }
    );

    // 3. Fetch and transform tasks from Microsoft
    console.log(`Fetching tasks from Microsoft To Do for user ${userId}...`);
    const msTasks = await microsoftGraphService.getAndTransformTasks(accessToken);

    console.log(`Found ${msTasks.length} tasks from Microsoft To Do`);

    // 4. Process each task
    for (const msTask of msTasks) {
      try {
        const result = await exports.createOrUpdateTask(userId, msTask);
        syncedTasks.push(result.task);

        if (result.action === 'created') {
          results.created++;
        } else if (result.action === 'updated') {
          results.updated++;
        } else {
          results.skipped++;
        }
      } catch (taskError) {
        console.error(`Error syncing task ${msTask.microsoftTodoId}:`, taskError);
        results.errors++;
      }
    }

    console.log(`Sync completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);

    return {
      success: results.errors === 0,
      results,
      tasks: syncedTasks,
      error: results.errors > 0 ? `${results.errors} tasks failed to sync` : null
    };

  } catch (err) {
    console.error('Error syncing tasks from Microsoft:', err);
    error = err.message || 'Failed to sync tasks';

    return {
      success: false,
      results,
      tasks: syncedTasks,
      error
    };
  }
};

/**
 * Create or update a task in Samaanai database
 * Per user requirements: Microsoft always wins (overwrite Samaanai)
 * @param {string} userId - User ID
 * @param {Object} msTask - Transformed Microsoft task
 * @returns {Promise<{action: string, task: Object}>}
 */
exports.createOrUpdateTask = async (userId, msTask) => {
  try {
    // Check if task already exists for THIS USER by microsoftTodoId
    // IMPORTANT: We must filter by userId to avoid updating other users' tasks
    const existingTask = await prisma.task.findFirst({
      where: {
        userId: userId,
        microsoftTodoId: msTask.microsoftTodoId
      }
    });

    // Process attachments - store as JSON string in imageUrl field
    let imageUrl = null;
    if (msTask.attachments && msTask.attachments.length > 0) {
      // Store all attachments metadata as JSON
      imageUrl = JSON.stringify(msTask.attachments);
      console.log(`Storing ${msTask.attachments.length} attachment(s) for task "${msTask.name}"`);
    }

    if (existingTask) {
      // Task exists for this user - UPDATE
      // Per user requirements: Microsoft always wins
      const updatedTask = await prisma.task.update({
        where: {
          id: existingTask.id
        },
        data: {
          name: msTask.name,
          description: msTask.description,
          dueDate: msTask.dueDate ? new Date(msTask.dueDate) : null,
          completed: msTask.completed,
          completedAt: msTask.completedAt,
          imageUrl: imageUrl,
          // microsoftTodoId stays the same
        }
      });

      return {
        action: 'updated',
        task: updatedTask
      };
    } else {
      // Task doesn't exist for this user - CREATE
      const newTask = await prisma.task.create({
        data: {
          userId: userId,
          name: msTask.name,
          description: msTask.description,
          dueDate: msTask.dueDate ? new Date(msTask.dueDate) : null,
          completed: msTask.completed,
          completedAt: msTask.completedAt,
          microsoftTodoId: msTask.microsoftTodoId,
          reminderType: msTask.reminderType,
          imageUrl: imageUrl
        }
      });

      return {
        action: 'created',
        task: newTask
      };
    }
  } catch (error) {
    console.error(`Error creating/updating task ${msTask.microsoftTodoId}:`, error);
    throw error;
  }
};

/**
 * Get sync statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<{totalTasks: number, syncedTasks: number, lastSync: Date|null}>}
 */
exports.getSyncStats = async (userId) => {
  try {
    // Get total tasks for user
    const totalTasks = await prisma.task.count({
      where: { userId }
    });

    // Get synced tasks (tasks with microsoftTodoId)
    const syncedTasks = await prisma.task.count({
      where: {
        userId,
        microsoftTodoId: { not: null }
      }
    });

    // Get last sync time (updatedAt of most recently synced task)
    const lastSyncedTask = await prisma.task.findFirst({
      where: {
        userId,
        microsoftTodoId: { not: null }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        updatedAt: true
      }
    });

    return {
      totalTasks,
      syncedTasks,
      lastSync: lastSyncedTask ? lastSyncedTask.updatedAt : null
    };
  } catch (error) {
    console.error('Error getting sync stats:', error);
    throw error;
  }
};

/**
 * Clear all synced tasks for a user (when disconnecting integration)
 * Note: This only clears the microsoftTodoId field, not the tasks themselves
 * Per user requirements: Keep existing Samaanai tasks
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of tasks updated
 */
exports.clearSyncedTasks = async (userId) => {
  try {
    const result = await prisma.task.updateMany({
      where: {
        userId,
        microsoftTodoId: { not: null }
      },
      data: {
        microsoftTodoId: null
      }
    });

    console.log(`Cleared Microsoft sync data from ${result.count} tasks`);
    return result.count;
  } catch (error) {
    console.error('Error clearing synced tasks:', error);
    throw error;
  }
};

/**
 * Validate sync prerequisites
 * @param {string} userId - User ID
 * @returns {Promise<{valid: boolean, message: string|null}>}
 */
exports.validateSyncPrerequisites = async (userId) => {
  try {
    // Check if integration exists
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'microsoft'
        }
      }
    });

    if (!integration) {
      return {
        valid: false,
        message: 'Microsoft integration not connected'
      };
    }

    // Check if tokens are present
    if (!integration.accessToken) {
      return {
        valid: false,
        message: 'Access token missing. Please reconnect your Microsoft account.'
      };
    }

    return {
      valid: true,
      message: null
    };
  } catch (error) {
    console.error('Error validating sync prerequisites:', error);
    return {
      valid: false,
      message: 'Failed to validate sync prerequisites'
    };
  }
};
