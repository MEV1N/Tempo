import { prisma } from '../db';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, API_BASE_URL, FRONTEND_URL } from '../config';
import {
  encrypt,
  decrypt,
  generateCodeVerifier,
  generateCodeChallenge,
  generateNonce,
  createSignedOAuthState,
  verifySignedOAuthState,
} from './crypto.service';
import { GoogleCalendarStatusDTO } from '@tempo/shared';

export interface GoogleCalendarEventItem {
  id: string;
  status?: string; // 'confirmed', 'tentative', 'cancelled'
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurringEventId?: string;
  etag?: string;
}

export interface GoogleCalendarApiResponse {
  items: GoogleCalendarEventItem[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

// In-memory mock handler for testing
let mockCalendarSyncHandler:
  ((userId: string, syncToken?: string | null) => Promise<GoogleCalendarApiResponse>) | null = null;

let mockCalendarTokenHandler:
  | ((
      code: string,
      codeVerifier: string
    ) => Promise<{
      access_token: string;
      refresh_token?: string;
      user_info: { sub: string; email: string };
    }>)
  | null = null;

export function setMockGoogleCalendarHandler(
  tokenHandler: typeof mockCalendarTokenHandler,
  syncHandler: typeof mockCalendarSyncHandler
) {
  mockCalendarTokenHandler = tokenHandler;
  mockCalendarSyncHandler = syncHandler;
}

export class GoogleCalendarService {
  /**
   * Generates authorization URL for Google Calendar connection with narrow read-only scope.
   */
  getCalendarAuthUrl(userId: string): { url: string; state: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const nonce = generateNonce();

    const redirectUri = `${API_BASE_URL}/api/google-calendar/callback`;

    const state = createSignedOAuthState({
      action: 'calendar_connect',
      userId,
      codeVerifier,
      nonce,
      redirectUri,
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly openid email',
      access_type: 'offline', // Required to obtain a refresh token
      prompt: 'consent', // Ensures refresh token is granted
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Handles callback from Google Calendar authorization.
   * Enforces that the authorized Google account matches the connected Google login identity.
   */
  async handleCallback(params: {
    code: string;
    state: string;
    authenticatedUserId: string;
  }): Promise<{ redirectUrl: string }> {
    const verifiedState = verifySignedOAuthState<{
      action: string;
      userId: string;
      codeVerifier: string;
      redirectUri: string;
    }>(params.state);

    if (!verifiedState || verifiedState.userId !== params.authenticatedUserId) {
      const error: any = new Error('Invalid or expired OAuth state parameter. Please try again.');
      error.status = 400;
      error.code = 'INVALID_OAUTH_STATE';
      throw error;
    }

    let tokenData: {
      access_token: string;
      refresh_token?: string;
      user_info: { sub: string; email: string };
    };

    if (mockCalendarTokenHandler) {
      tokenData = await mockCalendarTokenHandler(params.code, verifiedState.codeVerifier);
    } else {
      // Production Token Exchange
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: params.code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: verifiedState.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: verifiedState.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        const error: any = new Error(`Calendar token exchange failed: ${errText}`);
        error.status = 400;
        error.code = 'CALENDAR_TOKEN_EXCHANGE_FAILED';
        throw error;
      }

      const resJson: any = await tokenResponse.json();

      // Retrieve userinfo to verify Google identity
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${resJson.access_token}` },
      });
      const userInfo: any = await userinfoRes.json();

      tokenData = {
        access_token: resJson.access_token,
        refresh_token: resJson.refresh_token,
        user_info: { sub: userInfo.sub, email: userInfo.email },
      };
    }

    const { user_info, refresh_token } = tokenData;

    // Check existing Google OAuth Connection for this user
    const existingConnection = await prisma.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId: params.authenticatedUserId,
          provider: 'google',
        },
      },
    });

    if (existingConnection) {
      // STRICT REQUIREMENT: Authorized Google account MUST match existing linked Google login identity
      if (existingConnection.providerId !== user_info.sub) {
        const error: any = new Error(
          `Google Calendar account (${user_info.email}) does not match your linked Google login account (${existingConnection.email}).`
        );
        error.status = 400;
        error.code = 'GOOGLE_IDENTITY_MISMATCH';
        throw error;
      }
    } else {
      // Email/password user connecting Google Calendar: verify that this Google sub is not already linked elsewhere
      const usedElsewhere = await prisma.oAuthConnection.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: user_info.sub,
          },
        },
      });

      if (usedElsewhere && usedElsewhere.userId !== params.authenticatedUserId) {
        const error: any = new Error(
          'This Google account is already linked to another Tempo user.'
        );
        error.status = 409;
        error.code = 'GOOGLE_ACCOUNT_ALREADY_LINKED';
        throw error;
      }
    }

    // Encrypt refresh token if present
    const encryptedRefreshToken = refresh_token
      ? encrypt(refresh_token)
      : existingConnection?.encryptedRefreshToken;

    // Upsert OAuth connection with calendar connected
    await prisma.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId: params.authenticatedUserId,
          provider: 'google',
        },
      },
      update: {
        providerId: user_info.sub,
        email: user_info.email,
        calendarConnected: true,
        encryptedRefreshToken,
      },
      create: {
        userId: params.authenticatedUserId,
        provider: 'google',
        providerId: user_info.sub,
        email: user_info.email,
        calendarConnected: true,
        encryptedRefreshToken,
      },
    });

    // Trigger initial calendar synchronization
    try {
      await this.syncUserCalendar(params.authenticatedUserId, false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Calendar] Initial sync warning for user=${params.authenticatedUserId}: ${err.message}`
      );
    }

    return {
      redirectUrl: `${FRONTEND_URL}/profile?calendar_connected=success`,
    };
  }

  /**
   * Refreshes an expired access token using the stored encrypted refresh token.
   */
  async refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
    const refreshToken = decrypt(encryptedRefreshToken);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh Google access token: ${errText}`);
    }

    const data: any = await res.json();
    return data.access_token;
  }

  /**
   * Performs incremental or initial synchronization of user's Google Calendar.
   */
  async syncUserCalendar(
    userId: string,
    forceFullSync = false
  ): Promise<{ importedCount: number; deletedCount: number }> {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google',
        },
      },
    });

    if (!connection || !connection.calendarConnected) {
      return { importedCount: 0, deletedCount: 0 };
    }

    let items: GoogleCalendarEventItem[] = [];
    let nextSyncToken: string | undefined;

    if (mockCalendarSyncHandler) {
      const res = await mockCalendarSyncHandler(
        userId,
        forceFullSync ? null : connection.calendarSyncToken
      );
      items = res.items;
      nextSyncToken = res.nextSyncToken;
    } else {
      if (!connection.encryptedRefreshToken) {
        throw new Error('No refresh token available to sync Google Calendar');
      }

      const accessToken = await this.refreshAccessToken(connection.encryptedRefreshToken);
      let pageToken: string | undefined;

      do {
        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('maxResults', '250');

        if (connection.calendarSyncToken && !forceFullSync) {
          url.searchParams.set('syncToken', connection.calendarSyncToken);
        } else {
          // Window: 30 days past to 90 days future
          const minDate = new Date();
          minDate.setDate(minDate.getDate() - 30);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + 90);

          url.searchParams.set('timeMin', minDate.toISOString());
          url.searchParams.set('timeMax', maxDate.toISOString());
        }

        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.status === 410) {
          // Sync token expired: clear token and re-run full sync
          await prisma.oAuthConnection.update({
            where: { id: connection.id },
            data: { calendarSyncToken: null },
          });
          return this.syncUserCalendar(userId, true);
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Google Calendar API error: ${errText}`);
        }

        const data = (await res.json()) as GoogleCalendarApiResponse;
        items.push(...(data.items || []));
        pageToken = data.nextPageToken;
        if (data.nextSyncToken) {
          nextSyncToken = data.nextSyncToken;
        }
      } while (pageToken);
    }

    let importedCount = 0;
    let deletedCount = 0;

    for (const item of items) {
      if (item.status === 'cancelled') {
        // Event deleted or cancelled in Google Calendar
        const delRes = await prisma.calendarEvent.deleteMany({
          where: {
            userId,
            googleEventId: item.id,
          },
        });
        deletedCount += delRes.count;
        continue;
      }

      // Determine start and end times
      let startTime: Date;
      let endTime: Date;
      let isAllDay = false;

      if (item.start?.dateTime && item.end?.dateTime) {
        startTime = new Date(item.start.dateTime);
        endTime = new Date(item.end.dateTime);
      } else if (item.start?.date) {
        // All-day event (YYYY-MM-DD)
        isAllDay = true;
        startTime = new Date(`${item.start.date}T00:00:00.000Z`);
        const endDateStr = item.end?.date || item.start.date;
        endTime = new Date(`${endDateStr}T23:59:59.999Z`);
      } else {
        continue; // Skip malformed item
      }

      // Upsert into Tempo CalendarEvent table
      const existing = await prisma.calendarEvent.findFirst({
        where: {
          userId,
          googleEventId: item.id,
        },
      });

      if (existing) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: {
            title: item.summary || '(Untitled Event)',
            description: item.description || null,
            location: item.location || null,
            startTime,
            endTime,
            isAllDay,
            etag: item.etag,
            googleRecurringEventId: item.recurringEventId || null,
          },
        });
      } else {
        await prisma.calendarEvent.create({
          data: {
            userId,
            title: item.summary || '(Untitled Event)',
            description: item.description || null,
            location: item.location || null,
            startTime,
            endTime,
            isAllDay,
            eventType: 'COMMITMENT', // Treated as fixed commitment by scheduler!
            googleEventId: item.id,
            isGoogleEvent: true,
            etag: item.etag,
            googleRecurringEventId: item.recurringEventId || null,
          },
        });
      }
      importedCount++;
    }

    // Update connection metadata
    await prisma.oAuthConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        calendarSyncToken: nextSyncToken || connection.calendarSyncToken,
      },
    });

    return { importedCount, deletedCount };
  }

  /**
   * Retrieves Google Calendar connection and authorization status.
   */
  async getStatus(userId: string): Promise<GoogleCalendarStatusDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { oauthConnections: true },
    });

    const googleConnection = user?.oauthConnections.find((c: any) => c.provider === 'google');

    return {
      googleAccountConnected: !!googleConnection,
      googleEmail: googleConnection?.email || null,
      googleName: googleConnection?.name || null,
      googlePicture: googleConnection?.picture || null,
      calendarConnected: !!googleConnection?.calendarConnected,
      lastSyncedAt: googleConnection?.lastSyncedAt?.toISOString() || null,
      syncStatus: googleConnection?.calendarConnected ? 'IDLE' : 'IDLE',
      hasPasswordAuth: !!user?.passwordHash,
    };
  }

  /**
   * Disconnects Google Calendar without deleting user account or login identity.
   */
  async disconnectCalendar(userId: string): Promise<void> {
    await prisma.oAuthConnection.updateMany({
      where: {
        userId,
        provider: 'google',
      },
      data: {
        calendarConnected: false,
        encryptedRefreshToken: null,
        calendarSyncToken: null,
      },
    });
  }
}

export const googleCalendarService = new GoogleCalendarService();
