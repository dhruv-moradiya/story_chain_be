import mongoose, { Schema } from 'mongoose';
import { IStoryCollaboratorDoc } from '@features/storyCollaborator/types/storyCollaborator.types';
import {
  STORY_COLLABORATOR_ROLES,
  STORY_COLLABORATOR_STATUSES,
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';

const storyCollaboratorSchema = new Schema<IStoryCollaboratorDoc>(
  {
    slug: {
      type: String,
      ref: 'Story',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: STORY_COLLABORATOR_ROLES,
      default: StoryCollaboratorRole.CONTRIBUTOR,
    },
    invitedBy: {
      type: String,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    status: {
      type: String,
      enum: STORY_COLLABORATOR_STATUSES,
      default: StoryCollaboratorStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one role per user per story
storyCollaboratorSchema.index({ slug: 1, userId: 1 }, { unique: true });

const StoryCollaborator = mongoose.model('StoryCollaborator', storyCollaboratorSchema);

export { StoryCollaborator };
