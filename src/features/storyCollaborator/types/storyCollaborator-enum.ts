enum StoryCollaboratorRole {
  OWNER = 'owner',
  CO_AUTHOR = 'co_author',
  MODERATOR = 'moderator',
  REVIEWER = 'reviewer',
  CONTRIBUTOR = 'contributor',
}

const STORY_COLLABORATOR_ROLES = [
  'owner',
  'co_author',
  'moderator',
  'reviewer',
  'contributor',
] as const;

enum StoryCollaboratorStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REMOVED = 'removed',
}

const STORY_COLLABORATOR_STATUSES = ['pending', 'accepted', 'declined', 'removed'] as const;

const ROLE_HIERARCHY = {
  [StoryCollaboratorRole.CONTRIBUTOR]: 0,
  [StoryCollaboratorRole.REVIEWER]: 1,
  [StoryCollaboratorRole.MODERATOR]: 2,
  [StoryCollaboratorRole.CO_AUTHOR]: 3,
  [StoryCollaboratorRole.OWNER]: 4,
} as const;

const STORY_COLLABORATOR_ROLE_CONFIG = {
  [StoryCollaboratorRole.OWNER]: {
    name: 'Story Owner',
    description: 'Creator of the story, full control',
    permissions: {
      canEditStorySettings: true,
      canDeleteStory: true,
      canArchiveStory: true,
      canWriteChapters: true,
      canEditAnyChapter: true,
      canDeleteAnyChapter: true,
      canApprovePRs: true,
      canRejectPRs: true,
      canReviewPRs: true,
      canMergePRs: true,
      canInviteCollaborators: true,
      canRemoveCollaborators: true,
      canChangePermissions: true,
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: true,
    },
  },

  [StoryCollaboratorRole.CO_AUTHOR]: {
    name: 'Co-Author',
    description: 'Equal partner in story creation',
    permissions: {
      canEditStorySettings: true,
      canDeleteStory: false, // Only owner can delete
      canArchiveStory: true,
      canWriteChapters: true,
      canEditAnyChapter: true,
      canDeleteAnyChapter: true,
      canApprovePRs: true,
      canRejectPRs: true,
      canReviewPRs: true,
      canMergePRs: true,
      canInviteCollaborators: true,
      canRemoveCollaborators: false, // Only owner
      canChangePermissions: false, // Only owner
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: true,
    },
  },

  [StoryCollaboratorRole.MODERATOR]: {
    name: 'Story Moderator',
    description: 'Manage PRs and moderate content',
    permissions: {
      canEditStorySettings: false,
      canDeleteStory: false,
      canArchiveStory: false,
      canWriteChapters: true,
      canEditAnyChapter: false,
      canDeleteAnyChapter: false,
      canApprovePRs: true,
      canRejectPRs: true,
      canReviewPRs: true,
      canMergePRs: true,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: false,
    },
  },

  [StoryCollaboratorRole.REVIEWER]: {
    name: 'Reviewer',
    description: 'Review PRs but cannot approve/reject',
    permissions: {
      canEditStorySettings: false,
      canDeleteStory: false,
      canArchiveStory: false,
      canWriteChapters: true,
      canEditAnyChapter: false,
      canDeleteAnyChapter: false,
      canApprovePRs: false,
      canRejectPRs: false,
      canReviewPRs: true, // Can comment on PRs
      canMergePRs: false,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: false,
      canDeleteComments: false,
      canBanFromStory: false,
      canViewStoryAnalytics: false,
    },
  },

  [StoryCollaboratorRole.CONTRIBUTOR]: {
    name: 'Trusted Contributor',
    description: 'Can write chapters directly without PR',
    permissions: {
      canEditStorySettings: false,
      canDeleteStory: false,
      canArchiveStory: false,
      canWriteChapters: true,
      canEditAnyChapter: false,
      canDeleteAnyChapter: false,
      canApprovePRs: false,
      canRejectPRs: false,
      canReviewPRs: false,
      canMergePRs: false,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: false,
      canDeleteComments: false,
      canBanFromStory: false,
      canViewStoryAnalytics: false,
    },
  },
} as const;

export {
  ROLE_HIERARCHY,
  STORY_COLLABORATOR_ROLE_CONFIG,
  STORY_COLLABORATOR_ROLES,
  STORY_COLLABORATOR_STATUSES,
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
};
