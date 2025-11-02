const { prisma } = require('../config/database');

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
        darkMode: true
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
      pushToken
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
        ...(pushToken !== undefined && { pushToken })
      }
    });

    res.json({ preferences: profile });
  } catch (error) {
    next(error);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
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

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    next(error);
  }
};