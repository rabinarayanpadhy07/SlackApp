import { StatusCodes } from 'http-status-codes';

import {
  customErrorResponse,
  internalErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';
import { getThreadMessagesService } from '../services/messageService.js';

export const listThreadsController = async (req, res) => {
  try {
    return res.status(StatusCodes.NOT_IMPLEMENTED).json(
      successResponse(
        [],
        'Threads endpoint is not implemented yet. This is a placeholder to reserve the route shape.'
      )
    );
  } catch (error) {
    console.log('List threads controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listThreadMessagesController = async (req, res) => {
  try {
    const { threadId } = req.params;
    const messages = await getThreadMessagesService(threadId);

    return res
        .status(StatusCodes.OK)
        .json(successResponse(messages, 'Thread messages fetched successfully'));
  } catch (error) {
    console.log('List thread messages controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

