const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });

  return { accessToken, refreshToken };
};

// Register new user
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        profile: {
          create: {}
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profile: true
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is inactive'
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (payload.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type'
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    res.json(tokens);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
    }
    next(error);
  }
};

// Logout (client-side token removal mainly)
exports.logout = async (req, res) => {
  // In a more advanced setup, you could blacklist the token
  res.json({ message: 'Logged out successfully' });
};

// WebAuthn / Passkey methods (placeholders for full implementation)
exports.passkeyRegisterBegin = async (req, res) => {
  // TODO: Implement WebAuthn registration challenge generation
  // Use @simplewebauthn/server library
  res.status(501).json({ error: 'Not implemented yet' });
};

exports.passkeyRegisterComplete = async (req, res) => {
  // TODO: Implement WebAuthn registration verification
  res.status(501).json({ error: 'Not implemented yet' });
};

exports.passkeyAuthenticateBegin = async (req, res) => {
  // TODO: Implement WebAuthn authentication challenge
  res.status(501).json({ error: 'Not implemented yet' });
};

exports.passkeyAuthenticateComplete = async (req, res) => {
  // TODO: Implement WebAuthn authentication verification
  res.status(501).json({ error: 'Not implemented yet' });
};

exports.getPasskeyCredentials = async (req, res, next) => {
  try {
    const credentials = await prisma.webAuthnCredential.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsed: true
      }
    });

    res.json({ credentials });
  } catch (error) {
    next(error);
  }
};

exports.deletePasskeyCredential = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.webAuthnCredential.delete({
      where: {
        id,
        userId: req.user.id
      }
    });

    res.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Google OAuth callback
exports.googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Get full user profile
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profile: true
      }
    });

    // Generate tokens as query parameters
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      user: JSON.stringify(userWithProfile)
    });

    // For web, redirect to localhost, for mobile use deep link
    const redirectUrl = process.env.GOOGLE_SUCCESS_REDIRECT || 'http://localhost:8081';

    console.log('🔍 OAuth Redirect Debug:');
    console.log('  GOOGLE_SUCCESS_REDIRECT env var:', process.env.GOOGLE_SUCCESS_REDIRECT);
    console.log('  Final redirectUrl:', redirectUrl);

    res.redirect(`${redirectUrl}?${params.toString()}`);
  } catch (error) {
    next(error);
  }
};