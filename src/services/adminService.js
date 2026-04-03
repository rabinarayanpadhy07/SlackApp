import { StatusCodes } from 'http-status-codes';

import auditLogRepository from '../repositories/auditLogRepository.js';
import channelRepository from '../repositories/channelRepostiory.js';
import userRepository from '../repositories/userRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import Channel from '../schema/channel.js';
import Message from '../schema/message.js';
import Payment from '../schema/payment.js';
import ReadReceipt from '../schema/readReceipt.js';
import User from '../schema/user.js';
import Workspace from '../schema/workspace.js';
import ClientError from '../utils/errors/clientError.js';
import { recordAuditLog } from './auditLogService.js';

const DEFAULT_ADMIN_PAGE = 1;
const DEFAULT_ADMIN_LIMIT = 10;
const MAX_ADMIN_LIMIT = 25;

const mapUserForAdmin = (user, workspaceCount = 0, ownedWorkspaceCount = 0) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  plan: user.plan,
  isVerified: user.isVerified,
  isSuperAdmin: user.isSuperAdmin,
  isActive: user.isActive,
  suspendedAt: user.suspendedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  workspaceCount,
  ownedWorkspaceCount
});

const formatAuditLog = (log) => ({
  _id: log._id,
  action: log.action,
  targetType: log.targetType,
  targetId: log.targetId,
  metadata: log.metadata,
  createdAt: log.createdAt,
  actor: log.actorId
    ? {
        _id: log.actorId._id,
        username: log.actorId.username,
        email: log.actorId.email,
        avatar: log.actorId.avatar,
        isSuperAdmin: log.actorId.isSuperAdmin
      }
    : null
});

const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePagination = (page = 1, limit = DEFAULT_ADMIN_LIMIT) => {
  const safePage = Math.max(
    DEFAULT_ADMIN_PAGE,
    Number.parseInt(page, 10) || DEFAULT_ADMIN_PAGE
  );
  const safeLimit = Math.min(
    MAX_ADMIN_LIMIT,
    Math.max(1, Number.parseInt(limit, 10) || DEFAULT_ADMIN_LIMIT)
  );

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
};

const buildPaginatedResponse = (items, page, limit, total) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1
  }
});

const buildUserSearchFilter = (search = '') => {
  const trimmed = search.trim();
  if (!trimmed) {
    return {};
  }

  const regex = new RegExp(escapeRegex(trimmed), 'i');
  const orFilters = [
    { username: regex },
    { email: regex },
    { plan: regex }
  ];

  if ('active'.includes(trimmed.toLowerCase())) {
    orFilters.push({ isActive: true });
  }

  if (
    'suspended'.includes(trimmed.toLowerCase()) ||
    'blocked'.includes(trimmed.toLowerCase())
  ) {
    orFilters.push({ isActive: false });
  }

  if ('admin'.includes(trimmed.toLowerCase())) {
    orFilters.push({ isSuperAdmin: true });
  }

  return {
    $or: orFilters
  };
};

const buildWorkspaceSearchFilter = (search = '') => {
  const trimmed = search.trim();
  if (!trimmed) {
    return {};
  }

  const regex = new RegExp(escapeRegex(trimmed), 'i');
  const orFilters = [{ name: regex }, { description: regex }];

  if ('active'.includes(trimmed.toLowerCase())) {
    orFilters.push({ isArchived: { $ne: true } });
  }

  if ('archived'.includes(trimmed.toLowerCase())) {
    orFilters.push({ isArchived: true });
  }

  return {
    $or: orFilters
  };
};

const buildUserCounts = async () => {
  const workspaces = await Workspace.find().select('ownerId members');

  const membershipCountMap = new Map();
  const ownerCountMap = new Map();

  workspaces.forEach((workspace) => {
    const ownerId = workspace.ownerId?.toString();
    if (ownerId) {
      ownerCountMap.set(ownerId, (ownerCountMap.get(ownerId) || 0) + 1);
    }

    workspace.members.forEach((member) => {
      const memberId = member.memberId?.toString();
      if (memberId) {
        membershipCountMap.set(
          memberId,
          (membershipCountMap.get(memberId) || 0) + 1
        );
      }
    });
  });

  return {
    membershipCountMap,
    ownerCountMap
  };
};

