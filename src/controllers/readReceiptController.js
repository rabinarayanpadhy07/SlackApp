import { StatusCodes } from 'http-status-codes';
import { getUnreadChannelsForWorkspaceService, markChannelAsReadService } from '../services/readReceiptService.js';
import { internalErrorResponse, successResponse } from '../utils/common/responseObjects.js';

export const markChannelAsReadController = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { workspaceId } = req.body;
        
        await markChannelAsReadService(req.user, channelId, workspaceId);
        
        return res.status(StatusCodes.OK).json(successResponse(null, 'Channel marked as read'));
    } catch (error) {
        console.error('Error marking channel as read', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(internalErrorResponse(error));
    }
};

export const getUnreadChannelsController = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const unreadMap = await getUnreadChannelsForWorkspaceService(req.user, workspaceId);
        
        return res.status(StatusCodes.OK).json(successResponse(unreadMap, 'Unread channels fetched'));
    } catch (error) {
        console.error('Error fetching unread channels', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(internalErrorResponse(error));
    }
};
