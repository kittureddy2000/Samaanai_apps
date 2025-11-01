const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./database');
const { sendWelcomeEmail } = require('../services/emailService');

// Only configure Google OAuth if credentials are available
// This allows tests to run without Google OAuth setup
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/v1/auth/google/callback',
        passReqToCallback: true
      },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId }
            });
          }
          return done(null, user);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            username: profile.displayName || email.split('@')[0],
            googleId,
            password: null, // No password for OAuth users
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profile: {
              create: {}
            }
          }
        });

        // Send welcome email (async, don't wait for it)
        sendWelcomeEmail(user).catch(error => {
          console.error('Failed to send welcome email:', error);
          // Don't fail OAuth if email fails
        });

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
    )
  );
} else {
  console.warn('⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing)');
}

module.exports = passport;
