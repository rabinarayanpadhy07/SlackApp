import { StatusCodes } from 'http-status-codes';

import channelRepository from '../repositories/channelRepostiory.js';
import messageRepository from '../repositories/messageRepository.js';
import userRepository from '../repositories/userRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import ReadReceipt from '../schema/readReceipt.js';
import ClientError from '../utils/errors/clientError.js';
import { isUserAdminOfWorkspace, isUserMemberOfWorkspace } from './workspaceService.js';

export const getChannelByIdService = async (channelId, userId) => {
  try {
    const channel =
      await channelRepository.getChannelWithWorkspaceDetails(channelId);
    const user = await userRepository.getById(userId);

    if (!channel || !channel.workspaceId) {
      throw new ClientError({
        message: 'Channel not found with the provided ID',
        explanation: 'Invalid data sent from the client',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isUserPartOfWorkspace = isUserMemberOfWorkspace(
      channel.workspaceId,
      userId
    );

    if (!isUserPartOfWorkspace) {
      throw new ClientError({
        message:
          'User is not a member of the workspace and hence cannot access the channel',
        explanation: 'User is not a member of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    const messages = await messageRepository.getPaginatedMessaged(
      {
        channelId
      },
      1,
      20
    );

    console.log('Channel in service', channel);

    return {
      messages,
      _id: channel._id,
      name: channel.name,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      workspaceId: channel.workspaceId,
      aiAccess: user?.plan === 'Paid',
      latestHuddleSummary:
        user?.plan === 'Paid' ? channel.latestHuddleSummary || null : null
    };
  } catch (error) {
    console.log('Get channel by ID service error', error);
    throw error;
  }
};

export const updateChannelService = async (channelId, channelName, userId) => {
  try {
    const sanitizedChannelName = channelName.trim();
    const channel = await channelRepository.getChannelWithWorkspaceDetails(channelId);

    if (!channel || !channel.workspaceId) {
      throw new ClientError({
        message: 'Channel not found with the provided ID',
        explanation: 'Invalid data sent from the client',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const workspaceId = channel.workspaceId?._id || channel.workspaceId;
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        message: 'Workspace not found',
        explanation: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) {
      throw new ClientError({
        message: 'User is not an admin of the workspace',
        explanation: 'Only admins can rename channels',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    const existingChannel = await channelRepository.getByWorkspaceAndName(
      workspaceId,
      sanitizedChannelName,
      channelId
    );

    if (existingChannel) {
      throw new ClientError({
        message: 'Channel already part of workspace',
        explanation: 'A channel with this name already exists',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    const updatedChannel = await channelRepository.update(channelId, {
      name: sanitizedChannelName
    });

    return {
      _id: updatedChannel._id,
      name: updatedChannel.name,
      workspaceId: workspaceId.toString()
    };
  } catch (error) {
    console.log('Update channel service error', error);
    throw error;
  }
};

export const deleteChannelService = async (channelId, userId) => {
  try {
    const channel = await channelRepository.getChannelWithWorkspaceDetails(channelId);

    if (!channel || !channel.workspaceId) {
      throw new ClientError({
        message: 'Channel not found with the provided ID',
        explanation: 'Invalid data sent from the client',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const workspaceId = channel.workspaceId?._id || channel.workspaceId;
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        message: 'Workspace not found',
        explanation: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) {
      throw new ClientError({
        message: 'User is not an admin of the workspace',
        explanation: 'Only admins can delete channels',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    if (workspace.channels.length <= 1) {
      throw new ClientError({
        message: 'Cannot delete the last channel',
        explanation: 'A workspace must have at least one channel',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    await messageRepository.deleteManyByChannelId(channelId);
    await ReadReceipt.deleteMany({ channelId });
    await workspaceRepository.removeChannelFromWorkspace(workspaceId, channelId);
    await channelRepository.delete(channelId);

    const updatedWorkspace = await workspaceRepository.getWorkspaceDetailsById(workspaceId, userId);

    return {
      deletedChannelId: channelId,
      workspaceId: workspaceId.toString(),
      nextChannelId: updatedWorkspace?.channels?.[0]?._id?.toString() || null
    };
  } catch (error) {
    console.log('Delete channel service error', error);
    throw error;
  }
};
