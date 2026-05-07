import { StatusCodes } from 'http-status-codes';

import directMessageRepository from '../repositories/directMessageRepository.js';
import userRepository from '../repositories/userRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import ClientError from '../utils/errors/clientError.js';
import { isUserMemberOfWorkspace } from './workspaceService.js';

const getId = (value) => (value?._id || value)?.toString();

const ensureWorkspaceAndMembers = async (workspaceId, currentUserId, memberId) => {
  const currentUserObjectId = getId(currentUserId);
  const memberObjectId = getId(memberId);

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

  const isCurrentUserMember = isUserMemberOfWorkspace(workspace, currentUserObjectId);

  if (!isCurrentUserMember) {
    throw new ClientError({
      explanation: 'User is not a member of the workspace',
      message: 'User is not a member of the workspace',
      statusCode: StatusCodes.UNAUTHORIZED
    });
  }

  const isOtherUserMember = isUserMemberOfWorkspace(workspace, memberObjectId);

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
  const currentUserObjectId = getId(currentUserId);
  const memberObjectId = getId(memberId);

  await ensureWorkspaceAndMembers(workspaceId, currentUserObjectId, memberObjectId);

  const filter = {
    workspaceId,
    $or: [
      { senderId: currentUserObjectId, recipientId: memberObjectId },
      { senderId: memberObjectId, recipientId: currentUserObjectId }
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
  const currentUserObjectId = getId(currentUserId);
  const memberObjectId = getId(memberId);

  await ensureWorkspaceAndMembers(workspaceId, currentUserObjectId, memberObjectId);

  const isValidRecipient = await userRepository.getById(memberObjectId);

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
    senderId: currentUserObjectId,
    recipientId: memberObjectId
  });

  const messageDetails = await directMessageRepository.getMessageDetails(
    newMessage._id
  );

  return messageDetails;
};

