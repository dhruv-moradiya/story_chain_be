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
  },
});

// ===============================
// COMMON DATA SCHEMAS
// ===============================

export const UserSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    role: { type: 'string', enum: ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] },
  },
};

export const UserPublicSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    avatarUrl: { type: 'string' },
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
    genre: {
      type: 'string',
      enum: [
        'FANTASY',
        'SCI_FI',
        'MYSTERY',
        'ROMANCE',
        'HORROR',
        'THRILLER',
        'ADVENTURE',
        'DRAMA',
        'COMEDY',
        'OTHER',
      ],
    },
    contentRating: { type: 'string', enum: ['GENERAL', 'TEEN', 'MATURE'] },
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

export const CollaboratorSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    storyId: { type: 'string' },
    userId: { type: 'string' },
    role: { type: 'string', enum: ['OWNER', 'CO_AUTHOR', 'MODERATOR', 'REVIEWER', 'CONTRIBUTOR'] },
    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED'] },
    user: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
  },
};

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

export const AutoSaveDraftSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    chapterId: { type: 'string' },
    userId: { type: 'string' },
    content: { type: 'string' },
    savedAt: { type: 'string', format: 'date-time' },
  },
};

// ===============================
// PRE-BUILT RESPONSE OBJECTS
// ===============================

export const StoryResponses = {
  storyCreated: { 201: apiResponse(StoryCreateResponseSchema, 'Story created successfully') },
  storyDetails: {
    200: apiResponse(StorySchema, 'Story details'),
    404: errorResponse('Story not found'),
  },
  storyList: { 200: apiArrayResponse(StorySchema, 'List of stories') },
  storyPublished: { 200: apiResponse(StoryPublishResponseSchema, 'Story published successfully') },
  storyTree: { 200: apiResponse(StoryTreeResponseSchema, 'Story chapter tree') },
  storySettings: { 200: apiResponse(StorySchema, 'Settings updated successfully') },
};

export const CollaboratorResponses = {
  collaboratorList: { 200: apiArrayResponse(CollaboratorSchema, 'List of collaborators') },
  collaboratorCreated: { 201: apiResponse(CollaboratorSchema, 'Invitation created successfully') },
};

export const ChapterResponses = {
  chapterCreated: { 201: apiResponse(ChapterSchema, 'Chapter added successfully') },
  chapterDetails: {
    200: apiResponse(ChapterSchema, 'Chapter details'),
    404: errorResponse('Chapter not found'),
  },
};

export const UserResponses = {
  currentUser: { 200: apiResponse(UserSchema, 'Current user details') },
  userProfile: {
    200: apiResponse(UserPublicSchema, 'Public user profile'),
    404: errorResponse('User not found'),
  },
  userList: { 200: apiArrayResponse(UserPublicSchema, 'List of matching users') },
};

export const AutoSaveResponses = {
  enabled: { 200: apiResponse({ message: { type: 'string' } }, 'Auto-save enabled successfully') },
  saved: { 200: apiResponse({ message: { type: 'string' } }, 'Content saved successfully') },
  disabled: {
    200: apiResponse({ message: { type: 'string' } }, 'Auto-save disabled successfully'),
  },
  draft: { 200: apiResponse(AutoSaveDraftSchema, 'Auto-save draft retrieved') },
};
