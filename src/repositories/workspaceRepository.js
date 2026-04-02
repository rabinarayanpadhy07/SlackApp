import { StatusCodes } from 'http-status-codes';

import User from '../schema/user.js';
import Workspace from '../schema/workspace.js';
import ClientError from '../utils/errors/clientError.js';
import channelRepository from './channelRepostiory.js';
import crudRepository from './crudRepository.js';

const workspaceRepository = {
  ...crudRepository(Workspace),
  getWorkspaceDetailsById: async function (workspaceId, userId) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isArchived: { $ne: true }
    })
      .populate('members.memberId', 'username email avatar')
      .populate('channels');

    if (workspace) {
      workspace.channels = workspace.channels.filter((channel) => {
        return (
          channel.type === 'public' ||
          (channel.type === 'private' && channel.members.includes(userId))
        );
      });
    }

    return workspace;
  },
  getWorkspaceByName: async function (workspaceName) {
    const workspace = await Workspace.findOne({
      name: workspaceName
    });

    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    return workspace;
  },
  getWorkspaceByJoinCode: async function (joinCode) {
    const workspace = await Workspace.findOne({
      joinCode,
      isArchived: { $ne: true }
    });

    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    return workspace;
  },
  addMemberToWorkspace: async function (workspaceId, memberId, role) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isValidUser = await User.findById(memberId);
    if (!isValidUser) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'User not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isMemberAlreadyPartOfWorkspace = workspace.members.find(
      (member) => member.memberId == memberId
    );

    if (isMemberAlreadyPartOfWorkspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'User already part of workspace',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    workspace.members.push({
      memberId,
      role
    });

    await workspace.save();

    return workspace;
  },
  addChannelToWorkspace: async function (workspaceId, channelName, type, userId) {
    const workspace =
      await Workspace.findById(workspaceId).populate('channels');

    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isChannelAlreadyPartOfWorkspace = workspace.channels.find(
      (channel) => channel.name === channelName
    );

    if (isChannelAlreadyPartOfWorkspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from client',
        message: 'Channel already part of workspace',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    const channelData = {
      name: channelName,
      workspaceId: workspaceId,
      type: type || 'public'
    };

    if (type === 'private') {
      channelData.members = [userId];
    }

    const channel = await channelRepository.create(channelData);

    workspace.channels.push(channel);
    await workspace.save();

    return workspace;
  },
  fetchAllWorkspaceByMemberId: async function (memberId) {
    const workspaces = await Workspace.find({
      'members.memberId': memberId,
      isArchived: { $ne: true }
    }).populate('members.memberId', 'username email avatar');

    return workspaces;
  },
  updateMemberRole: async function (workspaceId, memberId, role) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new ClientError({ explanation: 'Workspace not found', message: 'Workspace not found', statusCode: StatusCodes.NOT_FOUND });
    
    const memberIndex = workspace.members.findIndex((m) => m.memberId.toString() === memberId.toString());
    if (memberIndex === -1) throw new ClientError({ explanation: 'Member not found in workspace', message: 'User is not a member of this workspace', statusCode: StatusCodes.NOT_FOUND });
    
    workspace.members[memberIndex].role = role;
    await workspace.save();
    return workspace;
  },
  removeChannelFromWorkspace: async function (workspaceId, channelId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new ClientError({ explanation: 'Workspace not found', message: 'Workspace not found', statusCode: StatusCodes.NOT_FOUND });

    workspace.channels = workspace.channels.filter((channel) => channel.toString() !== channelId.toString());
    await workspace.save();
    return workspace;
  },
  removeMemberFromWorkspace: async function (workspaceId, memberId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new ClientError({ explanation: 'Workspace not found', message: 'Workspace not found', statusCode: StatusCodes.NOT_FOUND });
    
    // Cannot remove the last member if they are the only admin
    const admins = workspace.members.filter(m => m.role === 'admin');
    const targetMember = workspace.members.find(m => m.memberId.toString() === memberId.toString());
    
    if (targetMember && targetMember.role === 'admin' && admins.length === 1) {
      throw new ClientError({ explanation: 'Cannot remove the last admin', message: 'Cannot remove the last admin of the workspace', statusCode: StatusCodes.BAD_REQUEST });
    }

    workspace.members = workspace.members.filter((m) => m.memberId.toString() !== memberId.toString());
    await workspace.save();
    return workspace;
  }
};

export default workspaceRepository;