export const getAdminOverviewService = async () => {
  const [
    totalUsers,
    totalPaidUsers,
    totalSuperAdmins,
    totalSuspendedUsers,
    totalWorkspaces,
    totalArchivedWorkspaces,
    totalChannels,
    totalMessages,
    totalDeletedMessages,
    totalPayments,
    successfulPayments,
    recentUsers,
    recentPayments,
    recentAuditLogs
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ plan: 'Paid' }),
    User.countDocuments({ isSuperAdmin: true }),
    User.countDocuments({ isActive: false }),
    Workspace.countDocuments(),
    Workspace.countDocuments({ isArchived: true }),
    Channel.countDocuments(),
    Message.countDocuments(),
    Message.countDocuments({ deletedAt: { $ne: null } }),
    Payment.countDocuments(),
    Payment.find({ status: 'success' }),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'username email plan isSuperAdmin createdAt avatar isActive suspendedAt'
      ),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'username email avatar plan'),
    auditLogRepository.getRecentLogs(10)
  ]);

  const grossRevenue = successfulPayments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );

  return {
    metrics: {
      totalUsers,
      totalPaidUsers,
      totalSuperAdmins,
      totalSuspendedUsers,
      totalWorkspaces,
      totalArchivedWorkspaces,
      totalChannels,
      totalMessages,
      totalDeletedMessages,
      totalPayments,
      grossRevenue
    },
    recentUsers: recentUsers.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      plan: user.plan,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      suspendedAt: user.suspendedAt,
      createdAt: user.createdAt
    })),
    recentPayments: recentPayments.map((payment) => ({
      _id: payment._id,
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      user: payment.userId
        ? {
            _id: payment.userId._id,
            username: payment.userId.username,
            email: payment.userId.email,
            avatar: payment.userId.avatar,
            plan: payment.userId.plan
          }
        : null
    })),
    recentAuditLogs: recentAuditLogs.map(formatAuditLog)
  };
};

export const listAdminUsersService = async ({
  page = DEFAULT_ADMIN_PAGE,
  limit = DEFAULT_ADMIN_LIMIT,
  search = ''
} = {}) => {
  const { membershipCountMap, ownerCountMap } = await buildUserCounts();
  const filter = buildUserSearchFilter(search);
  const { page: safePage, limit: safeLimit, skip } = normalizePagination(
    page,
    limit
  );
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    User.countDocuments(filter)
  ]);

  const items = users.map((user) =>
    mapUserForAdmin(
      user,
      membershipCountMap.get(user._id.toString()) || 0,
      ownerCountMap.get(user._id.toString()) || 0
    )
  );

  return buildPaginatedResponse(items, safePage, safeLimit, total);
};

