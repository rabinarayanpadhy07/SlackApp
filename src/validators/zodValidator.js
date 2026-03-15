import { StatusCodes } from 'http-status-codes';

import { customErrorResponse } from '../utils/common/responseObjects.js';

export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Parse + coerce defaults/transforms and pass cleaned data downstream
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      const issues = error?.issues ?? error?.errors; // zod v3 uses `issues`; some code uses `errors`
      const explanation = [];

      if (Array.isArray(issues)) {
        issues.forEach((issue) => {
          const path =
            Array.isArray(issue?.path) && issue.path.length > 0
              ? issue.path.join('.')
              : 'body';
          explanation.push(`${path} ${issue.message}`);
        });
      } else {
        explanation.push(error?.message || 'Validation error');
      }

      const errorMessage = explanation.length ? ` : ${explanation.join(' : ')}` : '';
      res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Validation error' + errorMessage,
          explanation: explanation
        })
      );
    }
  };
};