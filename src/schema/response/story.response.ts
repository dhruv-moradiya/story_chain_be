import { StoryContentRating, StoryGenre, StoryStatus } from '../../features/story/story.types';
import { apiArrayResponse, apiResponse, errorResponse } from './helpers';

// ===============================
// STORY DATA SCHEMAS
// ===============================

export const StorySettingsSchema = {
  type: 'object',
  properties: {
    isPublic: { type: 'boolean' },
    allowBranching: { type: 'boolean' },
    requireApproval: { type: 'boolean' },
    allowComments: { type: 'boolean' },
    allowVoting: { type: 'boolean' },
    genre: {
      type: 'string',
      enum: Object.values(StoryGenre),
    },
    contentRating: { type: 'string', enum: Object.values(StoryContentRating) },
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
    coverImage: {
      type: 'object',
      properties: { url: { type: 'string' }, publicId: { type: 'string' } },
    },
    cardImage: {
      type: 'object',
      properties: { url: { type: 'string' }, publicId: { type: 'string' } },
    },
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
    coverImage: {
      type: 'object',
      properties: { url: { type: 'string' }, publicId: { type: 'string' } },
    },
    creator: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
    genre: {
      type: 'string',
      enum: Object.values(StoryGenre),
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
    contentRating: { type: 'string', enum: Object.values(StoryContentRating) },
    tags: { type: 'array', items: { type: 'string' } },
    stats: StoryStatsSchema,
    status: { type: 'string', enum: Object.values(StoryStatus) },
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
  type: 'object',
  properties: {
    url: { type: 'string' },
    publicId: { type: 'string' },
  },
  required: ['url', 'publicId'],
};

export const StoryUpdateCardImageSchema = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    publicId: { type: 'string' },
  },
  required: ['url', 'publicId'],
};

// ===============================
// STORY RESPONSE OBJECTS
// ===============================

export const StoryResponses = {
  storyCreated: { 201: apiResponse(StoryCreateResponseSchema, 'Story created successfully') },
  storyDetails: {
    200: apiResponse(StorySchema, 'Story details'),
    404: errorResponse('Story not found'),
  },
  storyOverview: {
    200: apiResponse(StoryOverviewSchema, 'Story overview'),
    404: errorResponse('Story not found'),
  },
  storySettings: {
    200: apiResponse(StorySettingsSchema, 'Story settings'),
    404: errorResponse('Story not found'),
  },
  storyList: { 200: apiArrayResponse(StorySchema, 'List of stories') },
  storyPublished: { 200: apiResponse(StoryPublishResponseSchema, 'Story published successfully') },
  storyTree: { 200: apiResponse(StoryTreeResponseSchema, 'Story chapter tree') },
  signatureUrl: { 200: apiResponse(StorySignatureSchema, 'Signature URL generated successfully') },
  storyCoverImageUpdated: {
    200: apiResponse(StoryUpdateCoverImageSchema, 'Story cover image updated successfully'),
  },
  storyCardImageUpdated: {
    200: apiResponse(StoryUpdateCardImageSchema, 'Story card image updated successfully'),
  },
  acceptInvitation: {
    200: apiResponse({}, 'Invitation accepted successfully'),
    404: errorResponse('Invitation not found'),
  },
  declineInvitation: {
    200: apiResponse({}, 'Invitation declined successfully'),
    404: errorResponse('Invitation not found'),
  },
};