export const updateAdminUserService = async (
  targetUserId,
  updates,
  actorUserId
) => {
  const targetUser = await userRepository.getById(targetUserId);
  if (!targetUser) {
    throw new ClientError({
      message: 'User not found',
      explanation: 'User not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const actorUser = await userRepository.getById(actorUserId);
  if (!actorUser) {
    throw new ClientError({
      message: 'Acting user not found',
      explanation: 'User not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const payload = {};

  if (updates.plan) {
    if (!['Normal', 'Paid'].includes(updates.plan)) {
      throw new ClientError({
        message: 'Invalid plan',
        explanation: 'Plan must be Normal or Paid',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }
    payload.plan = updates.plan;
  }

  if (typeof updates.isSuperAdmin === 'boolean') {
    if (
      actorUserId.toString() === targetUserId.toString() &&
      updates.isSuperAdmin === false
    ) {
      throw new ClientError({
        message: 'You cannot remove your own super admin access',
        explanation: 'At least one super admin must remain active',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    payload.isSuperAdmin = updates.isSuperAdmin;
  }

  if (typeof updates.isActive === 'boolean') {
    if (
      actorUserId.toString() === targetUserId.toString() &&
      updates.isActive === false
    ) {
      throw new ClientError({
        message: 'You cannot suspend your own account',
        explanation: 'Choose another super admin to manage your account',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    payload.isActive = updates.isActive;
    payload.suspendedAt = updates.isActive ? null : new Date();
  }

  const updatedUser = await userRepository.update(targetUserId, payload);
  await recordAuditLog({
    actorId: actorUserId,
    action: 'admin.user.updated',
    targetType: 'user',
    targetId: targetUserId,
    metadata: payload
  });

  const { membershipCountMap, ownerCountMap } = await buildUserCounts();

  return mapUserForAdmin(
    updatedUser,
    membershipCountMap.get(updatedUser._id.toString()) || 0,
    ownerCountMap.get(updatedUser._id.toString()) || 0
  );
};

export const listAdminWorkspacesService = async ({
  page = DEFAULT_ADMIN_PAGE,
  limit = DEFAULT_ADMIN_LIMIT,
  search = ''
} = {}) => {
  const filter = buildWorkspaceSearchFilter(search);
  const { page: safePage, limit: safeLimit, skip } = normalizePagination(
    page,
    limit
  );
  const [workspaces, total] = await Promise.all([
    Workspace.find(filter)
      .populate('ownerId', 'username email avatar')
      .populate('channels', 'name type')
      .populate('members.memberId', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Workspace.countDocuments(filter)
  ]);

  const items = workspaces.map((workspace) => ({
    _id: workspace._id,
    name: workspace.name,
    description: workspace.description,
    joinCode: workspace.joinCode,
    createdAt: workspace.createdAt,
    isArchived: workspace.isArchived,
    archivedAt: workspace.archivedAt,
    owner: workspace.ownerId
      ? {
          _id: workspace.ownerId._id,
          username: workspace.ownerId.username,
          email: workspace.ownerId.email,
          avatar: workspace.ownerId.avatar
        }
      : null,
    memberCount: workspace.members.length,
    channelCount: workspace.channels.length,
    members: workspace.members.map((member) => ({
      _id: member.memberId?._id,
      username: member.memberId?.username,
      email: member.memberId?.email,
      avatar: member.memberId?.avatar,
      role: member.role
    })),
    channels: workspace.channels.map((channel) => ({
      _id: channel._id,
      name: channel.name,
      type: channel.type
    }))
  }));

  return buildPaginatedResponse(items, safePage, safeLimit, total);
};

export const updateAdminWorkspaceService = async (
  workspaceId,
  updates,
  actorUserId
) => {
  const workspace = await workspaceRepository.getById(workspaceId);
  if (!workspace) {
    throw new ClientError({
      message: 'Workspace not found',
      explanation: 'Workspace not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const payload = {};

  if (typeof updates.isArchived === 'boolean') {
    payload.isArchived = updates.isArchived;
    payload.archivedAt = updates.isArchived ? new Date() : null;
  }

  const updatedWorkspace = await workspaceRepository.update(workspaceId, payload);

  await recordAuditLog({
    actorId: actorUserId,
    action: updates.isArchived
      ? 'admin.workspace.archived'
      : 'admin.workspace.restored',
    targetType: 'workspace',
    targetId: workspaceId,
    metadata: payload
  });

  return {
    _id: updatedWorkspace._id,
    isArchived: updatedWorkspace.isArchived,
    archivedAt: updatedWorkspace.archivedAt
  };
};

export const deleteAdminWorkspaceService = async (workspaceId, actorUserId) => {
  const workspace = await workspaceRepository.getById(workspaceId);
  if (!workspace) {
    throw new ClientError({
      message: 'Workspace not found',
      explanation: 'Workspace not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const channelIds = workspace.channels.map((channelId) => channelId.toString());

  if (channelIds.length > 0) {
    await Promise.all([
      Message.deleteMany({ channelId: { $in: channelIds } }),
      ReadReceipt.deleteMany({ channelId: { $in: channelIds } }),
      channelRepository.deleteMany(channelIds)
    ]);
  }

  await workspaceRepository.delete(workspaceId);
  await recordAuditLog({
    actorId: actorUserId,
    action: 'admin.workspace.deleted',
    targetType: 'workspace',
    targetId: workspaceId,
    metadata: {
      workspaceName: workspace.name
    }
  });

  return {
    deletedWorkspaceId: workspaceId
  };
};

export const listAdminPaymentsService = async ({
  page = DEFAULT_ADMIN_PAGE,
  limit = DEFAULT_ADMIN_LIMIT
} = {}) => {
  const { page: safePage, limit: safeLimit, skip } = normalizePagination(
    page,
    limit
  );
  const [payments, total] = await Promise.all([
    Payment.find()
      .populate('userId', 'username email plan avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Payment.countDocuments()
  ]);

  const items = payments.map((payment) => ({
    _id: payment._id,
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    status: payment.status,
    amount: payment.amount,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    user: payment.userId
      ? {
          _id: payment.userId._id,
          username: payment.userId.username,
          email: payment.userId.email,
          plan: payment.userId.plan,
          avatar: payment.userId.avatar
        }
      : null
  }));

  return buildPaginatedResponse(items, safePage, safeLimit, total);
};

export const listAdminMessagesService = async ({
  page = DEFAULT_ADMIN_PAGE,
  limit = DEFAULT_ADMIN_LIMIT,
  search = ''
} = {}) => {
  const { page: safePage, limit: safeLimit, skip } = normalizePagination(
    page,
    limit
  );
  const trimmedSearch = search.trim();
  const searchRegex = trimmedSearch
    ? new RegExp(escapeRegex(trimmedSearch), 'i')
    : null;

  const aggregationPipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'senderId',
        foreignField: '_id',
        as: 'sender'
      }
    },
    {
      $unwind: {
        path: '$sender',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'channels',
        localField: 'channelId',
        foreignField: '_id',
        as: 'channel'
      }
    },
    {
      $unwind: {
        path: '$channel',
        preserveNullAndEmptyArrays: true
      }
    },
    ...(searchRegex
      ? [
          {
            $match: {
              $or: [
                { body: searchRegex },
                { 'sender.username': searchRegex },
                { 'sender.email': searchRegex },
                { 'channel.name': searchRegex }
              ]
            }
          }
        ]
      : []),
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: safeLimit },
          {
            $project: {
              _id: 1,
              body: 1,
              image: 1,
              createdAt: 1,
              deletedAt: 1,
              isEdited: 1,
              sender: {
                _id: '$sender._id',
                username: '$sender.username',
                email: '$sender.email',
                avatar: '$sender.avatar'
              },
              channel: {
                _id: '$channel._id',
                name: '$channel.name',
                workspaceId: '$channel.workspaceId'
              }
            }
          }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await Message.aggregate(aggregationPipeline);
  const items = result?.items || [];
  const total = result?.total?.[0]?.count || 0;

  return buildPaginatedResponse(items, safePage, safeLimit, total);
};

export const deleteAdminMessageService = async (messageId, actorUserId) => {
  const message = await Message.findById(messageId)
    .populate('senderId', 'username email')
    .populate('channelId', 'name');

  if (!message) {
    throw new ClientError({
      message: 'Message not found',
      explanation: 'Message not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  message.deletedAt = new Date();
  await message.save();

  await recordAuditLog({
    actorId: actorUserId,
    action: 'admin.message.deleted',
    targetType: 'message',
    targetId: messageId,
    metadata: {
      senderEmail: message.senderId?.email,
      channelName: message.channelId?.name
    }
  });

  return {
    _id: message._id,
    deletedAt: message.deletedAt
  };
};

export const listAdminAuditLogsService = async ({
  page = DEFAULT_ADMIN_PAGE,
  limit = DEFAULT_ADMIN_LIMIT
} = {}) => {
  const { page: safePage, limit: safeLimit, skip } = normalizePagination(
    page,
    limit
  );
  const [logs, total] = await Promise.all([
    auditLogRepository
      .getRecentLogs(safeLimit, skip),
    auditLogRepository.countDocuments()
  ]);

  return buildPaginatedResponse(
    logs.map(formatAuditLog),
    safePage,
    safeLimit,
    total
  );
};
