const { prisma } = require('../config/database');
const { sendEmail } = require('../services/emailService');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        profile: true
      }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { height, weight, dateOfBirth, metabolicRate, weightLossGoal, firstName, lastName } = req.body;

    // Update user
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName })
      }
    });

    // Update profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: req.user.id },
      update: {
        ...(height !== undefined && { height }),
        ...(weight !== undefined && { weight }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(metabolicRate && { metabolicRate }),
        ...(weightLossGoal !== undefined && { weightLossGoal })
      },
      create: {
        userId: req.user.id,
        height,
        weight,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        metabolicRate,
        weightLossGoal
      }
    });

    res.json({ user: { ...user, profile } });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        timezone: true,
        startOfWeek: true,
        notifications: true,
        emailNotifications: true,
        weeklyReports: true,
        darkMode: true,
        notificationTime: true
      }
    });

    res.json({ preferences: profile });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const {
      timezone,
      startOfWeek,
      notifications,
      emailNotifications,
      weeklyReports,
      darkMode,
      pushToken,
      notificationTime,
      testEmail
    } = req.body;

    const profile = await prisma.userProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(timezone && { timezone }),
        ...(startOfWeek !== undefined && { startOfWeek }),
        ...(notifications !== undefined && { notifications }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(weeklyReports !== undefined && { weeklyReports }),
        ...(darkMode !== undefined && { darkMode }),
        ...(pushToken !== undefined && { pushToken }),
        ...(notificationTime && { notificationTime })
      }
    });

    // Send test email if requested
    if (testEmail) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { email: true, username: true }
        });

        await sendEmail({
          to: user.email,
          subject: 'Test Notification from Samaanai',
          html: `
            <h2>Test Notification</h2>
            <p>Hi ${user.username || 'there'},</p>
            <p>This is a test email from Samaanai to verify that your email notifications are working correctly.</p>
            <p>If you're seeing this email, your notification system is working perfectly!</p>
            <br>
            <p><strong>Your current notification settings:</strong></p>
            <ul>
              <li>Email Notifications: ${profile.emailNotifications ? 'Enabled' : 'Disabled'}</li>
              <li>Daily Reminder Time: ${profile.notificationTime || '14:30'} UTC</li>
              <li>Weekly Reports: ${profile.weeklyReports ? 'Enabled' : 'Disabled'}</li>
            </ul>
            <br>
            <p>Best regards,<br>The Samaanai Team</p>
          `
        });

        console.log(`Sent test email to ${user.email}`);
      } catch (emailError) {
        console.error('Error sending test email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ preferences: profile });
  } catch (error) {
    next(error);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;

    console.log('=== Push Token Registration Request ===');
    console.log('User ID:', req.user.id);
    console.log('Username:', req.user.username);
    console.log('Push Token:', pushToken);
    console.log('Request Body:', JSON.stringify(req.body));

    if (!pushToken) {
      console.error('❌ Push token missing from request body');
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Update or create profile with push token
    const profile = await prisma.userProfile.upsert({
      where: { userId: req.user.id },
      update: { pushToken },
      create: {
        userId: req.user.id,
        pushToken
      }
    });

    console.log('✅ Push token registered successfully for user:', req.user.username);
    console.log('Profile updated:', { userId: profile.userId, hasPushToken: !!profile.pushToken });

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    next(error);
  }
};