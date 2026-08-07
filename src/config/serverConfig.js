import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseNumber = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

export const PORT = process.env.PORT || 3000;

export const NODE_ENV = process.env.NODE_ENV || 'development';

export const DEV_DB_URL = process.env.DEV_DB_URL;

export const PROD_DB_URL = process.env.PROD_DB_URL;

export const JWT_SECRET = process.env.JWT_SECRET;

export const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

export const MAIL_ID = process.env.MAIL_ID;

export const MAIL_PASSWORD = process.env.MAIL_PASSWORD;

export const REDIS_PORT = process.env.REDIS_PORT || 6379;

export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

export const APP_LINK = process.env.APP_LINK || 'http://localhost:3000';

export const ENABLE_EMAIL_VERIFICATION = parseBoolean(
  process.env.ENABLE_EMAIL_VERIFICATION
);

export const AWS_REGION = process.env.AWS_REGION;

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;

export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

export const CURRENCY = process.env.CURRENCY || 'INR';

export const RECEIPT_SECRET = process.env.RECEIPT_SECRET || 'receipt_1103';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const CORS_ALLOWED_ORIGINS = Array.from(
  new Set(
    [
      FRONTEND_URL,
      ...(process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    ].filter(Boolean)
  )
);

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

export const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export const SUPER_ADMIN_EMAILS = (
  process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || ''
)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const API_RATE_LIMIT_WINDOW_MS = parseNumber(
  process.env.API_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);

export const API_RATE_LIMIT_MAX = parseNumber(
  process.env.API_RATE_LIMIT_MAX,
  300
);

export const AUTH_RATE_LIMIT_WINDOW_MS = parseNumber(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);

export const AUTH_RATE_LIMIT_MAX = parseNumber(
  process.env.AUTH_RATE_LIMIT_MAX,
  20
);

export const REQUEST_SIZE_LIMIT = process.env.REQUEST_SIZE_LIMIT || '1mb';

export const PASSWORD_RESET_TOKEN_EXPIRY_MS = parseNumber(
  process.env.PASSWORD_RESET_TOKEN_EXPIRY_MS,
  60 * 60 * 1000
);

export const SENTRY_DSN = process.env.SENTRY_DSN || '';

export const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || NODE_ENV;

export const SENTRY_TRACES_SAMPLE_RATE = Number.parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE || '0'
);
