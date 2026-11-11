import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { mockDb } from './mockDb';

vi.mock('@tempo/database', async () => {
  const { mockDb } = await import('./mockDb');
  return { prisma: mockDb.prismaMock };
});

// Set test environment
process.env.NODE_ENV = 'test';

import { createApp } from '../src/app';

describe('Authentication Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    mockDb.reset();
  });

  it('successfully registers a new user and sets auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mevin Joe',
      email: 'mevin@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('mevin@example.com');
    expect(res.body.data.user.name).toBe('Mevin Joe');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Security: never exposed
    expect(res.body.data.preference).toBeDefined();
    expect(res.body.data.preference.onboardingCompleted).toBe(false);

    // Verify Set-Cookie header contains tempo_session
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('tempo_session=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('rejects registration with duplicate email address', async () => {
    // Register first user
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'duplicate@example.com',
      password: 'Password123!',
    });

    // Attempt second registration with same email
    const res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'duplicate@example.com',
      password: 'Password456!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('successfully logs in with valid credentials and sets auth cookie', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'SecretPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'SecretPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('login@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies[0]).toContain('tempo_session=');
  });

  it('rejects login with incorrect password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Target User',
      email: 'target@example.com',
      password: 'CorrectPassword123!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'target@example.com',
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('successfully retrieves current authenticated user with valid session cookie', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Auth Me User',
      email: 'authme@example.com',
      password: 'Password123!',
    });

    const cookie = registerRes.headers['set-cookie'];

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('authme@example.com');
  });

  it('successfully logs out and invalidates session', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Logout User',
      email: 'logout@example.com',
      password: 'Password123!',
    });

    const cookie = registerRes.headers['set-cookie'];

    // Logout
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify subsequent request with that session cookie fails
    const subsequentRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(subsequentRes.status).toBe(401);
    expect(subsequentRes.body.error.code).toBe('INVALID_SESSION');
  });

  it('rejects expired sessions', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Expire User',
      email: 'expire@example.com',
      password: 'Password123!',
    });

    const cookie = registerRes.headers['set-cookie'];

    // Manually expire session in the database
    expect(mockDb.sessions.length).toBe(1);
    mockDb.sessions[0].expiresAt = new Date(Date.now() - 10000); // 10 seconds in past

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });
});
