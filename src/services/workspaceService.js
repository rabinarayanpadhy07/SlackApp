import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

import { addEmailtoMailQueue } from '../producers/mailQueueProducer.js';
import channelRepository from '../repositories/channelRepostiory.js';
import userRepository from '../repositories/userRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import { workspaceJoinMail } from '../utils/common/mailObject.js';
import ClientError from '../utils/errors/clientError.js';
import ValidationError from '../utils/errors/validationError.js';

export const isUserAdminOfWorkspace = (workspace, userId) => {
  const response = workspace.members.find(
    (member) => {
      const memberIdStr = (member.memberId?._id || member.memberId)?.toString();
      return memberIdStr === userId?.toString() && member.role === 'admin';
    }
  );
  return response;
};

export const isUserMemberOfWorkspace = (workspace, userId) => {
  return workspace.members.find((member) => {
    const memberIdStr = (member.memberId?._id || member.memberId)?.toString();
    return memberIdStr === userId?.toString();
  });
};

const isChannelAlreadyPartOfWorkspace = (workspace, channelName) => {
  return workspace.channels.find(
    (channel) => channel.name.toLowerCase() === channelName.toLowerCase()
  );
};

const isPaidPlan = (user) => user?.plan === 'Paid';
const getWorkspaceOwnerId = (workspace) => {
  const ownerId = workspace?.ownerId?._id || workspace?.ownerId;
  if (ownerId) {
    return ownerId.toString();
  }

  const firstAdmin = workspace?.members?.find((member) => member.role === 'admin');
  const firstAdminId = firstAdmin?.memberId?._id || firstAdmin?.memberId;
  return firstAdminId?.toString();
};

const isWorkspaceOwner = (workspace, userId) => {
  return getWorkspaceOwnerId(workspace) === userId?.toString();
};

export const createWorkspaceService = async (workspaceData) => {
  try {
    const ownerId = workspaceData.owner;
    const user = await userRepository.getById(ownerId);
    
    if (!isPaidPlan(user)) {
      const userWorkspaces = await workspaceRepository.fetchAllWorkspaceByMemberId(ownerId);
      const adminWorkspaces = userWorkspaces.filter(ws => isUserAdminOfWorkspace(ws, ownerId));
      if (adminWorkspaces.length >= 1) {
        throw new ClientError({
          explanation: 'Normal plan users can only create 1 workspace. Upgrade to Paid for unlimited workspaces.',
          message: 'Workspace limit reached',
          statusCode: StatusCodes.FORBIDDEN
        });
      }
    }

    const joinCode = uuidv4().substring(0, 6).toUpperCase();

    const response = await workspaceRepository.create({
      name: workspaceData.name,
      description: workspaceData.description,
      ownerId,
      joinCode
    });

    await workspaceRepository.addMemberToWorkspace(
      response._id,
      workspaceData.owner,
      'admin'
    );

    const updatedWorkspace = await workspaceRepository.addChannelToWorkspace(
      response._id,
      'general'
    );

    return updatedWorkspace;
  } catch (error) {
    console.log('Create workspace service error', error);
    if (error.name === 'ValidationError') {
      throw new ValidationError(
        {
          error: error.errors
        },
        error.message
      );
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new ValidationError(
        {
          error: ['A workspace with same details already exists']
        },
        'A workspace with same details already exists'
      );
    }
    throw error;
  }
};

export const getWorkspacesUserIsMemberOfService = async (userId) => {
  try {
    const response =
      await workspaceRepository.fetchAllWorkspaceByMemberId(userId);
    return response;
  } catch (error) {
    console.log('Get workspaces user is member of service error', error);
    throw error;
  }
};

