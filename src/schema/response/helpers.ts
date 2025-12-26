// ===============================
// RESPONSE SCHEMA HELPERS
// ===============================

/**
 * Helper to wrap data in standard API response format
 */
export const apiResponse = (dataSchema: object, description: string) => ({
  description,
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: dataSchema,
  },
});

/**
 * Helper to create array response
 */
export const apiArrayResponse = (itemSchema: object, description: string) => ({
  description,
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: itemSchema,
    },
  },
});

/**
 * Helper for error responses
 */
export const errorResponse = (description: string) => ({
  description,
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    ...(process.env.NODE_ENV === 'development' && { stack: { type: 'string' } }),
  },
});
