import { StatusCodes } from 'http-status-codes';

import {
  createDirectMessageService,
  getDirectMessagesService
} from '../services/directMessageService.js';
import {
  customErrorResponse,
  internalErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';

export const getDirectMessagesController = async (req, res) => {
  try {
    console.log('--- getDirectMessagesController hit! ---', req.params, req.user);
    const { workspaceId, memberId } = req.params;

    const messages = await getDirectMessagesService({
      workspaceId,
      memberId,
      currentUserId: req.user,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });

    return res
      .status(StatusCodes.OK)
      .json(successResponse(messages, 'Direct messages fetched successfully'));
  } catch (error) {
    console.log('Get direct messages controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const createDirectMessageController = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { body, image } = req.body;

    const message = await createDirectMessageService({
      workspaceId,
      memberId,
      currentUserId: req.user,
      body,
      image
    });

    return res
      .status(StatusCodes.CREATED)
      .json(successResponse(message, 'Direct message sent successfully'));
  } catch (error) {
    console.log('Create direct message controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

