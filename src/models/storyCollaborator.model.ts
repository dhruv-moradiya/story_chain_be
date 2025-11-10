import mongoose, { Schema } from 'mongoose';
import { IStoryCollaboratorDoc } from '../features/storyCollaborator/storyCollaborator.types';

const storyCollaboratorSchema = new Schema<IStoryCollaboratorDoc>(
  {
    storyId: {
      type: Schema.Types.ObjectId,
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
    permissions: {
      // Story management
      canEditStorySettings: { type: Boolean, default: false },
      canDeleteStory: { type: Boolean, default: false },
      canArchiveStory: { type: Boolean, default: false },

      // Chapters
      canWriteChapters: { type: Boolean, default: true },
      canEditAnyChapter: { type: Boolean, default: false },
      canDeleteAnyChapter: { type: Boolean, default: false },

      // PR system
      canApprovePRs: { type: Boolean, default: false },
      canRejectPRs: { type: Boolean, default: false },
      canReviewPRs: { type: Boolean, default: false },
      canMergePRs: { type: Boolean, default: false },

      // Collaborators
      canInviteCollaborators: { type: Boolean, default: false },
      canRemoveCollaborators: { type: Boolean, default: false },
      canChangePermissions: { type: Boolean, default: false },

      // Moderation
      canModerateComments: { type: Boolean, default: false },
      canDeleteComments: { type: Boolean, default: false },
      canBanFromStory: { type: Boolean, default: false },

      // Analytics
      canViewStoryAnalytics: { type: Boolean, default: false },
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
storyCollaboratorSchema.index({ storyId: 1, userId: 1 }, { unique: true });

const StoryCollaborator = mongoose.model('StoryCollaborator', storyCollaboratorSchema);

export { StoryCollaborator };
