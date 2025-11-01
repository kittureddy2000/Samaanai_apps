const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true // Use FCM v1 API
});

/**
 * Validate that a push token is valid
 */
const isValidPushToken = (pushToken) => {
  return Expo.isExpoPushToken(pushToken);
};

/**
 * Send push notification to a single device
 */
const sendPushNotification = async ({ pushToken, title, body, data = {} }) => {
  // Check that the push token is valid
  if (!isValidPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { success: false, error: 'Invalid push token' };
  }

  // Construct the notification message
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high'
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('Push notification sent:', ticketChunk);
    return { success: true, ticket: ticketChunk[0] };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notifications to multiple devices
 */
const sendBulkPushNotifications = async (messages) => {
  // Filter out invalid tokens
  const validMessages = messages.filter(msg => isValidPushToken(msg.to));

  if (validMessages.length === 0) {
    console.log('No valid push tokens to send to');
    return { success: true, tickets: [] };
  }

  // Chunk messages for batch sending (Expo recommends max 100 at a time)
  const chunks = expo.chunkPushNotifications(validMessages);
  const tickets = [];

  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log(`Sent ${tickets.length} push notifications`);
    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send task reminder push notification
 */
const sendTaskReminderNotification = async (pushToken, task) => {
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';

  return sendPushNotification({
    pushToken,
    title: 'Task Reminder',
    body: `Don't forget: ${task.name}`,
    data: {
      type: 'task_reminder',
      taskId: task.id,
      taskName: task.name,
      dueDate: task.dueDate
    }
  });
};

/**
 * Send goal achievement push notification
 */
const sendGoalAchievementNotification = async (pushToken, achievement) => {
  return sendPushNotification({
    pushToken,
    title: 'Congratulations! 🎉',
    body: achievement.title,
    data: {
      type: 'goal_achievement',
      achievementId: achievement.id,
      title: achievement.title
    }
  });
};

/**
 * Send weekly report push notification
 */
const sendWeeklyReportNotification = async (pushToken, reportSummary) => {
  return sendPushNotification({
    pushToken,
    title: 'Your Weekly Report',
    body: reportSummary,
    data: {
      type: 'weekly_report'
    }
  });
};

/**
 * Send welcome push notification
 */
const sendWelcomeNotification = async (pushToken, userName) => {
  return sendPushNotification({
    pushToken,
    title: 'Welcome to Samaanai!',
    body: `Hi ${userName}, we're excited to have you on board!`,
    data: {
      type: 'welcome'
    }
  });
};

/**
 * Check push notification receipts to see if notifications were delivered
 */
const checkPushReceipts = async (tickets) => {
  const receiptIds = tickets
    .filter(ticket => ticket.status === 'ok')
    .map(ticket => ticket.id);

  if (receiptIds.length === 0) {
    return { success: true, receipts: [] };
  }

  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    const receipts = [];

    for (const chunk of receiptIdChunks) {
      const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
      receipts.push(receiptChunk);

      // Check for errors in receipts
      for (const receiptId in receiptChunk) {
        const { status, message, details } = receiptChunk[receiptId];
        if (status === 'error') {
          console.error(`Push notification receipt error:`, {
            receiptId,
            message,
            details
          });

          // Handle specific errors
          if (details && details.error === 'DeviceNotRegistered') {
            console.log(`Device token ${receiptId} is no longer registered`);
            // Here you could remove the invalid token from your database
          }
        }
      }
    }

    return { success: true, receipts };
  } catch (error) {
    console.error('Error checking push receipts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send calorie entry reminder notification
 */
const sendCalorieReminderNotification = async (pushToken) => {
  return sendPushNotification({
    pushToken,
    title: 'Log Your Calories 🍽️',
    body: 'Don\'t forget to track your meals for today!',
    data: {
      type: 'calorie_reminder',
      screen: 'Nutrition'
    }
  });
};

module.exports = {
  isValidPushToken,
  sendPushNotification,
  sendBulkPushNotifications,
  sendTaskReminderNotification,
  sendGoalAchievementNotification,
  sendWeeklyReportNotification,
  sendWelcomeNotification,
  sendCalorieReminderNotification,
  checkPushReceipts
};
