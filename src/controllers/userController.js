import { StatusCodes } from 'http-status-codes';

import { FRONTEND_URL } from '../config/serverConfig.js';
import { signInService, signUpService } from '../services/userService.js';
import { createJWT } from '../utils/common/authUtils.js';
import {
  customErrorResponse,
  internalErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';

export const signUp = async (req, res) => {
  try {
    const user = await signUpService(req.body);

    return res
      .status(StatusCodes.CREATED)
      .json(successResponse(user, 'User created successfully'));
  } catch (error) {
    console.log('User controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const signIn = async (req, res) => {
  try {
    const response = await signInService(req.body);
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, 'User signed in successfully'));
  } catch (error) {
    console.log('User controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const googleAuthSuccess = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${FRONTEND_URL}/auth/signin?error=auth_failed`);
    }

    const token = createJWT({ id: req.user._id, email: req.user.email });
    const user = {
      username: req.user.username,
      avatar: req.user.avatar,
      email: req.user.email,
      _id: req.user._id
    };

    const userString = JSON.stringify(user);
    
    // Redirect to frontend with token and user data
    // We'll use a specific route on the frontend to handle this
    return res.redirect(`${FRONTEND_URL}/auth/google/success?token=${token}&user=${encodeURIComponent(userString)}`);
  } catch (error) {
    console.log('Google auth controller error', error);
    return res.redirect(`${FRONTEND_URL}/auth/signin?error=internal_error`);
  }
};