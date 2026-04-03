import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../config/serverConfig.js';
import userRepository from '../repositories/userRepository.js';

export const getSocketUserFromToken = async (token) => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await userRepository.getById(decoded.id);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const assertPaidPlanAccess = (user) => {
  if (user?.plan !== 'Paid') {
    throw new Error('This AI feature is available for paid users only');
  }
};
