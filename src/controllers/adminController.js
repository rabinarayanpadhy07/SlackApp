import { StatusCodes } from 'http-status-codes';

import {
  deleteAdminMessageService,
  deleteAdminWorkspaceService,
  getAdminOverviewService,
  listAdminAuditLogsService,
  listAdminMessagesService,
  listAdminPaymentsService,
  listAdminUsersService,
  listAdminWorkspacesService,
  updateAdminUserService,
  updateAdminWorkspaceService} from '../services/adminService.js';
import {
  customErrorResponse,
  internalErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';

export const getAdminOverviewController = async (req, res) => {
  try {
    const data = await getAdminOverviewService();
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin overview fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listAdminUsersController = async (req, res) => {
  try {
    const data = await listAdminUsersService();
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin users fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const updateAdminUserController = async (req, res) => {
  try {
    const data = await updateAdminUserService(
      req.params.userId,
      req.body,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin user updated successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listAdminWorkspacesController = async (req, res) => {
  try {
    const data = await listAdminWorkspacesService();
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin workspaces fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const deleteAdminWorkspaceController = async (req, res) => {
  try {
    const data = await deleteAdminWorkspaceService(
      req.params.workspaceId,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Workspace deleted successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const updateAdminWorkspaceController = async (req, res) => {
  try {
    const data = await updateAdminWorkspaceService(
      req.params.workspaceId,
      req.body,
      req.user._id
    );
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Workspace updated successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listAdminPaymentsController = async (req, res) => {
  try {
    const data = await listAdminPaymentsService();
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin payments fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listAdminMessagesController = async (req, res) => {
  try {
    const data = await listAdminMessagesService(req.query.search || '');
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin messages fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const deleteAdminMessageController = async (req, res) => {
  try {
    const data = await deleteAdminMessageService(req.params.messageId, req.user._id);
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Message deleted successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const listAdminAuditLogsController = async (req, res) => {
  try {
    const data = await listAdminAuditLogsService();
    return res
      .status(StatusCodes.OK)
      .json(successResponse(data, 'Admin audit logs fetched successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};
