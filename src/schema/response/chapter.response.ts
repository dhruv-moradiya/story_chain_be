import { apiResponse, apiArrayResponse, errorResponse } from './helpers';

// ===============================
// CHAPTER DATA SCHEMAS
// ===============================

export const ChapterSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    storyId: { type: 'string' },
    parentChapterId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Schema for chapter with story info (used in user's chapter list)
 */
export const ChapterWithStorySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    storyTitle: { type: 'string' },
    storySlug: { type: 'string' },
    chapterNumber: { type: 'number' },
    status: { type: 'string' },
    isEnding: { type: 'boolean' },
    version: { type: 'number' },
    displayNumber: { type: 'string' },

    votes: {
      type: 'object',
      properties: {
        upvotes: { type: 'number' },
        downvotes: { type: 'number' },
      },
    },

    stats: {
      type: 'object',
      properties: {
        reads: { type: 'number' },
        comments: { type: 'number' },
        childBranches: { type: 'number' },
        uniqueReaders: { type: 'number' },
        completionRate: { type: 'number' },
      },
    },

    pullRequest: {
      type: 'object',
      properties: {
        isPR: { type: 'boolean' },
        status: { type: 'string' },
        prId: { type: 'string' },
      },
    },

    // Moderation
    reportCount: { type: 'number' },
    isFlagged: { type: 'boolean' },

    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Schema for full chapter details (used for single chapter view)
 */
export const ChapterDetailsSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    status: { type: 'string' },
    parentChapterId: { type: 'string' },
    depth: { type: 'number' },
    chapterNumber: { type: 'number' },
    isEnding: { type: 'boolean' },
    version: { type: 'number' },
    storyId: { type: 'string' },
    storySlug: { type: 'string' },
    storyTitle: { type: 'string' },
    pullRequest: {
      type: 'object',
      properties: {
        isPR: { type: 'boolean' },
        prId: { type: 'string' },
        status: { type: 'string' },
        submittedAt: { type: 'string', format: 'date-time' },
        reviewedBy: { type: 'string' },
        reviewedAt: { type: 'string', format: 'date-time' },
        rejectionReason: { type: 'string' },
      },
    },
    stats: {
      type: 'object',
      properties: {
        reads: { type: 'number' },
        comments: { type: 'number' },
        childBranches: { type: 'number' },
      },
    },
    votes: {
      type: 'object',
      properties: {
        upvotes: { type: 'number' },
        downvotes: { type: 'number' },
        score: { type: 'number' },
      },
    },
    author: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        imageUrl: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// ===============================
// CHAPTER RESPONSE OBJECTS
// ===============================

export const ChapterResponses = {
  chapterCreated: { 201: apiResponse(ChapterSchema, 'Chapter added successfully') },
  chapterDetails: {
    200: apiResponse(ChapterDetailsSchema, 'Chapter details retrieved successfully'),
    404: errorResponse('Chapter not found'),
  },
  myChapters: {
    200: apiArrayResponse(ChapterWithStorySchema, 'User chapters retrieved successfully'),
  },
};
