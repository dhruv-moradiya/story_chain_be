import { PipelineStage } from 'mongoose';

const PUBLIC_AUTHOR_PROJECTION: PipelineStage.Project['$project'] = {
  _id: 0,
  clerkId: 1,
  username: 1,
  avatarUrl: 1,
};

const PUBLIC_AUTHOR_CARD_PROJECTION = {
  clerkId: '$author.clerkId',
  username: '$author.username',
  imageUrl: '$author.imageUrl',
};

const CHAPTER_WITH_STORY_PROJECTION = {
  _id: 1,
  title: 1,
  slug: 1,
  storyTitle: '$story.title',
  storySlug: '$story.slug',
  chapterNumber: 1,
  status: 1,
  isEnding: 1,
  version: 1,

  votes: {
    upvotes: 1,
    downvotes: 1,
  },

  stats: {
    reads: 1,
    comments: 1,
    childBranches: 1,
    uniqueReaders: 1,
    completionRate: 1,
  },
  displayNumber: 1,

  pullRequest: {
    isPR: 1,
    status: 1,
    prId: 1,
  },

  // Moderation
  reportCount: 1,
  isFlagged: 1,

  updatedAt: 1,
};

export { PUBLIC_AUTHOR_PROJECTION, PUBLIC_AUTHOR_CARD_PROJECTION, CHAPTER_WITH_STORY_PROJECTION };
