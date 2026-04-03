import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  requestPasswordResetService: vi.fn(async () => ({ success: true })),
  resetPasswordService: vi.fn(async () => ({ success: true })),
  setup2FAService: vi.fn(async () => ({ success: true })),
  signInService: vi.fn(async () => ({
    _id: 'user-1',
    email: 'tester@example.com',
    token: 'signed-token',
    username: 'tester'
  })),
  signUpService: vi.fn(async ({ email, username }) => ({
    _id: 'user-1',
    email,
    username
  })),
  verify2FAService: vi.fn(async () => ({ success: true })),
  verifyTokenService: vi.fn(async () => ({ success: true }))
}));

vi.mock('../config/bullBoardConfig.js', () => ({
  default: {
    getRouter: () => (req, res, next) => next()
  }
}));

vi.mock('../services/userService.js', () => serviceMocks);

const { createApp } = await import('../app.js');

describe('auth routes', () => {
  beforeEach(() => {
    Object.values(serviceMocks).forEach((mockFn) => mockFn.mockClear());
  });

  it('responds to ping', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app).get('/ping');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong' });
  });

  it('rejects invalid signup payloads before hitting the service', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app).post('/api/v1/users/signup').send({
      email: 'person@example.com',
      username: 'person1',
      password: '123'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Password must be at least 8 characters long');
    expect(serviceMocks.signUpService).not.toHaveBeenCalled();
  });

  it('requests a password reset with a generic success message', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'person@example.com' });

    expect(response.status).toBe(200);
    expect(serviceMocks.requestPasswordResetService).toHaveBeenCalledWith({
      email: 'person@example.com'
    });
    expect(response.body.message).toContain('If an account exists');
  });

  it('resets a password when the token and password are valid', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app)
      .post('/api/v1/users/reset-password')
      .send({
        token: '1234567890abcdef',
        password: 'StrongPass123'
      });

    expect(response.status).toBe(200);
    expect(serviceMocks.resetPasswordService).toHaveBeenCalledWith({
      token: '1234567890abcdef',
      password: 'StrongPass123'
    });
  });
});
