const { prisma } = require('../config/database');
const googleTasksService = require('../services/googleTasksService');
const logger = require('../config/logger');

exports.getTasks = async (req, res, next) => {
  try {
    const { completed, dueDate, reminderType } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.user.id,
        ...(completed !== undefined && { completed: completed === 'true' }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(reminderType && { reminderType })
      },
      orderBy: [
        { completed: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { name, description, dueDate, reminderType, imageUrl } = req.body;

    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderType,
        imageUrl
      }
    });

    // Tasks created in our app stay local - they don't sync to Google Tasks
    // Only tasks that originated from Google (via sync) will have two-way sync

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { name, description, dueDate, reminderType, imageUrl, completed } = req.body;

    // First verify the task belongs to the user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if this is a recurring task being marked as complete
    const isRecurring = existingTask.reminderType &&
                       ['daily', 'weekly', 'monthly', 'yearly'].includes(existingTask.reminderType);
    const isBeingCompleted = completed === true && !existingTask.completed;

    if (isRecurring && isBeingCompleted) {
      // For recurring tasks: create a completed copy and update the original with new due date

      // 1. Create a completed copy for history
      await prisma.task.create({
        data: {
          userId: existingTask.userId,
          name: name !== undefined ? name : existingTask.name,
          description: description !== undefined ? description : existingTask.description,
          dueDate: existingTask.dueDate,
          reminderType: reminderType !== undefined ? reminderType : existingTask.reminderType,
          imageUrl: imageUrl !== undefined ? imageUrl : existingTask.imageUrl,
          completed: true,
          completedAt: new Date(),
        }
      });

      // 2. Update original task with next due date and keep it incomplete
      const nextDueDate = calculateNextDueDate(
        existingTask.dueDate,
        reminderType !== undefined ? reminderType : existingTask.reminderType
      );

      const updateData = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        dueDate: nextDueDate,
        ...(reminderType !== undefined && { reminderType }),
        ...(imageUrl !== undefined && { imageUrl }),
        // Force completed to false for recurring tasks
        completed: false,
        completedAt: null
      };

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: updateData
      });

      console.log(`Recurring task "${task.name}" completed via update. Next due: ${nextDueDate?.toISOString().split('T')[0]}`);

      res.json({
        task,
        message: `Task completed! Next occurrence scheduled for ${nextDueDate?.toISOString().split('T')[0]}`
      });
    } else {
      // For non-recurring tasks: normal update
      const updateData = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(reminderType !== undefined && { reminderType }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(completed !== undefined && {
          completed,
          completedAt: completed ? new Date() : null
        })
      };

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: updateData
      });

      // Push updated task to Google Tasks if integrated AND task originated from Google
      try {
        logger.info(`[SYNC] Checking Google Tasks integration for user ${req.user.id}`);
        const integration = await prisma.integration.findUnique({
          where: {
            userId_provider: {
              userId: req.user.id,
              provider: 'google_tasks'
            }
          }
        });

        logger.info(`[SYNC] Integration found: ${!!integration}, googleTaskId: ${task.googleTaskId}`);

        if (integration && task.googleTaskId) {
          logger.info(`[SYNC] Pushing updated task "${task.name}" (completed: ${task.completed}) to Google Tasks for user ${req.user.id}`);
          await googleTasksService.pushTaskToGoogle(req.user.id, task);
          logger.info(`[SYNC] Successfully pushed task to Google`);
        } else if (integration && !task.googleTaskId) {
          logger.debug(`[SYNC] Skipping Google Tasks push - no googleTaskId`);
        } else if (!integration) {
          logger.debug(`[SYNC] No Google Tasks integration found`);
        }
      } catch (googleError) {
        logger.error(`[SYNC] Error pushing to Google:`, googleError);
      }

      res.json({ task });
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    // First verify the task belongs to the user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete from Google Tasks if integrated and has googleTaskId
    if (existingTask.googleTaskId) {
      try {
        const integration = await prisma.integration.findUnique({
          where: {
            userId_provider: {
              userId: req.user.id,
              provider: 'google_tasks'
            }
          }
        });

        if (integration) {
          logger.info(`Deleting task "${existingTask.name}" from Google Tasks for user ${req.user.id}`);
          await googleTasksService.deleteTaskFromGoogle(req.user.id, existingTask.googleTaskId);
        }
      } catch (googleError) {
        logger.error(`Failed to delete task from Google Tasks:`, googleError);
      }
    }

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate next due date based on reminder type
 * @param {Date} currentDueDate - Current due date
 * @param {String} reminderType - 'daily', 'weekly', 'monthly', 'yearly'
 * @returns {Date} - Next due date
 */
const calculateNextDueDate = (currentDueDate, reminderType) => {
  if (!currentDueDate || !reminderType) return null;

  const nextDate = new Date(currentDueDate);

  switch (reminderType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return nextDate;
};

exports.toggleTaskCompletion = async (req, res, next) => {
  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if this is a recurring task being marked as complete
    const isRecurring = existingTask.reminderType &&
                       ['daily', 'weekly', 'monthly', 'yearly'].includes(existingTask.reminderType);
    const isBeingCompleted = !existingTask.completed;

    if (isRecurring && isBeingCompleted) {
      // For recurring tasks: create a completed copy and update the original with new due date

      // 1. Create a completed copy for history
      await prisma.task.create({
        data: {
          userId: existingTask.userId,
          name: existingTask.name,
          description: existingTask.description,
          dueDate: existingTask.dueDate,
          reminderType: existingTask.reminderType,
          imageUrl: existingTask.imageUrl,
          completed: true,
          completedAt: new Date(),
          // Don't copy microsoftTodoId to avoid conflicts
        }
      });

      // 2. Update original task with next due date and keep it incomplete
      const nextDueDate = calculateNextDueDate(existingTask.dueDate, existingTask.reminderType);

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          dueDate: nextDueDate,
          // Keep completed = false (stays active)
          completedAt: null
        }
      });

      console.log(`Recurring task "${task.name}" completed. Next due: ${nextDueDate?.toISOString().split('T')[0]}`);

      res.json({
        task,
        message: `Task completed! Next occurrence scheduled for ${nextDueDate?.toISOString().split('T')[0]}`
      });
    } else {
      // For non-recurring tasks or uncompleting tasks: normal toggle
      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          completed: !existingTask.completed,
          completedAt: !existingTask.completed ? new Date() : null
        }
      });

      res.json({ task });
    }
  } catch (error) {
    next(error);
  }
};

exports.getTaskStats = async (req, res, next) => {
  try {
    const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
      prisma.task.count({
        where: { userId: req.user.id }
      }),
      prisma.task.count({
        where: {
          userId: req.user.id,
          completed: true
        }
      }),
      prisma.task.count({
        where: {
          userId: req.user.id,
          completed: false,
          dueDate: {
            lt: new Date()
          }
        }
      })
    ]);

    res.json({
      stats: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        overdue: overdueTasks
      }
    });
  } catch (error) {
    next(error);
  }
};
