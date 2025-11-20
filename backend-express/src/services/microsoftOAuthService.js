const msal = require('@azure/msal-node');
const crypto = require('crypto');

// In-memory state storage (for production, use Redis or database)
// Maps state -> userId for OAuth flow validation
const stateStore = new Map();

// MSAL configuration
const getMsalConfig = () => {
  return {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      authority: `${process.env.MICROSOFT_AUTHORITY_URL || 'https://login.microsoftonline.com'}/${process.env.MICROSOFT_TENANT || 'common'}`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET
    }
  };
};

// Create MSAL confidential client
const getConfidentialClient = () => {
  return new msal.ConfidentialClientApplication(getMsalConfig());
};

// Required scopes for Microsoft To Do
const SCOPES = ['Tasks.ReadWrite', 'offline_access'];

/**
 * Generate authorization URL for Microsoft OAuth
 * @param {string} userId - User ID to associate with this OAuth flow
 * @param {string} redirectUri - Callback URL after authorization
 * @returns {Promise<{url: string, state: string}>}
 */
exports.getAuthorizationUrl = async (userId, redirectUri) => {
  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with userId mapping (expires in 10 minutes)
    stateStore.set(state, { userId, timestamp: Date.now() });

    // Clean up expired states (older than 10 minutes)
    setTimeout(() => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (const [key, value] of stateStore.entries()) {
        if (value.timestamp < tenMinutesAgo) {
          stateStore.delete(key);
        }
      }
    }, 0);

    const cca = getConfidentialClient();

    const authCodeUrlParameters = {
      scopes: SCOPES,
      redirectUri: redirectUri,
      state: state
    };

    const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);

    return { url: authUrl, state };
  } catch (error) {
    console.error('Error generating authorization URL:', error);
    throw new Error('Failed to generate authorization URL');
  }
};

/**
 * Validate state parameter from OAuth callback
 * @param {string} state - State parameter from callback
 * @returns {string|null} - userId if valid, null otherwise
 */
exports.validateState = (state) => {
  const stateData = stateStore.get(state);

  if (!stateData) {
    return null;
  }

  // Check if state is expired (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  if (stateData.timestamp < tenMinutesAgo) {
    stateStore.delete(state);
    return null;
  }

  // Clean up used state
  stateStore.delete(state);

  return stateData.userId;
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} redirectUri - Callback URL (must match the one used in getAuthorizationUrl)
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: Date}>}
 */
exports.exchangeCodeForTokens = async (code, redirectUri) => {
  try {
    const cca = getConfidentialClient();

    const tokenRequest = {
      code: code,
      scopes: SCOPES,
      redirectUri: redirectUri
    };

    const response = await cca.acquireTokenByCode(tokenRequest);

    if (!response || !response.accessToken) {
      throw new Error('No access token received');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (response.expiresIn || 3600));

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || null,
      expiresAt: expiresAt,
      scope: SCOPES.join(' ')
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<{accessToken: string, expiresAt: Date}>}
 */
exports.refreshAccessToken = async (refreshToken) => {
  try {
    const cca = getConfidentialClient();

    const refreshTokenRequest = {
      refreshToken: refreshToken,
      scopes: SCOPES
    };

    const response = await cca.acquireTokenByRefreshToken(refreshTokenRequest);

    if (!response || !response.accessToken) {
      throw new Error('No access token received from refresh');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (response.expiresIn || 3600));

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || refreshToken, // Use new refresh token if provided
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Check if access token is expired or will expire soon (within 5 minutes)
 * @param {Date} expiresAt - Token expiration time
 * @returns {boolean}
 */
exports.isTokenExpired = (expiresAt) => {
  if (!expiresAt) {
    return true;
  }

  const expirationTime = new Date(expiresAt);
  const fiveMinutesFromNow = new Date();
  fiveMinutesFromNow.setMinutes(fiveMinutesFromNow.getMinutes() + 5);

  return expirationTime <= fiveMinutesFromNow;
};

/**
 * Validate access token by making a test request
 * @param {string} accessToken - Access token to validate
 * @returns {Promise<boolean>}
 */
exports.validateToken = async (accessToken) => {
  try {
    // Make a simple request to Microsoft Graph to validate token
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Get valid access token, refreshing if necessary
 * @param {Object} integration - Integration object from database
 * @param {Function} updateCallback - Callback to update integration in database if token refreshed
 * @returns {Promise<string>} - Valid access token
 */
exports.getValidAccessToken = async (integration, updateCallback) => {
  // Check if token is expired
  if (!exports.isTokenExpired(integration.expiresAt)) {
    return integration.accessToken;
  }

  // Token is expired, refresh it
  if (!integration.refreshToken) {
    throw new Error('No refresh token available. User must re-authenticate.');
  }

  console.log('Access token expired, refreshing...');
  const { accessToken, refreshToken, expiresAt } = await exports.refreshAccessToken(integration.refreshToken);

  // Update integration in database via callback
  if (updateCallback) {
    await updateCallback({
      accessToken,
      refreshToken,
      expiresAt
    });
  }

  return accessToken;
};
