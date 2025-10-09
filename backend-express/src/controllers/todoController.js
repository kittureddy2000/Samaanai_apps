const { prisma } = require('../config/database');

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

    res.json({ task });
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

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
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

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        completed: !existingTask.completed,
        completedAt: !existingTask.completed ? new Date() : null
      }
    });

    res.json({ task });
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
