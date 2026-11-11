import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { mockDb } from './mockDb';

vi.mock('@tempo/database', async () => {
  const { mockDb } = await import('./mockDb');
  return { prisma: mockDb.prismaMock };
});

process.env.NODE_ENV = 'test';

import { createApp } from '../src/app';

describe('Multi-User Isolation & Security Enforcement', () => {
  const app = createApp();
  let userACookie: string[];
  let userBCookie: string[];
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    mockDb.reset();

    // Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userACookie = regA.headers['set-cookie'];
    userAId = regA.body.data.user.id;

    // Register User B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password456!',
    });
    userBCookie = regB.headers['set-cookie'];
    userBId = regB.body.data.user.id;
  });

  it('guarantees User A cannot access User B profile', async () => {
    const resA = await request(app).get('/api/profile').set('Cookie', userACookie);

    expect(resA.status).toBe(200);
    expect(resA.body.data.user.id).toBe(userAId);
    expect(resA.body.data.user.email).toBe('usera@example.com');
    expect(resA.body.data.user.id).not.toBe(userBId);

    const resB = await request(app).get('/api/profile').set('Cookie', userBCookie);

    expect(resB.status).toBe(200);
    expect(resB.body.data.user.id).toBe(userBId);
    expect(resB.body.data.user.email).toBe('userb@example.com');
  });

  it('prevents spoofing userId in preferences update', async () => {
    // User B sets initial timezone to 'Asia/Kolkata'
    await request(app)
      .put('/api/preferences')
      .set('Cookie', userBCookie)
      .send({ timezone: 'Asia/Kolkata' });

    // User A attempts to overwrite User B's preferences by passing userId in body
    const spoofAttempt = await request(app)
      .put('/api/preferences')
      .set('Cookie', userACookie)
      .send({
        userId: userBId, // Attempted spoof
        timezone: 'Europe/London',
      });

    expect(spoofAttempt.status).toBe(200);
    // User A's preferences are updated
    expect(spoofAttempt.body.data.userId).toBe(userAId);
    expect(spoofAttempt.body.data.timezone).toBe('Europe/London');

    // Verify User B's preferences were NOT altered
    const checkB = await request(app).get('/api/preferences').set('Cookie', userBCookie);

    expect(checkB.status).toBe(200);
    expect(checkB.body.data.userId).toBe(userBId);
    expect(checkB.body.data.timezone).toBe('Asia/Kolkata');
  });

  it('rejects tampered or forged authentication cookies', async () => {
    const forgedCookie = ['tempo_session=fake_invalid_token_1234567890abcdef; Path=/; HttpOnly'];

    const res = await request(app).get('/api/auth/me').set('Cookie', forgedCookie);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });

  it('enforces CSRF protection on mutation requests in production', async () => {
    const { csrfProtection } = await import('../src/middleware/csrf');

    const mockReq = {
      method: 'POST',
      path: '/api/preferences',
      headers: {
        'x-test-csrf-enforce': '1',
        origin: 'http://malicious-attacker.com',
      },
    } as any;

    let statusCode = 200;
    let jsonBody: any = null;
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (body: any) => {
        jsonBody = body;
        return mockRes;
      },
    } as any;

    let nextCalled = false;
    csrfProtection(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonBody.error.code).toBe('CSRF_INVALID_ORIGIN');
  });
});
