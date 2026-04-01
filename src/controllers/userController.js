import { StatusCodes } from 'http-status-codes';

import { FRONTEND_URL } from '../config/serverConfig.js';
import {
  setup2FAService,
  signInService,
  signUpService,
  verify2FAService
} from '../services/userService.js';
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

export const setup2FA = async (req, res) => {
  try {
    const response = await setup2FAService(req.user);
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, '2FA setup initiated successfully'));
  } catch (error) {
    console.log('Setup 2FA controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { token, userId } = req.body;
    // We might get userId from req.user if they are already logged in (setting up 2FA)
    // Or from req.body if they are signing in.
    const idToVerify = req.user || userId;
    
    if (!idToVerify || !token) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          explanation: 'User ID and token are required',
          message: 'Missing required parameters'
        })
      );
    }

    const response = await verify2FAService(idToVerify, token);
    return res
      .status(StatusCodes.OK)
      .json(successResponse(response, '2FA verified successfully'));
  } catch (error) {
    console.log('Verify 2FA controller error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(customErrorResponse(error));
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(internalErrorResponse(error));
  }
};