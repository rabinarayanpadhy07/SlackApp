import { StatusCodes } from 'http-status-codes';

import channelRepository from '../repositories/channelRepostiory.js';
import messageRepository from '../repositories/messageRepository.js';
import ClientError from '../utils/errors/clientError.js';
import { isUserAdminOfWorkspace,isUserMemberOfWorkspace } from './workspaceService.js';

export const getMessagesService = async (messageParams, page, limit, user) => {
  const channelDetails = await channelRepository.getChannelWithWorkspaceDetails(
    messageParams.channelId
  );
  const userId = user?._id || user;

  const workspace = channelDetails.workspaceId;

  const isMember = isUserMemberOfWorkspace(workspace, userId);

  if (!isMember) {
    throw new ClientError({
      explanation: 'User is not a member of the workspace',
      message: 'User is not a member of the workspace',
      statusCode: StatusCodes.UNAUTHORIZED
    });
  }

  const messages = await messageRepository.getPaginatedMessaged(
    messageParams,
    page,
    limit
  );
  return messages;
};

export const createMessageService = async (message) => {
  const newMessage = await messageRepository.create(message);

  const messageDetails = await messageRepository.getMessageDetails(
    newMessage._id
  );

  return messageDetails;
};

export const addReactionService = async (messageId, emoji, memberId) => {
  const updatedMessage = await messageRepository.addReaction(messageId, emoji, memberId);
  return updatedMessage;
};

export const getThreadMessagesService = async (messageId) => {
  // Add any specific authorization later if required.
  const messages = await messageRepository.getThreadMessages(messageId);
  return messages;
};

export const editMessageService = async (messageId, body, memberId) => {
  const message = await messageRepository.getMessageDetails(messageId);
  if (!message) throw new Error('Message not found');
  if ((message.senderId._id || message.senderId).toString() !== memberId.toString()) {
    throw new Error('You are not authorized to edit this message');
  }
  return await messageRepository.editMessage(messageId, body);
};

export const deleteMessageService = async (messageId, memberId) => {
  const message = await messageRepository.getMessageDetails(messageId);
  if (!message) throw new Error('Message not found');
  
  if ((message.senderId._id || message.senderId).toString() !== memberId.toString()) {
     const channelDetails = await channelRepository.getChannelWithWorkspaceDetails(message.channelId);
     const workspace = channelDetails.workspaceId;
     const isMemberAdmin = isUserAdminOfWorkspace(workspace, memberId);
     if (!isMemberAdmin) {
       throw new Error('You are not authorized to delete this message');
     }
  }
  return await messageRepository.deleteMessage(messageId);
};

export const togglePinMessageService = async (messageId, memberId) => {
  const message = await messageRepository.getMessageDetails(messageId);
  if (!message) throw new Error('Message not found');
  
  const channelDetails = await channelRepository.getChannelWithWorkspaceDetails(message.channelId);
  const workspace = channelDetails.workspaceId;
  const isMemberAdmin = isUserAdminOfWorkspace(workspace, memberId);
  
  if (!isMemberAdmin) {
    throw new Error('You are not authorized to pin messages');
  }
  
  return await messageRepository.togglePinMessage(messageId, memberId);
};

export const toggleStarMessageService = async (messageId, memberId) => {
  return await messageRepository.toggleStarMessage(messageId, memberId);
};
