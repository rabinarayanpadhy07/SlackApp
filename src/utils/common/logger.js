import { captureServerException } from '../../config/sentryConfig.js';

const formatLog = (level, scope, payload) => ({
  level,
  scope,
  timestamp: new Date().toISOString(),
  ...payload
});

export const createLogger = (scope) => ({
  info(message, metadata = {}) {
    console.info(formatLog('info', scope, { message, metadata }));
  },
  warn(message, metadata = {}) {
    console.warn(formatLog('warn', scope, { message, metadata }));
  },
  error(message, error, metadata = {}) {
    console.error(
      formatLog('error', scope, {
        message,
        metadata,
        errorMessage: error?.message,
        stack: error?.stack
      })
    );
    captureServerException(error || new Error(message), {
      scope,
      message,
      ...metadata
    });
  }
});

export const reportServerError = (error, metadata = {}) => {
  createLogger('server').error('Unhandled server error', error, metadata);
};
