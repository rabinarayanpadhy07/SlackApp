import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';

import {
  ENABLE_EMAIL_VERIFICATION,
  GOOGLE_CLIENT_ID
} from '../config/serverConfig.js';
import { addEmailtoMailQueue } from '../producers/mailQueueProducer.js';
import userRepository from '../repositories/userRepository.js';
import { createJWT } from '../utils/common/authUtils.js';
import { verifyEmailMail } from '../utils/common/mailObject.js';
import ClientError from '../utils/errors/clientError.js';
import ValidationError from '../utils/errors/validationError.js';

export const signUpService = async (data) => {
  try {
    const newUser = await userRepository.signUpUser(data);
    if (ENABLE_EMAIL_VERIFICATION === 'true') {
      // send verification email
      addEmailtoMailQueue({
        ...verifyEmailMail(newUser.verificationToken),
        to: newUser.email
      });
    }

    return newUser;
  } catch (error) {
    console.log('User service error', error);
    if (error.name === 'ValidationError') {
      throw new ValidationError(
        {
          error: error.errors
        },
        error.message
      );
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new ValidationError(
        {
          error: ['A user with same email or username already exists']
        },
        'A user with same email or username already exists'
      );
    }
  }
};

export const verifyTokenService = async (token) => {
  try {
    const user = await userRepository.getByToken(token);
    if (!user) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Invalid token',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    // check if the token has expired or not
    if (user.verificationTokenExpiry < Date.now()) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Token has expired',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    return user;
  } catch (error) {
    console.log('User service error', error);
    throw error;
  }
};

const mapUserAuthResponse = (user) => ({
  username: user.username,
  avatar: user.avatar,
  email: user.email,
  _id: user._id,
  token: createJWT({ id: user._id, email: user.email })
});

const verifyGoogleIdToken = async (idToken) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new ClientError({
      explanation: 'Missing server configuration',
      message: 'Google login is not configured',
      statusCode: StatusCodes.SERVICE_UNAVAILABLE
    });
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );

  if (!response.ok) {
    throw new ClientError({
      explanation: 'Invalid data sent from the client',
      message: 'Invalid Google token',
      statusCode: StatusCodes.BAD_REQUEST
    });
  }

  const payload = await response.json();

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new ClientError({
      explanation: 'Invalid data sent from the client',
      message: 'Google token audience mismatch',
      statusCode: StatusCodes.BAD_REQUEST
    });
  }

  if (payload.email_verified !== 'true') {
    throw new ClientError({
      explanation: 'Invalid data sent from the client',
      message: 'Google email is not verified',
      statusCode: StatusCodes.BAD_REQUEST
    });
  }

  return payload;
};

export const signInService = async (data) => {
  try {
    const user = await userRepository.getByEmail(data.email);
    if (!user) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'No registered user found with this email',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    if (!user.password) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'This account uses Google login. Please continue with Google',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    // match the incoming password with the hashed password
    const isMatch = bcrypt.compareSync(data.password, user.password);

    if (!isMatch) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Invalid password, please try again',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    return mapUserAuthResponse(user);
  } catch (error) {
    console.log('User service error', error);
    throw error;
  }
};

export const signInWithGoogleService = async ({ idToken }) => {
  try {
    const googlePayload = await verifyGoogleIdToken(idToken);

    const existingByGoogleId = await userRepository.getByGoogleId(googlePayload.sub);
    if (existingByGoogleId) {
      return mapUserAuthResponse(existingByGoogleId);
    }

    let user = await userRepository.getByEmail(googlePayload.email);

    if (!user) {
      const generatedUsername = `${googlePayload.email.split('@')[0]}${googlePayload.sub.slice(-4)}`;

      user = await userRepository.signUpUser({
        email: googlePayload.email,
        username: generatedUsername,
        avatar: googlePayload.picture,
        isVerified: true,
        authProvider: 'google',
        googleId: googlePayload.sub
      });
    } else {
      user.googleId = googlePayload.sub;
      user.authProvider = 'google';
      user.isVerified = true;
      if (!user.avatar && googlePayload.picture) {
        user.avatar = googlePayload.picture;
      }
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      await user.save();
    }

    return mapUserAuthResponse(user);
  } catch (error) {
    console.log('Google auth service error', error);

    if (error.statusCode) {
      throw error;
    }

    if (error.name === 'ValidationError') {
      throw new ValidationError(
        {
          error: error.errors
        },
        error.message
      );
    }

    if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new ValidationError(
        {
          error: ['A user with same email or username already exists']
        },
        'A user with same email or username already exists'
      );
    }

    throw error;
  }
};
