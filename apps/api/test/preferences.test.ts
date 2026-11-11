import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { mockDb } from './mockDb';

vi.mock('@tempo/database', async () => {
  const { mockDb } = await import('./mockDb');
  return { prisma: mockDb.prismaMock };
});

process.env.NODE_ENV = 'test';

import { createApp } from '../src/app';

describe('Preferences & Onboarding Endpoints', () => {
  const app = createApp();
  let authCookie: string[];

  beforeEach(async () => {
    mockDb.reset();

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Pref User',
      email: 'pref@example.com',
      password: 'Password123!',
    });

    authCookie = reg.headers['set-cookie'];
  });

  it('retrieves default preferences for authenticated user', async () => {
    const res = await request(app).get('/api/preferences').set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timezone).toBe('Asia/Kolkata');
    expect(res.body.data.onboardingCompleted).toBe(false);
  });

  it('successfully updates user preferences and marks onboarding completed', async () => {
    const updatePayload = {
      timezone: 'America/New_York',
      wakeTime: '06:30',
      sleepTime: '22:30',
      preferredWorkStart: '08:30',
      preferredWorkEnd: '17:00',
      breakfastTime: '07:30',
      lunchTime: '12:30',
      dinnerTime: '19:30',
      preferredBreakDuration: 20,
      maxContinuousWorkDuration: 100,
      dailyLeisureTarget: 90,
      onboardingCompleted: true,
    };

    const res = await request(app)
      .put('/api/preferences')
      .set('Cookie', authCookie)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timezone).toBe('America/New_York');
    expect(res.body.data.wakeTime).toBe('06:30');
    expect(res.body.data.onboardingCompleted).toBe(true);

    // Verify persistence via GET /api/preferences
    const getRes = await request(app).get('/api/preferences').set('Cookie', authCookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.timezone).toBe('America/New_York');
    expect(getRes.body.data.onboardingCompleted).toBe(true);
  });

  it('rejects invalid time format', async () => {
    const res = await request(app).put('/api/preferences').set('Cookie', authCookie).send({
      wakeTime: '25:70', // Invalid hour and minute
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects break duration outside allowed range', async () => {
    const res = await request(app).put('/api/preferences').set('Cookie', authCookie).send({
      preferredBreakDuration: 2, // Less than minimum (5 min)
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
