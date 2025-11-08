export const HTTP_STATUS = {
  // 2xx Success
  OK: { code: 200, message: 'Request succeeded' },
  CREATED: { code: 201, message: 'Resource successfully created' },
  ACCEPTED: { code: 202, message: 'Request accepted for processing' },
  NO_CONTENT: { code: 204, message: 'Request succeeded but no content returned' },

  // 3xx Redirection
  MOVED_PERMANENTLY: { code: 301, message: 'Resource moved permanently' },
  FOUND: { code: 302, message: 'Resource found under a different URI' },
  NOT_MODIFIED: { code: 304, message: 'Resource not modified since last request' },

  // 4xx Client Errors
  BAD_REQUEST: { code: 400, message: 'Bad request, invalid input or parameters' },
  UNAUTHORIZED: { code: 401, message: 'Authentication required or invalid credentials' },
  FORBIDDEN: { code: 403, message: 'Access forbidden, you do not have permission' },
  NOT_FOUND: { code: 404, message: 'Requested resource not found' },
  METHOD_NOT_ALLOWED: { code: 405, message: 'HTTP method not allowed for this resource' },
  NOT_ACCEPTABLE: { code: 406, message: 'Request not acceptable based on headers or format' },
  REQUEST_TIMEOUT: { code: 408, message: 'Request timed out, please try again' },
  CONFLICT: { code: 409, message: 'Conflict, resource already exists or cannot be processed' },
  GONE: { code: 410, message: 'Requested resource is no longer available' },
  UNSUPPORTED_MEDIA_TYPE: { code: 415, message: 'Unsupported media type in request' },
  UNPROCESSABLE_ENTITY: { code: 422, message: 'Validation failed or unprocessable entity' },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too many requests, rate limit exceeded' },
  VALIDATION_ERROR: { code: 400, message: 'Validation error, check input data' },

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal server error' },
  NOT_IMPLEMENTED: { code: 501, message: 'Server does not support this functionality' },
  BAD_GATEWAY: { code: 502, message: 'Invalid response from upstream server' },
  SERVICE_UNAVAILABLE: { code: 503, message: 'Service temporarily unavailable' },
  GATEWAY_TIMEOUT: { code: 504, message: 'Gateway timed out waiting for upstream response' },
  NETWORK_AUTHENTICATION_REQUIRED: { code: 511, message: 'Network authentication required' },
} as const;

export type HttpStatusKey = keyof typeof HTTP_STATUS;