export const deleteWorkspaceService = async (workspaceId, userId) => {
  try {
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }
    const isAllowed = isUserAdminOfWorkspace(workspace, userId);
    //   const channelIds = workspace.channels.map((channel) => channel._id);

    if (isAllowed) {
      await channelRepository.deleteMany(workspace.channels);

      const response = await workspaceRepository.delete(workspaceId);
      return response;
    }
    throw new ClientError({
      explanation: 'User is either not a memeber or an admin of the workspace',
      message: 'User is not allowed to delete the workspace',
      statusCode: StatusCodes.UNAUTHORIZED
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getWorkspaceService = async (workspaceId, userId) => {
  try {
    const workspace =
      await workspaceRepository.getWorkspaceDetailsById(workspaceId, userId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }
    const isMember = isUserMemberOfWorkspace(workspace, userId);
    if (!isMember) {
      throw new ClientError({
        explanation: 'User is not a member of the workspace',
        message: 'User is not a member of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }
    return workspace;
  } catch (error) {
    console.log('Get workspace service error', error);
    throw error;
  }
};

export const getWorkspaceByJoinCodeService = async (joinCode, userId) => {
  try {
    const workspace =
      await workspaceRepository.getWorkspaceByJoinCode(joinCode);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isMember = Boolean(isUserMemberOfWorkspace(workspace, userId));
    return {
      _id: workspace._id,
      name: workspace.name,
      joinCode: workspace.joinCode,
      isMember
    };
  } catch (error) {
    console.log('Get workspace by join code service error', error);
    throw error;
  }
};

export const updateWorkspaceService = async (
  workspaceId,
  workspaceData,
  userId
) => {
  try {
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }
    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) {
      throw new ClientError({
        explanation: 'User is not an admin of the workspace',
        message: 'User is not an admin of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }
    const updatedWorkspace = await workspaceRepository.update(
      workspaceId,
      workspaceData
    );
    return updatedWorkspace;
  } catch (error) {
    console.log('update workspace service error', error);
    throw error;
  }
};

export const resetWorkspaceJoinCodeService = async (workspaceId, userId) => {
  try {
    const newJoinCode = uuidv4().substring(0, 6).toUpperCase();
    const updatedWorkspace = await updateWorkspaceService(
      workspaceId,
      {
        joinCode: newJoinCode
      },
      userId
    );
    return updatedWorkspace;
  } catch (error) {
    console.log('resetWorkspaceJoinCodeService error', error);
    throw error;
  }
};

export const addMemberToWorkspaceService = async (
  workspaceId,
  memberId,
  role,
  userId
) => {
  try {
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) {
      throw new ClientError({
        explanation: 'User is not an admin of the workspace',
        message: 'User is not an admin of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    const isValidUser = await userRepository.getById(memberId);
    if (!isValidUser) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'User not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }
    const isMember = isUserMemberOfWorkspace(workspace, memberId);
    if (isMember) {
      throw new ClientError({
        explanation: 'User is already a member of the workspace',
        message: 'User is already a member of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }
    const response = await workspaceRepository.addMemberToWorkspace(
      workspaceId,
      memberId,
      role
    );
    addEmailtoMailQueue({
      ...workspaceJoinMail(workspace),
      to: isValidUser.email
    });
    return response;
  } catch (error) {
    console.log('addMemberToWorkspaceService error', error);
    throw error;
  }
};

export const updateMemberRoleService = async (workspaceId, memberId, role, userId) => {
  try {
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) throw new ClientError({ explanation: 'Workspace not found', message: 'Workspace not found', statusCode: StatusCodes.NOT_FOUND });

    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) throw new ClientError({ explanation: 'Only admins can update roles', message: 'User is not an admin', statusCode: StatusCodes.UNAUTHORIZED });
    if (!isWorkspaceOwner(workspace, userId)) {
      throw new ClientError({
        explanation: 'Only the workspace owner can promote or demote admins',
        message: 'Owner permission required',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    if (!['admin', 'member'].includes(role)) {
      throw new ClientError({ explanation: 'Invalid Role', message: 'Role must be admin or member', statusCode: StatusCodes.BAD_REQUEST });
    }

    if (isWorkspaceOwner(workspace, memberId) && role !== 'admin') {
      throw new ClientError({
        explanation: 'The workspace owner must remain an admin',
        message: 'Cannot demote workspace owner',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    const response = await workspaceRepository.updateMemberRole(workspaceId, memberId, role);
    return response;
  } catch (error) {
    console.log('updateMemberRoleService error', error);
    throw error;
  }
};

export const removeMemberFromWorkspaceService = async (workspaceId, memberId, userId) => {
  try {
    const workspace = await workspaceRepository.getById(workspaceId);
    if (!workspace) throw new ClientError({ explanation: 'Workspace not found', message: 'Workspace not found', statusCode: StatusCodes.NOT_FOUND });

    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin && userId.toString() !== memberId.toString()) {
      throw new ClientError({ explanation: 'Only admins can remove members', message: 'User is not an admin', statusCode: StatusCodes.UNAUTHORIZED });
    }

    const targetMember = workspace.members.find((member) => {
      const targetId = member.memberId?._id || member.memberId;
      return targetId?.toString() === memberId.toString();
    });

    if (targetMember?.role === 'admin' && !isWorkspaceOwner(workspace, userId)) {
      throw new ClientError({
        explanation: 'Only the workspace owner can remove an admin',
        message: 'Owner permission required',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    if (isWorkspaceOwner(workspace, memberId)) {
      throw new ClientError({
        explanation: 'The workspace owner cannot be removed from the workspace',
        message: 'Cannot remove workspace owner',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    const response = await workspaceRepository.removeMemberFromWorkspace(workspaceId, memberId);
    return response;
  } catch (error) {
    console.log('removeMemberFromWorkspaceService error', error);
    throw error;
  }
};
export const addChannelToWorkspaceService = async (
  workspaceId,
  channelName,
  userId,
  type
) => {
  try {
    const workspace =
      await workspaceRepository.getWorkspaceDetailsById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }
    console.log('addChannelToWorkspaceService', workspace, userId);
    const isAdmin = isUserAdminOfWorkspace(workspace, userId);
    if (!isAdmin) {
      throw new ClientError({
        explanation: 'User is not an admin of the workspace',
        message: 'User is not an admin of the workspace',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    const user = await userRepository.getById(userId);
    if (!isPaidPlan(user)) {
      if (workspace.channels.length >= 2) {
        throw new ClientError({
          explanation: 'Normal plan users can only create 2 channels per workspace. Upgrade to Paid for unlimited channels.',
          message: 'Channel limit reached',
          statusCode: StatusCodes.FORBIDDEN
        });
      }
    }
    const isChannelPartOfWorkspace = isChannelAlreadyPartOfWorkspace(
      workspace,
      channelName
    );
    if (isChannelPartOfWorkspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Channel already part of workspace',
        statusCode: StatusCodes.FORBIDDEN
      });
    }
    console.log('addChannelToWorkspaceService', workspaceId, channelName);
    const response = await workspaceRepository.addChannelToWorkspace(
      workspaceId,
      channelName,
      type,
      userId
    );

    return response;
  } catch (error) {
    console.log('addChannelToWorkspaceService error', error);
    throw error;
  }
};

export const joinWorkspaceService = async (workspaceId, joinCode, userId) => {
  try {
    const workspace =
      await workspaceRepository.getWorkspaceDetailsById(workspaceId);
    if (!workspace) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Workspace not found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    if (workspace.joinCode !== joinCode) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Invalid join code',
        statusCode: StatusCodes.UNAUTHORIZED
      });
    }

    const updatedWorkspace = await workspaceRepository.addMemberToWorkspace(
      workspaceId,
      userId,
      'member'
    );

    return updatedWorkspace;
  } catch (error) {
    console.log('joinWorkspaceService error', error);
    throw error;
  }
};
