export const ERROR_CODES = {
  // Validation & Input
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Input validation failed' },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'Provided input is invalid' },
  MISSING_PARAMETERS: { code: 'MISSING_PARAMETERS', message: 'Required parameters are missing' },

  // Authentication & Authorization
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'User is not authorized' },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Access to this resource is forbidden' },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid' },
  TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired' },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'User session has expired, please login again',
  },

  // Resource & Data
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Requested resource could not be found' },
  CONFLICT: { code: 'CONFLICT', message: 'Resource conflict occurred' },
  ALREADY_EXISTS: { code: 'ALREADY_EXISTS', message: 'Resource already exists' },
  DEPENDENCY_ERROR: {
    code: 'DEPENDENCY_ERROR',
    message: 'Failed due to dependency or related resource issue',
  },

  // Server & Internal
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred on the server',
  },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
  TIMEOUT_ERROR: { code: 'TIMEOUT_ERROR', message: 'Request timed out, please try again later' },

  // Permissions & Roles
  ROLE_ERROR: { code: 'ROLE_ERROR', message: 'User role does not have permission for this action' },

  // Miscellaneous
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded, try again later',
  },
  FEATURE_DISABLED: { code: 'FEATURE_DISABLED', message: 'This feature is currently disabled' },
} as const;
