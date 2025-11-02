const nodemailer = require('nodemailer');

// Create reusable transporter
// Supports: Gmail, SendGrid, AWS SES, Mailgun, Resend, etc.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Recommended settings for better deliverability
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service configuration error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

/**
 * Send a generic email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Samaanai'}" <${process.env.FROM_EMAIL || 'noreply@samaanai.com'}>`,
      to,
      subject,
      text,
      html
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 */
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Welcome to Samaanai!</h2>
      <p>Hi ${user.firstName || user.username},</p>
      <p>Thank you for joining Samaanai! We're excited to have you on board.</p>
      <p>With Samaanai, you can:</p>
      <ul>
        <li>Track your nutrition and calorie intake</li>
        <li>Manage your tasks and to-dos</li>
        <li>Monitor your financial health</li>
        <li>Get weekly progress reports</li>
      </ul>
      <p>Get started by completing your profile and setting your goals!</p>
      <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to Samaanai!',
    html,
    text: `Welcome to Samaanai! Thank you for joining us, ${user.firstName || user.username}.`
  });
};

/**
 * Send weekly report email
 */
const sendWeeklyReportEmail = async (user, reportData) => {
  const { nutrition, tasks, finance } = reportData;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Your Weekly Report</h2>
      <p>Hi ${user.firstName || user.username},</p>
      <p>Here's your weekly summary for the week ending ${new Date().toLocaleDateString()}:</p>

      ${nutrition ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
        <h3 style="color: #4caf50; margin-top: 0;">🥗 Nutrition</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Days Logged:</strong> ${nutrition.daysLogged}/7</li>
          <li><strong>Avg Daily Calories:</strong> ${Math.round(nutrition.avgCalories)}</li>
          <li><strong>Net Calories (Week):</strong> ${nutrition.totalNet > 0 ? '+' : ''}${Math.round(nutrition.totalNet)}</li>
        </ul>
      </div>
      ` : ''}

      ${tasks ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
        <h3 style="color: #ff9800; margin-top: 0;">✅ Tasks</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Total Tasks:</strong> ${tasks.total}</li>
          <li><strong>Completed:</strong> ${tasks.completed}</li>
          <li><strong>Pending:</strong> ${tasks.pending}</li>
          <li><strong>Overdue:</strong> ${tasks.overdue}</li>
        </ul>
      </div>
      ` : ''}

      ${finance ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
        <h3 style="color: #1976d2; margin-top: 0;">💰 Finance</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Total Balance:</strong> $${finance.totalBalance.toFixed(2)}</li>
          <li><strong>Weekly Spending:</strong> $${Math.abs(finance.weeklySpending).toFixed(2)}</li>
        </ul>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">Keep up the great work! 🎉</p>
      <p>Best regards,<br>The Samaanai Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Your Weekly Report from Samaanai',
    html,
    text: `Your weekly report from Samaanai for ${new Date().toLocaleDateString()}`
  });
};

/**
 * Send task reminder email
 */
const sendTaskReminderEmail = async (user, task) => {
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff9800;">Task Reminder</h2>
      <p>Hi ${user.firstName || user.username},</p>
      <p>This is a reminder about your task:</p>

      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #ff9800;">
        <h3 style="margin-top: 0;">${task.name}</h3>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <p><strong>Due Date:</strong> ${dueDate}</p>
      </div>

      <p>Don't forget to complete this task!</p>
      <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Reminder: ${task.name}`,
    html,
    text: `Reminder: ${task.name} - Due: ${dueDate}`
  });
};

/**
 * Send goal achievement email
 */
const sendGoalAchievementEmail = async (user, achievement) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4caf50;">Congratulations! 🎉</h2>
      <p>Hi ${user.firstName || user.username},</p>
      <p>Great news! You've reached a milestone:</p>

      <div style="margin: 20px 0; padding: 20px; background-color: #e8f5e9; border-radius: 8px; text-align: center;">
        <h3 style="color: #4caf50; font-size: 24px; margin: 0;">${achievement.title}</h3>
        <p style="font-size: 18px; margin: 10px 0;">${achievement.description}</p>
      </div>

      <p>Keep up the excellent work! 💪</p>
      <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `You've achieved a goal! ${achievement.title}`,
    html,
    text: `Congratulations! ${achievement.title} - ${achievement.description}`
  });
};

/**
 * Send calorie entry reminder email
 */
const sendCalorieReminderEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4caf50;">Don't Forget to Log Your Calories! 🍽️</h2>
      <p>Hi ${user.firstName || user.username},</p>
      <p>Just a friendly reminder to log your meals and calories for today.</p>

      <div style="margin: 20px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0;">Tracking your nutrition helps you:</p>
        <ul style="margin: 10px 0;">
          <li>Stay on top of your health goals</li>
          <li>Make better food choices</li>
          <li>See your weekly progress</li>
        </ul>
      </div>

      <p>Take a moment now to update your calorie log!</p>
      <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Reminder: Log Your Calories for Today',
    html,
    text: `Hi ${user.firstName || user.username}, don't forget to log your meals and calories for today!`
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendWeeklyReportEmail,
  sendTaskReminderEmail,
  sendGoalAchievementEmail,
  sendCalorieReminderEmail
};
