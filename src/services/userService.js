import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import otplib from 'otplib';
import qrcode from 'qrcode';

import {
  ENABLE_EMAIL_VERIFICATION,
  PASSWORD_RESET_TOKEN_EXPIRY_MS
} from '../config/serverConfig.js';
import { addEmailtoMailQueue } from '../producers/mailQueueProducer.js';
import userRepository from '../repositories/userRepository.js';
import { createJWT } from '../utils/common/authUtils.js';
import {
  forgotPasswordMail,
  verifyEmailMail
} from '../utils/common/mailObject.js';
import { applySuperAdminDefaults } from '../utils/common/superAdminUtils.js';
import ClientError from '../utils/errors/clientError.js';
import ValidationError from '../utils/errors/validationError.js';

const { authenticator } = otplib;

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const signUpService = async (data) => {
  try {
    const newUser = await userRepository.signUpUser(data);
    applySuperAdminDefaults(newUser);
    await newUser.save();
    if (ENABLE_EMAIL_VERIFICATION) {
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

    // match the incoming password with the hashed password
    const isMatch = bcrypt.compareSync(data.password, user.password);

    if (!isMatch) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Invalid password, please try again',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    if (!user.isActive) {
      throw new ClientError({
        explanation: 'This account has been suspended',
        message: 'Your account is currently suspended',
        statusCode: StatusCodes.FORBIDDEN
      });
    }

    const wasSuperAdmin = user.isSuperAdmin;
    applySuperAdminDefaults(user);
    if (user.isSuperAdmin !== wasSuperAdmin) {
      await user.save();
    }

    if (user.isTwoFactorEnabled) {
      return {
        _id: user._id,
        email: user.email,
        requires2fa: true
      };
    }

    return {
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      _id: user._id,
      plan: user.plan,
      isSuperAdmin: user.isSuperAdmin,
      token: createJWT({ id: user._id, email: user.email })
    };
  } catch (error) {
    console.log('User service error', error);
    throw error;
  }
};

export const setup2FAService = async (userId) => {
  try {
    const user = await userRepository.getById(userId);
    if (!user) {
      throw new ClientError({
        explanation: 'User not found',
        message: 'No registered user found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const secret = authenticator.generateSecret();
    user.twoFactorSecret = secret;
    await user.save();

    const otpauthUrl = authenticator.keyuri(user.email, 'SlackApp', secret);
    const qrCode = await qrcode.toDataURL(otpauthUrl);

    return { qrCode, secret };
  } catch (error) {
    console.log('Setup 2FA service error', error);
    throw error;
  }
};

export const verify2FAService = async (userId, token) => {
  try {
    const user = await userRepository.getById(userId);
    if (!user) {
      throw new ClientError({
        explanation: 'User not found',
        message: 'No registered user found',
        statusCode: StatusCodes.NOT_FOUND
      });
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      throw new ClientError({
        explanation: 'Invalid token',
        message: 'Invalid 2FA token provided',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    user.isTwoFactorEnabled = true;
    const wasSuperAdmin = user.isSuperAdmin;
    applySuperAdminDefaults(user);
    if (user.isSuperAdmin !== wasSuperAdmin) {
      user.markModified('isSuperAdmin');
    }
    await user.save();

    return {
      success: true,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      _id: user._id,
      plan: user.plan,
      isSuperAdmin: user.isSuperAdmin,
      token: createJWT({ id: user._id, email: user.email })
    };
  } catch (error) {
    console.log('Verify 2FA service error', error);
    throw error;
  }
};

export const requestPasswordResetService = async ({ email }) => {
  try {
    const user = await userRepository.getByEmail(email);

    if (!user || !user.isActive) {
      return {
        success: true
      };
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(rawResetToken);
    user.passwordResetTokenExpiry = Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS;
    await user.save();

    addEmailtoMailQueue({
      ...forgotPasswordMail(rawResetToken),
      to: user.email
    });

    return {
      success: true
    };
  } catch (error) {
    console.log('Forgot password service error', error);
    throw error;
  }
};

export const resetPasswordService = async ({ token, password }) => {
  try {
    const user = await userRepository.getByPasswordResetToken(hashToken(token));

    if (!user || !user.passwordResetTokenExpiry) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Reset link is invalid or has already been used',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    if (user.passwordResetTokenExpiry < Date.now()) {
      throw new ClientError({
        explanation: 'Invalid data sent from the client',
        message: 'Reset link has expired',
        statusCode: StatusCodes.BAD_REQUEST
      });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    return {
      success: true
    };
  } catch (error) {
    console.log('Reset password service error', error);
    throw error;
  }
};
