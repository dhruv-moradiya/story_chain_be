import {
  STORY_CONTENT_RATINGS,
  STORY_GENRES,
  STORY_STATUSES,
} from '@/features/story/types/story-enum.js';
import {
  apiArrayResponse,
  apiResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from './helpers.js';

// ═══════════════════════════════════════════
// STORY DATA SCHEMAS
// ═══════════════════════════════════════════

export const ImageSchema = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    publicId: { type: 'string' },
  },
};

export const StorySettingsSchema = {
  type: 'object',
  properties: {
    isPublic: { type: 'boolean' },
    allowBranching: { type: 'boolean' },
    requireApproval: { type: 'boolean' },
    allowComments: { type: 'boolean' },
    allowVoting: { type: 'boolean' },
    genres: {
      type: 'array',
      items: {
        type: 'string',
        enum: STORY_GENRES,
      },
    },
    contentRating: { type: 'string', enum: STORY_CONTENT_RATINGS },
  },
};

export const StoryStatsSchema = {
  type: 'object',
  properties: {
    totalChapters: { type: 'number' },
    totalBranches: { type: 'number' },
    totalReads: { type: 'number' },
    totalVotes: { type: 'number' },
    uniqueContributors: { type: 'number' },
    averageRating: { type: 'number' },
  },
};

export const StorySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    coverImage: ImageSchema,
    cardImage: ImageSchema,
    creatorId: { type: 'string' },
    status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'] },
    tags: { type: 'array', items: { type: 'string' } },
    settings: StorySettingsSchema,
    stats: StoryStatsSchema,
    trendingScore: { type: 'number' },
    lastActivityAt: { type: 'string', format: 'date-time' },
    publishedAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const StoryOverviewSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    coverImage: ImageSchema,
    creator: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
    genres: {
      type: 'array',
      items: {
        type: 'string',
        enum: Object.values(STORY_GENRES),
      },
    },
    collaborators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clerkId: { type: 'string' },
          role: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string' },
        },
      },
    },
    contentRating: { type: 'string', enum: Object.values(STORY_CONTENT_RATINGS) },
    tags: { type: 'array', items: { type: 'string' } },
    stats: StoryStatsSchema,
    status: { type: 'string', enum: STORY_STATUSES },
    publishedAt: { type: 'string', format: 'date-time' },
    lastActivityAt: { type: 'string', format: 'date-time' },
  },
};

export const StorySignatureSchema = {
  type: 'object',
  properties: {
    uploadURL: { type: 'string' },
  },
};

export const StoryCreateResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const StoryPublishResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    status: { type: 'string' },
    publishedAt: { type: 'string', format: 'date-time' },
  },
};

export const StoryTreeResponseSchema = {
  type: 'object',
  properties: {
    storyId: { type: 'string' },
    chapters: { type: 'array' },
  },
};

export const StoryUpdateCoverImageSchema = {
  ...ImageSchema,
  required: ['url', 'publicId'],
};

export const StoryUpdateCardImageSchema = {
  ...ImageSchema,
  required: ['url', 'publicId'],
};

export const StorySearchResultSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
  },
};

export const StorySettingsWithImagesSchema = {
  type: 'object',
  properties: {
    settings: StorySettingsSchema,
    coverImage: {
      ...ImageSchema,
      nullable: true,
    },
    cardImage: {
      ...ImageSchema,
      nullable: true,
    },
  },
};

// ═══════════════════════════════════════════
// STORY RESPONSE OBJECTS
// ═══════════════════════════════════════════

export const StoryResponses = {
  storyCreated: {
    201: createdResponse(StoryCreateResponseSchema, 'Story created successfully'),
    400: badRequestResponse('Invalid story data'),
    401: unauthorizedResponse(),
    409: conflictResponse('Story with this slug already exists'),
    422: validationErrorResponse('Validation failed'),
    500: internalErrorResponse(),
  },
  storyDetails: {
    200: apiResponse(StorySchema, 'Story details retrieved successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to this story'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  storyOverview: {
    200: apiResponse(StoryOverviewSchema, 'Story overview retrieved successfully'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  storySettings: {
    200: apiResponse(StorySettingsWithImagesSchema, 'Story settings retrieved successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to story settings'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  storyList: {
    200: apiArrayResponse(StorySchema, 'List of stories retrieved successfully'),
    400: badRequestResponse('Invalid query parameters'),
    401: unauthorizedResponse(),
    500: internalErrorResponse(),
  },
  storySearch: {
    200: apiArrayResponse(StorySearchResultSchema, 'Search results retrieved successfully'),
    400: badRequestResponse('Invalid search parameters'),
    500: internalErrorResponse(),
  },
  storyPublished: {
    200: apiResponse(StoryPublishResponseSchema, 'Story published successfully'),
    400: badRequestResponse('Story cannot be published'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have permission to publish'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  storyTree: {
    200: apiResponse(StoryTreeResponseSchema, 'Story chapter tree retrieved successfully'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  signatureUrl: {
    200: apiResponse(StorySignatureSchema, 'Signature URL generated successfully'),
    401: unauthorizedResponse(),
    500: internalErrorResponse(),
  },
  storyCoverImageUpdated: {
    200: apiResponse(StoryUpdateCoverImageSchema, 'Story cover image updated successfully'),
    400: badRequestResponse('Invalid image data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have permission to update cover image'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  storyCardImageUpdated: {
    200: apiResponse(StoryUpdateCardImageSchema, 'Story card image updated successfully'),
    400: badRequestResponse('Invalid image data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have permission to update card image'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  acceptInvitation: {
    200: apiResponse({ type: 'object' }, 'Invitation accepted successfully'),
    400: badRequestResponse('Invalid invitation'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Invitation not found'),
    409: conflictResponse('Invitation already processed'),
    500: internalErrorResponse(),
  },
  declineInvitation: {
    200: apiResponse({ type: 'object' }, 'Invitation declined successfully'),
    400: badRequestResponse('Invalid invitation'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Invitation not found'),
    409: conflictResponse('Invitation already processed'),
    500: internalErrorResponse(),
  },
};
