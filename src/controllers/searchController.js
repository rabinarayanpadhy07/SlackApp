import { StatusCodes } from 'http-status-codes';
import { globalSearchService } from '../services/searchService.js';
import { customErrorResponse, internalErrorResponse, successResponse } from '../utils/common/responseObjects.js';

export const searchWorkspaceController = async (req, res) => {
    try {
        const { workspaceId, q } = req.query;
        if (!workspaceId || !q) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                customErrorResponse({ statusCode: StatusCodes.BAD_REQUEST, message: 'workspaceId and q parameters are required' })
            );
        }

        const results = await globalSearchService(workspaceId, q);

        return res.status(StatusCodes.OK).json(successResponse(results, 'Search completed successfully'));
    } catch (error) {
        console.error('Search controller error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(internalErrorResponse(error));
    }
};
