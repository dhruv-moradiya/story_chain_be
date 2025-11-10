import { Document, Types } from 'mongoose';

export interface IStoryCollaborator {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  userId: string;
  role: 'OWNER' | 'CO_AUTHOR' | 'MODERATOR' | 'REVIEWER' | 'CONTRIBUTOR';
  permissions: {
    // Story management
    canEditStorySettings: boolean;
    canDeleteStory: boolean;
    canArchiveStory: boolean;

    // Chapter management
    canWriteChapters: boolean;
    canEditAnyChapter: boolean;
    canDeleteAnyChapter: boolean;

    // PR system (if story uses requireApproval)
    canApprovePRs: boolean;
    canRejectPRs: boolean;
    canReviewPRs: boolean;
    canMergePRs: boolean;

    // Collaborator management
    canInviteCollaborators: boolean;
    canRemoveCollaborators: boolean;
    canChangePermissions: boolean;

    // Moderation (story-specific)
    canModerateComments: boolean;
    canDeleteComments: boolean;
    canBanFromStory: boolean;

    // Analytics
    canViewStoryAnalytics: boolean;
  };
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStoryCollaboratorDoc extends IStoryCollaborator, Document<Types.ObjectId> {}
