import { StatusCodes } from 'http-status-codes';

import {
  deleteChannelService,
  getChannelByIdService,
  updateChannelService
} from '../services/channelService.js';
import {
  customErrorResponse,
  internalErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';

export const getChannelByIdController = async (req, res) => {
  try {
    const response = await getChannelByIdService(
      req.params.channelId,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, 'Channel fetched successfully'));
  } catch (error) {
    console.log('get channel by id controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const updateChannelController = async (req, res) => {
  try {
    const response = await updateChannelService(
      req.params.channelId,
      req.body.channelName,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, 'Channel updated successfully'));
  } catch (error) {
    console.log('update channel controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const deleteChannelController = async (req, res) => {
  try {
    const response = await deleteChannelService(
      req.params.channelId,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, 'Channel deleted successfully'));
  } catch (error) {
    console.log('delete channel controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};
