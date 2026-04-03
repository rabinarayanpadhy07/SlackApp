import * as Sentry from '@sentry/node';

import {
  NODE_ENV,
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE
} from './serverConfig.js';

let sentryInitialized = false;

export const initializeServerMonitoring = () => {
  if (sentryInitialized || !SENTRY_DSN) {
    return sentryInitialized;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    enabled: NODE_ENV !== 'test'
  });

  sentryInitialized = true;
  return true;
};

export const captureServerException = (error, context = {}) => {
  if (!SENTRY_DSN) {
    return null;
  }

  initializeServerMonitoring();
  return Sentry.captureException(error, {
    extra: context
  });
};
