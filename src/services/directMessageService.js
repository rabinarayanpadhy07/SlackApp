import { StatusCodes } from 'http-status-codes';

import directMessageRepository from '../repositories/directMessageRepository.js';
import userRepository from '../repositories/userRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import ClientError from '../utils/errors/clientError.js';
import { isUserMemberOfWorkspace } from './workspaceService.js';

const ensureWorkspaceAndMembers = async (workspaceId, currentUserId, memberId) => {
  const workspace = await workspaceRepository.getWorkspaceDetailsById(
    workspaceId
  );

  if (!workspace) {
    throw new ClientError({
      explanation: 'Invalid data sent from the client',
      message: 'Workspace not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const isCurrentUserMember = isUserMemberOfWorkspace(workspace, currentUserId);

  if (!isCurrentUserMember) {
    throw new ClientError({
      explanation: 'User is not a member of the workspace',
      message: 'User is not a member of the workspace',
      statusCode: StatusCodes.UNAUTHORIZED
    });
  }

  const isOtherUserMember = isUserMemberOfWorkspace(workspace, memberId);

  if (!isOtherUserMember) {
    throw new ClientError({
      explanation: 'Requested member is not part of the workspace',
      message: 'Requested member is not part of the workspace',
      statusCode: StatusCodes.BAD_REQUEST
    });
  }
};

export const getDirectMessagesService = async ({
  workspaceId,
  memberId,
  currentUserId,
  page,
  limit
}) => {
  await ensureWorkspaceAndMembers(workspaceId, currentUserId, memberId);

  const filter = {
    workspaceId,
    $or: [
      { senderId: currentUserId, recipientId: memberId },
      { senderId: memberId, recipientId: currentUserId }
    ]
  };

  const messages = await directMessageRepository.getPaginatedMessages(
    filter,
    page,
    limit
  );

  return messages;
};

export const createDirectMessageService = async ({
  workspaceId,
  memberId,
  currentUserId,
  body,
  image
}) => {
  await ensureWorkspaceAndMembers(workspaceId, currentUserId, memberId);

  const isValidRecipient = await userRepository.getById(memberId);

  if (!isValidRecipient) {
    throw new ClientError({
      explanation: 'Invalid data sent from the client',
      message: 'Recipient user not found',
      statusCode: StatusCodes.NOT_FOUND
    });
  }

  const newMessage = await directMessageRepository.create({
    body,
    image,
    workspaceId,
    senderId: currentUserId,
    recipientId: memberId
  });

  const messageDetails = await directMessageRepository.getMessageDetails(
    newMessage._id
  );

  return messageDetails;
};

