// ═══════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════
export {
  // Success/Error codes
  SUCCESS_CODES,
  successCodeSchema,
  errorCodeSchema,
  // Pagination
  paginationMetaSchema,
  paginationRequestSchema,
  // Common data schemas
  objectIdSchema,
  dateSchema,
  slugSchema,
  clerkIdSchema,
  authorSummarySchema,
  timestampsSchema,
  votesSchema,
  statsSchema,
} from './common.js';

// ═══════════════════════════════════════════
// RESPONSE HELPERS
// ═══════════════════════════════════════════
export {
  // Success responses
  apiResponse,
  apiArrayResponse,
  apiPaginatedResponse,
  createdResponse,
  noContentResponse,
  // Error responses
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  rateLimitResponse,
  internalErrorResponse,
  badGatewayResponse,
  serviceUnavailableResponse,
  // Combined response sets
  standardResponses,
  getResponses,
  createResponses,
  updateResponses,
  deleteResponses,
  listResponses,
} from './helpers.js';

// ═══════════════════════════════════════════
// ENTITY SCHEMAS
// ═══════════════════════════════════════════

// User
export { UserSchema, UserPublicSchema, UserResponses } from './user.response.js';

// Story
export {
  StorySettingsSchema,
  StoryStatsSchema,
  StorySchema,
  StorySignatureSchema,
  StoryCreateResponseSchema,
  StoryPublishResponseSchema,
  StoryTreeResponseSchema,
  StoryResponses,
} from './story.response.js';

// Chapter
export { ChapterSchema, ChapterResponses } from './chapter.response.js';

// Collaborator
export { CollaboratorSchema, CollaboratorResponses } from './collaborator.response.js';

// Auto-save
export { AutoSaveDraftSchema, AutoSaveResponses } from './autoSave.response.js';

// Reading History
export { ReadingHistoryResponses } from './readingHistory.response.js';
