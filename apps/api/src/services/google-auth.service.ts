import { prisma } from '../db';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, API_BASE_URL, FRONTEND_URL } from '../config';
import { APP_CONFIG } from '@tempo/shared';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateNonce,
  createSignedOAuthState,
  verifySignedOAuthState,
} from './crypto.service';
import { generateSessionToken, toUserDTO, toUserPreferenceDTO, hashPassword } from './auth.service';

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

// In-memory mock registry for tests
let mockTokenExchangeHandler:
  | ((
      code: string,
      codeVerifier: string
    ) => Promise<{
      access_token: string;
      id_token: string;
      refresh_token?: string;
      user_info: GoogleUserInfo;
    }>)
  | null = null;

export function setMockGoogleOAuthHandler(handler: typeof mockTokenExchangeHandler) {
  mockTokenExchangeHandler = handler;
}

export class GoogleAuthService {
  /**
   * Generates the Google OAuth 2.0 authorization URL for Login or Linking.
   * Uses minimal OpenID Connect scopes: 'openid email profile'.
   */
  getGoogleAuthUrl(options: {
    action: 'login' | 'link';
    userId?: string;
    customRedirectUri?: string;
  }): { url: string; state: string; codeVerifier: string; nonce: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const nonce = generateNonce();

    const redirectUri = options.customRedirectUri || `${API_BASE_URL}/api/auth/google/callback`;

    const state = createSignedOAuthState({
      action: options.action,
      userId: options.userId,
      codeVerifier,
      nonce,
      redirectUri,
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
      prompt: 'select_account',
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
      codeVerifier,
      nonce,
    };
  }

  /**
   * Exchanges authorization code for tokens and extracts verified Google profile.
   */
  async exchangeCodeForProfile(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<{ userInfo: GoogleUserInfo; refreshToken?: string; accessToken?: string }> {
    if (mockTokenExchangeHandler) {
      const res = await mockTokenExchangeHandler(code, codeVerifier);
      return {
        userInfo: res.user_info,
        refreshToken: res.refresh_token,
        accessToken: res.access_token,
      };
    }

    // Production Google OAuth Token Exchange
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      const error: any = new Error(`Failed to exchange authorization code: ${errBody}`);
      error.status = 400;
      error.code = 'OAUTH_EXCHANGE_FAILED';
      throw error;
    }

    const tokenData: any = await tokenResponse.json();

    // Fetch userinfo using access_token
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoResponse.ok) {
      const error: any = new Error('Failed to retrieve user profile from Google');
      error.status = 400;
      error.code = 'OAUTH_PROFILE_FAILED';
      throw error;
    }

    const userInfo = (await userinfoResponse.json()) as GoogleUserInfo;
    return {
      userInfo,
      refreshToken: tokenData.refresh_token,
      accessToken: tokenData.access_token,
    };
  }

