import { StatusCodes } from 'http-status-codes';

import { customErrorResponse } from '../utils/common/responseObjects.js';

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(StatusCodes.FORBIDDEN).json(
      customErrorResponse({
        message: 'Super admin access required',
        explanation: 'You are not authorized to access this resource'
      })
    );
  }

  return next();
};
