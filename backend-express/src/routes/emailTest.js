const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

// Simple test email endpoint (no auth required - development only!)
router.post('/send-simple-test-email', async (req, res, next) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'This endpoint is only available in development' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required in request body' });
    }

    const result = await sendEmail({
      to: email,
      subject: 'Test Email from Samaanai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Test Email Success! 🎉</h2>
          <p>Hi there,</p>
          <p>This is a test email from your Samaanai backend.</p>
          <p>If you're seeing this, your email notification system is <strong>working correctly</strong>!</p>
          <p><strong>Time sent:</strong> ${new Date().toLocaleString()}</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #e8f5e9; border-radius: 8px;">
            <h3 style="color: #4caf50; margin-top: 0;">✅ Email Configuration Verified</h3>
            <ul style="margin: 10px 0;">
              <li>SMTP connection: Working</li>
              <li>SendGrid API: Connected</li>
              <li>Email service: Operational</li>
            </ul>
          </div>
          <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
        </div>
      `,
      text: `Test email from Samaanai - sent at ${new Date().toLocaleString()}`
    });

    res.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.',
      messageId: result.messageId,
      sentTo: email
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// Test email endpoint with authentication
router.post('/send-test-email', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    const result = await sendEmail({
      to: user.email,
      subject: 'Test Email from Samaanai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Test Email Success!</h2>
          <p>Hi ${user.firstName || user.username},</p>
          <p>This is a test email from your Samaanai backend.</p>
          <p>If you're seeing this, your email notification system is working correctly! 🎉</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
          <p style="margin-top: 30px;">Best regards,<br>The Samaanai Team</p>
        </div>
      `,
      text: `Test email from Samaanai - sent at ${new Date().toLocaleString()}`
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      sentTo: user.email
    });
  } catch (error) {
    console.error('Test email error:', error);
    next(error);
  }
});

module.exports = router;
