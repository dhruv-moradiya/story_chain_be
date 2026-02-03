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
  firstName: '$author.firstName',
  lastName: '$author.lastName',
  imageUrl: '$author.imageUrl',
};

const CHAPTER_WITH_STORY_PROJECTION = {
  _id: 1,
  title: 1,
  status: 1,
  pullRequest: 1,
  stats: 1,
  createdAt: 1,
  updatedAt: 1,
  storySlug: '$story.slug',
  storyTitle: '$story.title',
  author: PUBLIC_AUTHOR_CARD_PROJECTION,
};

export { PUBLIC_AUTHOR_PROJECTION, PUBLIC_AUTHOR_CARD_PROJECTION, CHAPTER_WITH_STORY_PROJECTION };
