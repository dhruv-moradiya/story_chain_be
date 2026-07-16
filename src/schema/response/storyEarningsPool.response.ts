import {
  apiResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '.';

export const DistributeCoinsSchema = {
  type: 'object',
  properties: {
    distributed: { type: 'number' },
    recipients: { type: 'number' },
  },
  required: ['distributed', 'recipients'],
} as const;

export const GetStoryEarningsPoolSchema = {
  type: 'object',
  properties: {
    storySlug: { type: 'string' },
    storyOwnerId: { type: 'string' },
    balance: { type: 'number' },
    totalReceived: { type: 'number' },
    totalDistributed: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'storySlug',
    'storyOwnerId',
    'balance',
    'totalReceived',
    'totalDistributed',
    'createdAt',
    'updatedAt',
  ],
} as const;

export const StoryEarningsPoolResponses = {
  storyEarningsPoolCreated: {
    200: apiResponse(GetStoryEarningsPoolSchema, 'Story earnings pool created successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to story pool'),
    404: notFoundResponse('Earning pool not found'),
    500: internalErrorResponse(),
  },
  distributeCoins: {
    200: apiResponse(DistributeCoinsSchema, 'Coins distributed successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to story pool'),
    404: notFoundResponse('Earning pool not found'),
    500: internalErrorResponse(),
  },
};
