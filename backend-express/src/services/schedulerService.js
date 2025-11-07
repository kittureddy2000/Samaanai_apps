const cron = require('node-cron');
const { prisma } = require('../config/database');
const { sendWeeklyReportEmail, sendCalorieReminderEmail } = require('./emailService');
const { sendWeeklyReportNotification, sendCalorieReminderNotification } = require('./pushNotificationService');
const { sendTaskReminderEmail } = require('./emailService');
const { sendTaskReminderNotification } = require('./pushNotificationService');

/**
 * Calculate weekly report data for a user
 */
const calculateWeeklyReport = async (userId) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get nutrition stats
  const mealEntries = await prisma.mealEntry.findMany({
    where: {
      userId,
      date: {
        gte: oneWeekAgo
      }
    }
  });

  const exerciseEntries = await prisma.exerciseEntry.findMany({
    where: {
      userId,
      date: {
        gte: oneWeekAgo
      }
    }
  });

  const nutritionStats = {
    daysLogged: new Set(mealEntries.map(m => m.date.toISOString().split('T')[0])).size,
    totalCalories: mealEntries.reduce((sum, m) => sum + m.calories, 0),
    totalBurned: exerciseEntries.reduce((sum, e) => sum + e.caloriesBurned, 0)
  };

  nutritionStats.avgCalories = nutritionStats.daysLogged > 0
    ? nutritionStats.totalCalories / nutritionStats.daysLogged
    : 0;
  nutritionStats.totalNet = nutritionStats.totalCalories - nutritionStats.totalBurned;

  // Get task stats
  const tasks = await prisma.task.findMany({
    where: { userId }
  });

  const tasksCompletedThisWeek = await prisma.task.count({
    where: {
      userId,
      completedAt: {
        gte: oneWeekAgo
      }
    }
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
    completedThisWeek: tasksCompletedThisWeek
  };

  // Get finance stats (if Plaid integration exists)
  // This is a placeholder - adjust based on your finance schema
  const financeStats = {
    totalBalance: 0,
    weeklySpending: 0
  };

  return {
    nutrition: nutritionStats.daysLogged > 0 ? nutritionStats : null,
    tasks: taskStats,
    finance: financeStats.totalBalance !== 0 ? financeStats : null
  };
};

/**
 * Send weekly reports to all users who have opted in
 */
