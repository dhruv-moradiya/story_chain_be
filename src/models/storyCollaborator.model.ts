import mongoose, { Schema } from 'mongoose';
import { IStoryCollaboratorDoc } from '@features/storyCollaborator/types/storyCollaborator.types';

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
      enum: ['OWNER', 'CO_AUTHOR', 'MODERATOR', 'REVIEWER', 'CONTRIBUTOR'],
      default: 'CONTRIBUTOR',
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
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED'],
      default: 'PENDING',
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
