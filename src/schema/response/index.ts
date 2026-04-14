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
  // Shared entity schemas
  UserSummarySchema,
  ImageSchema,
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
  StoryOverviewSchema,
  StorySignatureSchema,
  StoryCreateResponseSchema,
  StoryPublishResponseSchema,
  StoryTreeResponseSchema,
  StorySettingsWithImagesSchema,
  StoryResponses,
  LatestChapterSchema,
} from './story.response.js';

// Chapter
export {
  ChapterSchema,
  ChapterStatsSchema,
  ChapterWithStorySchema,
  ChapterDetailsSchema,
  ChapterResponses,
} from './chapter.response.js';

// Collaborator
export {
  CollaboratorSchema,
  EmbeddedCollaboratorSchema,
  CollaboratorResponses,
} from './collaborator.response.js';

// Auto-save
export { AutoSaveDraftSchema, AutoSaveResponses } from './autoSave.response.js';

// Reading History
export { ReadingHistoryResponses } from './readingHistory.response.js';

// Pull Request
export { PullRequestSchema, PullRequestResponses } from './pullRequest.response.js';
