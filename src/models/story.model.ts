import mongoose, { Schema } from 'mongoose';
import { IStoryDoc } from '@features/story/types/story.types';
import {
  STORY_CONTENT_RATINGS,
  STORY_GENRES,
  STORY_STATUSES,
  StoryStatus,
} from '@/features/story/types/story-enum';

const storySchema = new Schema<IStoryDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
      index: 'text',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
      index: 'text',
    },
    coverImage: {
      url: String,
      publicId: String,
    },
    cardImage: {
      url: String,
      publicId: String,
    },

    // Creator
    creatorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // Settings
    settings: {
      isPublic: { type: Boolean, default: false }, // If false, only creator/collaborators can view
      allowBranching: { type: Boolean, default: false }, // If true, readers can create branches
      requireApproval: { type: Boolean, default: true }, // If true, branches need approval from creator/collaborators
      allowComments: { type: Boolean, default: false }, // If true, readers can comment on chapters
      allowVoting: { type: Boolean, default: false }, // If true, readers can vote on the story

      // Metadata
      genres: {
        type: [String],
        enum: STORY_GENRES,
        default: [],
      },
      contentRating: {
        type: String,
        enum: STORY_CONTENT_RATINGS,
        default: 'general',
      },
    },

    // Statistics
    stats: {
      totalChapters: { type: Number, default: 0 },
      totalBranches: { type: Number, default: 0 },
      totalReads: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      uniqueContributors: { type: Number, default: 1 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
    },

    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Status
    status: {
      type: String,
      enum: STORY_STATUSES,
      default: StoryStatus.DRAFT,
    },

    // Trending
    trendingScore: {
      type: Number,
      default: 0,
      index: -1,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
storySchema.index({ creatorId: 1, createdAt: -1 });
storySchema.index({ trendingScore: -1, publishedAt: -1 });
storySchema.index({ 'stats.totalReads': -1 });
storySchema.index({ tags: 1 });
storySchema.index({ title: 'text', description: 'text' });

const Story = mongoose.model('Story', storySchema);

export { Story };
