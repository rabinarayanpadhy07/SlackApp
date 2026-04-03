import { StatusCodes } from 'http-status-codes';

import { customErrorResponse } from '../utils/common/responseObjects.js';

const hitStore = new Map();

const getClientKey = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];

  return (
    forwardedIp?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'anonymous'
  );
};

const pruneExpiredEntries = (windowStart) => {
  hitStore.forEach((entry, key) => {
    if (entry.resetAt <= windowStart) {
      hitStore.delete(key);
    }
  });
};

export const createRateLimiter = ({
  windowMs,
  max,
  message,
  keyPrefix = 'global'
}) => {
  return (req, res, next) => {
    const now = Date.now();
    pruneExpiredEntries(now - windowMs);

    const scopedClientKey = `${keyPrefix}:${getClientKey(req)}`;
    const currentEntry = hitStore.get(scopedClientKey);

    if (!currentEntry || currentEntry.resetAt <= now) {
      hitStore.set(scopedClientKey, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (currentEntry.count >= max) {
      res.setHeader(
        'Retry-After',
        Math.ceil((currentEntry.resetAt - now) / 1000)
      );
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json(
        customErrorResponse({
          message,
          explanation: 'Too many requests from this client. Please retry later.'
        })
      );
    }

    currentEntry.count += 1;
    hitStore.set(scopedClientKey, currentEntry);
    return next();
  };
};
