import { apiArrayResponse } from './helpers.js';
import { timestampsSchema, objectIdSchema } from './common.js';

export const PullRequestSchema = {
  type: 'object',
  properties: {
    _id: objectIdSchema,
    title: { type: 'string' },
    description: { type: 'string' },
    storySlug: { type: 'string' },
    chapterSlug: { type: 'string' },
    parentChapterSlug: { type: 'string', nullable: true },
    authorId: { type: 'string' },
    prType: { type: 'string' },
    content: {
      type: 'object',
      properties: {
        proposed: { type: 'string' },
        wordCount: { type: 'number' },
        readingMinutes: { type: 'number' },
      },
    },
    status: { type: 'string' },
    votes: {
      type: 'object',
      properties: {
        upvotes: { type: 'number' },
        downvotes: { type: 'number' },
        score: { type: 'number' },
      },
    },
    commentCount: { type: 'number' },
    autoApprove: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        threshold: { type: 'number' },
        timeWindow: { type: 'number' },
        qualifiedAt: { type: 'string', format: 'date-time', nullable: true },
        autoApprovedAt: { type: 'string', format: 'date-time', nullable: true },
      },
      nullable: true,
    },
    labels: { type: 'array', items: { type: 'string' }, nullable: true },
    isDraft: { type: 'boolean' },
    approvalsStatus: {
      type: 'object',
      properties: {
        required: { type: 'number' },
        received: { type: 'number' },
        pending: { type: 'number' },
        approvers: { type: 'array', items: { type: 'string' } },
        blockers: { type: 'array', items: { type: 'string' } },
        canMerge: { type: 'boolean' },
      },
      nullable: true,
    },
    stats: {
      type: 'object',
      properties: {
        views: { type: 'number' },
        discussions: { type: 'number' },
        reviewsReceived: { type: 'number' },
      },
      nullable: true,
    },
    author: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
      },
      nullable: true,
    },
    story: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
      },
      nullable: true,
    },
    chapter: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        parentChapter: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            slug: { type: 'string' },
          },
          nullable: true,
        },
      },
      nullable: true,
    },
    approvers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clerkId: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      nullable: true,
    },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clerkId: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      nullable: true,
    },
    ...timestampsSchema,
  },
};

export const PullRequestResponses = {
  pullRequestList: {
    200: apiArrayResponse(PullRequestSchema, "Fetched current user's pull requests successfully"),
  },
};
