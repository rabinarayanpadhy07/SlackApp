import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const workspaceServiceMocks = vi.hoisted(() => ({
  addChannelToWorkspaceService: vi.fn(async () => ({
    _id: 'workspace-1',
    channels: [{ _id: 'channel-2', name: 'engineering' }]
  })),
  addMemberToWorkspaceService: vi.fn(async () => ({ success: true })),
  createWorkspaceService: vi.fn(async ({ name, owner }) => ({
    _id: 'workspace-1',
    name,
    ownerId: owner,
    channels: [{ _id: 'channel-1', name: 'general' }]
  })),
  deleteWorkspaceService: vi.fn(async () => ({ deletedWorkspaceId: 'workspace-1' })),
  getWorkspaceByJoinCodeService: vi.fn(async () => ({
    _id: 'workspace-1',
    name: 'Engineering',
    joinCode: 'ABC123',
    isMember: false
  })),
  getWorkspaceService: vi.fn(async () => ({
    _id: 'workspace-1',
    name: 'Engineering',
    channels: [{ _id: 'channel-1', name: 'general' }]
  })),
  getWorkspacesUserIsMemberOfService: vi.fn(async () => []),
  joinWorkspaceService: vi.fn(async () => ({ _id: 'workspace-1', joined: true })),
  removeMemberFromWorkspaceService: vi.fn(async () => ({ success: true })),
  resetWorkspaceJoinCodeService: vi.fn(async () => ({ joinCode: 'ABC123' })),
  updateMemberRoleService: vi.fn(async () => ({ success: true })),
  updateWorkspaceService: vi.fn(async () => ({ _id: 'workspace-1', name: 'Updated' }))
}));

vi.mock('../config/bullBoardConfig.js', () => ({
  default: {
    getRouter: () => (req, res, next) => next()
  }
}));

vi.mock('../middlewares/authMiddleware.js', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { _id: 'user-1', email: 'owner@example.com' };
    next();
  }
}));

vi.mock('../services/workspaceService.js', () => workspaceServiceMocks);

const { createApp } = await import('../app.js');

describe('workspace routes', () => {
  beforeEach(() => {
    Object.values(workspaceServiceMocks).forEach((mockFn) => mockFn.mockClear());
  });

  it('creates a workspace and injects the authenticated owner id', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app)
      .post('/api/v1/workspaces')
      .send({ name: 'Engineering HQ', description: 'Core team workspace' });

    expect(response.status).toBe(201);
    expect(workspaceServiceMocks.createWorkspaceService).toHaveBeenCalledWith({
      name: 'Engineering HQ',
      description: 'Core team workspace',
      owner: 'user-1'
    });
  });

  it('fetches a workspace preview from a join code', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app).get('/api/v1/workspaces/join/ABC123');

    expect(response.status).toBe(200);
    expect(response.body.data.joinCode).toBe('ABC123');
    expect(workspaceServiceMocks.getWorkspaceByJoinCodeService).toHaveBeenCalledWith(
      'ABC123',
      'user-1'
    );
  });

  it('rejects invalid channel payloads before calling the service', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app)
      .put('/api/v1/workspaces/workspace-1/channels')
      .send({ channelName: 'a' });

    expect(response.status).toBe(400);
    expect(workspaceServiceMocks.addChannelToWorkspaceService).not.toHaveBeenCalled();
  });

  it('joins a workspace with the provided code', async () => {
    const app = createApp({ includeBullBoard: false });

    const response = await request(app)
      .put('/api/v1/workspaces/workspace-1/join')
      .send({ joinCode: 'ABC123' });

    expect(response.status).toBe(200);
    expect(workspaceServiceMocks.joinWorkspaceService).toHaveBeenCalledWith(
      'workspace-1',
      'ABC123',
      'user-1'
    );
  });
});