const sendWeeklyReports = async () => {
  try {
    console.log('Starting weekly report generation...');

    // Get all users with weekly reports enabled
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        profile: {
          weeklyReports: true
        }
      },
      include: {
        profile: true
      }
    });

    console.log(`Found ${users.length} users with weekly reports enabled`);

    for (const user of users) {
      try {
        // Calculate report data
        const reportData = await calculateWeeklyReport(user.id);

        // Send email if email notifications are enabled
        if (user.profile.emailNotifications && user.email) {
          await sendWeeklyReportEmail(user, reportData);
          console.log(`Sent weekly report email to ${user.email}`);
        }

        // Send push notification if notifications are enabled and push token exists
        if (user.profile.notifications && user.profile.pushToken) {
          const summary = `${reportData.tasks.completedThisWeek} tasks completed this week!`;
          await sendWeeklyReportNotification(user.profile.pushToken, summary);
          console.log(`Sent weekly report push notification to ${user.username}`);
        }
      } catch (error) {
        console.error(`Error sending weekly report to user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log('Weekly report generation completed');
  } catch (error) {
    console.error('Error in sendWeeklyReports:', error);
  }
};

/**
 * Send reminders for tasks due today or tomorrow
 */
const sendTaskReminders = async () => {
  try {
    console.log('Starting task reminder checks...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get tasks due today or tomorrow that are not completed
    const tasks = await prisma.task.findMany({
      where: {
        completed: false,
        dueDate: {
          gte: today,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) // End of tomorrow
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    console.log(`Found ${tasks.length} tasks requiring reminders`);

    for (const task of tasks) {
      try {
        const user = task.user;

        // Check if user has notifications enabled
        if (!user.profile) continue;

        // Send email reminder if enabled
        if (user.profile.emailNotifications && user.email) {
          await sendTaskReminderEmail(user, task);
          console.log(`Sent task reminder email to ${user.email} for task ${task.name}`);
        }

        // Send push notification if enabled
        if (user.profile.notifications && user.profile.pushToken) {
          await sendTaskReminderNotification(user.profile.pushToken, task);
          console.log(`Sent task reminder push to ${user.username} for task ${task.name}`);
        }
      } catch (error) {
        console.error(`Error sending reminder for task ${task.id}:`, error);
        // Continue with other tasks even if one fails
      }
    }

    console.log('Task reminder checks completed');
  } catch (error) {
    console.error('Error in sendTaskReminders:', error);
  }
};

/**
 * Send calorie entry reminders to users based on their notification_time preference
 */
const sendCalorieReminders = async () => {
  try {
    console.log('Starting calorie entry reminder checks...');

    // Get current time in HH:MM format (UTC)
    const now = new Date();
    const currentHour = now.getUTCHours().toString().padStart(2, '0');
    const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log(`Current UTC time: ${currentTime}`);

    // Get all active users with notifications enabled
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        profile: {
          OR: [
            { notifications: true },
            { emailNotifications: true }
          ]
        }
      },
      include: {
        profile: true
      }
    });

    console.log(`Found ${users.length} users for calorie reminders`);

    let notificationsSent = 0;

    for (const user of users) {
      try {
        if (!user.profile) continue;

        // Get user's preferred notification time (default to 14:30 if not set)
        const userNotificationTime = user.profile.notificationTime || '14:30';

        // Check if current time matches user's preferred time (within 30-minute window)
        // This allows for the cron job running every 30 minutes
        const [userHour, userMinute] = userNotificationTime.split(':').map(Number);
        const [currentHourNum, currentMinuteNum] = [parseInt(currentHour), parseInt(currentMinute)];

        // Calculate if we're within 30 minutes of the user's preferred time
        const userTimeInMinutes = userHour * 60 + userMinute;
        const currentTimeInMinutes = currentHourNum * 60 + currentMinuteNum;
        const timeDiff = Math.abs(currentTimeInMinutes - userTimeInMinutes);

        // Skip if not within 30-minute window (considering the cron runs every 30 mins)
        if (timeDiff >= 30) {
          continue;
        }

        console.log(`Sending notification to ${user.username} (preferred time: ${userNotificationTime})`);

        // Send email reminder if enabled
        if (user.profile.emailNotifications && user.email) {
          await sendCalorieReminderEmail(user);
          console.log(`Sent calorie reminder email to ${user.email}`);
        }

        // Send push notification if enabled
        if (user.profile.notifications && user.profile.pushToken) {
          await sendCalorieReminderNotification(user.profile.pushToken);
          console.log(`Sent calorie reminder push to ${user.username}`);
          notificationsSent++;
        }
      } catch (error) {
        console.error(`Error sending calorie reminder to user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log(`Calorie entry reminder checks completed. Sent ${notificationsSent} push notifications.`);
  } catch (error) {
    console.error('Error in sendCalorieReminders:', error);
  }
};

/**
 * Initialize all scheduled jobs
 */
const initializeScheduler = () => {
  console.log('Initializing scheduler service...');

  // Weekly reports - Run every Monday at 8:00 AM PST
  cron.schedule('0 8 * * 1', () => {
    console.log('Running weekly report job...');
    sendWeeklyReports();
  }, {
    timezone: 'America/Los_Angeles'
  });

  // Morning task reminders - Run every day at 6:30 AM PST
  cron.schedule('30 6 * * *', () => {
    console.log('Running morning task reminder job...');
    sendTaskReminders();
  }, {
    timezone: 'America/Los_Angeles'
  });

  // Evening task reminders - Run every day at 8:00 PM PST
  cron.schedule('0 20 * * *', () => {
    console.log('Running evening task reminder job...');
    sendTaskReminders();
  }, {
    timezone: 'America/Los_Angeles'
  });

  // Calorie reminders - Run every 30 minutes to check user preferences
  // This allows personalized notification times for each user
  cron.schedule('*/30 * * * *', () => {
    console.log('Running personalized calorie reminder job...');
    sendCalorieReminders();
  });

  console.log('Scheduler service initialized successfully');
  console.log('Scheduled jobs:');
  console.log('- Weekly reports: Every Monday at 8:00 AM PST');
  console.log('- Morning task reminders: Every day at 6:30 AM PST');
  console.log('- Evening task reminders: Every day at 8:00 PM PST');
  console.log('- Personalized calorie reminders: Every 30 minutes (respects user notification_time preference)');
};

/**
 * Send weekly report on demand for a specific user (for testing or manual triggers)
 */
const sendWeeklyReportForUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const reportData = await calculateWeeklyReport(userId);

    const results = {
      email: null,
      push: null
    };

    if (user.profile.emailNotifications && user.email) {
      results.email = await sendWeeklyReportEmail(user, reportData);
    }

    if (user.profile.notifications && user.profile.pushToken) {
      const summary = `${reportData.tasks.completedThisWeek} tasks completed this week!`;
      results.push = await sendWeeklyReportNotification(user.profile.pushToken, summary);
    }

    return results;
  } catch (error) {
    console.error('Error sending weekly report for user:', error);
    throw error;
  }
};

module.exports = {
  initializeScheduler,
  sendWeeklyReports,
  sendTaskReminders,
  sendCalorieReminders,
  calculateWeeklyReport,
  sendWeeklyReportForUser
};
