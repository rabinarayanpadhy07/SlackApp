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

const ADMIN_MESSAGE_LIMIT = 50;
const ADMIN_MESSAGE_SCAN_LIMIT = 200;

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

const buildUserCounts = async () => {
  const [users, workspaces] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    Workspace.find().select('ownerId members')
  ]);

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
    users,
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

export const listAdminUsersService = async () => {
  const { users, membershipCountMap, ownerCountMap } = await buildUserCounts();

  return users.map((user) =>
    mapUserForAdmin(
      user,
      membershipCountMap.get(user._id.toString()) || 0,
      ownerCountMap.get(user._id.toString()) || 0
    )
  );
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

export const listAdminWorkspacesService = async () => {
  const workspaces = await Workspace.find()
    .populate('ownerId', 'username email avatar')
    .populate('channels', 'name type')
    .populate('members.memberId', 'username email avatar')
    .sort({ createdAt: -1 });

  return workspaces.map((workspace) => ({
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

export const listAdminPaymentsService = async () => {
  const payments = await Payment.find()
    .populate('userId', 'username email plan avatar')
    .sort({ createdAt: -1 });

  return payments.map((payment) => ({
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
};

export const listAdminMessagesService = async (query = '') => {
  const messages = await Message.find()
    .populate('senderId', 'username email avatar')
    .populate('channelId', 'name workspaceId')
    .sort({ createdAt: -1 })
    .limit(ADMIN_MESSAGE_SCAN_LIMIT);

  const needle = query.trim().toLowerCase();
  const filteredMessages = needle
    ? messages.filter((message) =>
        [
          message.body,
          message.senderId?.username,
          message.senderId?.email,
          message.channelId?.name
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle))
      )
    : messages;

  return filteredMessages.slice(0, ADMIN_MESSAGE_LIMIT).map((message) => ({
    _id: message._id,
    body: message.body,
    image: message.image,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt,
    isEdited: message.isEdited,
    sender: message.senderId
      ? {
          _id: message.senderId._id,
          username: message.senderId.username,
          email: message.senderId.email,
          avatar: message.senderId.avatar
        }
      : null,
    channel: message.channelId
      ? {
          _id: message.channelId._id,
          name: message.channelId.name,
          workspaceId: message.channelId.workspaceId
        }
      : null
  }));
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

export const listAdminAuditLogsService = async () => {
  const logs = await auditLogRepository.getRecentLogs(100);
  return logs.map(formatAuditLog);
};