  /**
   * Processes the Google OAuth callback for Login or Account Linking.
   */
  async handleCallback(params: {
    code: string;
    state: string;
    meta: { userAgent?: string; ipAddress?: string };
    authenticatedUserId?: string;
  }): Promise<{
    action: 'login' | 'link';
    user: any;
    preference?: any;
    rawToken?: string;
    redirectUrl: string;
    isNewUser?: boolean;
  }> {
    const verifiedState = verifySignedOAuthState<{
      action: 'login' | 'link';
      userId?: string;
      codeVerifier: string;
      nonce: string;
      redirectUri: string;
    }>(params.state);

    if (!verifiedState) {
      const error: any = new Error('Invalid or expired OAuth state parameter. Please try again.');
      error.status = 400;
      error.code = 'INVALID_OAUTH_STATE';
      throw error;
    }

    const { userInfo } = await this.exchangeCodeForProfile(
      params.code,
      verifiedState.codeVerifier,
      verifiedState.redirectUri
    );

    const googleSub = userInfo.sub;
    const googleEmail = userInfo.email.trim().toLowerCase();

    if (verifiedState.action === 'link') {
      // Must be an authenticated user to link account
      const userId = params.authenticatedUserId || verifiedState.userId;
      if (!userId) {
        const error: any = new Error('Authentication required to link a Google account');
        error.status = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
      }

      // Check if this Google sub is already linked to another Tempo user
      const existingLink = await prisma.oAuthConnection.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: googleSub,
          },
        },
      });

      if (existingLink && existingLink.userId !== userId) {
        const error: any = new Error(
          'This Google account is already linked to another Tempo user.'
        );
        error.status = 409;
        error.code = 'GOOGLE_ACCOUNT_ALREADY_LINKED';
        throw error;
      }

      // Create or update OAuthConnection for the current user
      await prisma.oAuthConnection.upsert({
        where: {
          userId_provider: {
            userId,
            provider: 'google',
          },
        },
        update: {
          providerId: googleSub,
          email: googleEmail,
          name: userInfo.name,
          picture: userInfo.picture,
        },
        create: {
          userId,
          provider: 'google',
          providerId: googleSub,
          email: googleEmail,
          name: userInfo.name,
          picture: userInfo.picture,
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preference: true, oauthConnections: true },
      });

      return {
        action: 'link',
        user: user ? toUserDTO(user) : null,
        preference: user?.preference ? toUserPreferenceDTO(user.preference) : null,
        redirectUrl: `${FRONTEND_URL}/profile?google_linked=success`,
      };
    }

    // ==========================================
    // ACTION === 'LOGIN'
    // ==========================================

    // 1. Check if Google sub is already linked to a Tempo user
    const existingConnection = await prisma.oAuthConnection.findUnique({
      where: {
        provider_providerId: {
          provider: 'google',
          providerId: googleSub,
        },
      },
      include: {
        user: {
          include: {
            preference: true,
            oauthConnections: true,
          },
        },
      },
    });

    let targetUser: any;
    let isNewUser = false;

    if (existingConnection) {
      // Existing Google account link: authenticate directly
      targetUser = existingConnection.user;
    } else {
      // 2. Check if a Tempo account exists with this email address
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: googleEmail },
        include: { oauthConnections: true },
      });

      if (existingUserByEmail) {
        // STRICT SECURITY REQUIREMENT:
        // Do not automatically link accounts solely because email addresses match!
        // Require user to sign in with password first and link in Settings.
        const error: any = new Error(
          'An account with this email already exists. Please log in with your password and link your Google account in Settings.'
        );
        error.status = 409;
        error.code = 'ACCOUNT_EXISTS_LINK_REQUIRED';
        throw error;
      }

      // 3. Brand new user registering via Google
      isNewUser = true;
      targetUser = await prisma.user.create({
        data: {
          email: googleEmail,
          name: userInfo.name || googleEmail.split('@')[0],
          passwordHash: null, // No password until explicitly set
          preference: {
            create: {
              timezone: 'Asia/Kolkata',
              onboardingCompleted: false,
            },
          },
          oauthConnections: {
            create: {
              provider: 'google',
              providerId: googleSub,
              email: googleEmail,
              name: userInfo.name,
              picture: userInfo.picture,
            },
          },
        },
        include: {
          preference: true,
          oauthConnections: true,
        },
      });
    }

    // Create session for authenticated user
    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + APP_CONFIG.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: targetUser.id,
        tokenHash,
        expiresAt,
        userAgent: params.meta.userAgent,
        ipAddress: params.meta.ipAddress,
      },
    });

    const redirectPath = isNewUser ? '/onboarding' : '/dashboard';

    return {
      action: 'login',
      user: toUserDTO(targetUser),
      preference: targetUser.preference ? toUserPreferenceDTO(targetUser.preference) : null,
      rawToken,
      redirectUrl: `${FRONTEND_URL}${redirectPath}`,
      isNewUser,
    };
  }

  /**
   * Sets or updates a password for a user.
   */
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Unlinks Google identity from the user's account.
   * Safety check: requires an alternate login method (passwordHash !== null).
   */
  async unlinkGoogle(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { oauthConnections: true },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!user.passwordHash) {
      const error: any = new Error(
        'You must set a password on your account before unlinking Google Login to prevent losing access.'
      );
      error.status = 400;
      error.code = 'PASSWORD_REQUIRED_BEFORE_UNLINK';
      throw error;
    }

    await prisma.oAuthConnection.deleteMany({
      where: {
        userId,
        provider: 'google',
      },
    });
  }
}

export const googleAuthService = new GoogleAuthService();
