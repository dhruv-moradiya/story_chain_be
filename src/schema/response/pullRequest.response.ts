import { apiPaginatedResponse } from './helpers.js';
import { objectIdSchema, timestampsSchema, votesSchema } from './common.js';

const PullRequestContentSchema = {
  type: 'object',
  properties: {
    proposed: { type: 'string' },
    wordCount: { type: 'number' },
    readingMinutes: { type: 'number' },
  },
};

const PullRequestAutoApproveSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    threshold: { type: 'number' },
    timeWindow: { type: 'number' },
  },
};

const PullRequestApprovalsStatusSchema = {
  type: 'object',
  properties: {
    required: { type: 'number' },
    received: { type: 'number' },
    pending: { type: 'number' },
    approvers: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    canMerge: { type: 'boolean' },
  },
};

const PullRequestStatsSchema = {
  type: 'object',
  properties: {
    views: { type: 'number' },
    discussions: { type: 'number' },
    reviewsReceived: { type: 'number' },
  },
};

const PullRequestUserSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    avatarUrl: { type: 'string', nullable: true },
  },
};

const PullRequestStorySchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
  },
};

const PullRequestParentChapterSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
  },
};

const PullRequestChapterSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    parentChapter: {
      ...PullRequestParentChapterSchema,
      nullable: true,
    },
  },
};

export const PullRequestSchema = {
  type: 'object',
  properties: {
    _id: objectIdSchema,
    title: { type: 'string' },
    description: { type: 'string' },
    prType: { type: 'string' },
    content: PullRequestContentSchema,
    status: { type: 'string' },
    votes: votesSchema,
    commentCount: { type: 'number' },
    autoApprove: PullRequestAutoApproveSchema,
    labels: { type: 'array', items: { type: 'string' } },
    isDraft: { type: 'boolean' },
    approvalsStatus: PullRequestApprovalsStatusSchema,
    stats: PullRequestStatsSchema,
    author: {
      ...PullRequestUserSchema,
      nullable: true,
    },
    story: {
      ...PullRequestStorySchema,
      nullable: true,
    },
    chapter: {
      ...PullRequestChapterSchema,
      nullable: true,
    },
    approvers: {
      type: 'array',
      items: PullRequestUserSchema,
    },
    blockers: {
      type: 'array',
      items: PullRequestUserSchema,
    },
    ...timestampsSchema,
  },
};

export const PullRequestResponses = {
  pullRequestList: {
    200: apiPaginatedResponse(
      PullRequestSchema,
      "Fetched current user's pull requests successfully"
    ),
  },
};
