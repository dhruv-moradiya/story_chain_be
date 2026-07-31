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
      canReviewPRs: true,
      canMergePRs: true,
      canForceMerge: true,
      canInviteCollaborators: true,
      canRemoveCollaborators: true,
      canChangePermissions: true,
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: true,
      canDistributeCoins: true,
      // Moderation: subject to conflict-of-interest check at service layer
      // (cannot resolve reports where they are the reported party)
      canResolveReports: true,
      // Appeals: can approve/reject story-level ban appeals
      // (cannot decide an appeal for a ban they personally issued)
      canReviewStoryAppeals: true,
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
      canReviewPRs: true,
      canMergePRs: true,
      canForceMerge: true,
      canInviteCollaborators: true,
      canRemoveCollaborators: false, // Only owner
      canChangePermissions: false, // Only owner
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: true,
      canDistributeCoins: false,
      // Moderation: subject to conflict-of-interest check at service layer
      canResolveReports: true,
      // Appeals: can approve/reject story-level ban appeals
      canReviewStoryAppeals: true,
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
      canReviewPRs: true,
      canMergePRs: true,
      canForceMerge: false,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: true,
      canDeleteComments: true,
      canBanFromStory: true,
      canViewStoryAnalytics: false,
      canDistributeCoins: false,
      // Moderation: can resolve/dismiss reports but cannot override owner/co_author decisions
      canResolveReports: true,
      // Appeals: cannot approve/reject — only owner and co_author have final say
      canReviewStoryAppeals: false,
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
      canReviewPRs: true, // Can comment on PRs
      canMergePRs: false,
      canForceMerge: false,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: false,
      canDeleteComments: false,
      canBanFromStory: false,
      canViewStoryAnalytics: false,
      canDistributeCoins: false,
      canResolveReports: false,
      canReviewStoryAppeals: false,
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
      canReviewPRs: false,
      canMergePRs: false,
      canForceMerge: false,
      canInviteCollaborators: false,
      canRemoveCollaborators: false,
      canChangePermissions: false,
      canModerateComments: false,
      canDeleteComments: false,
      canBanFromStory: false,
      canViewStoryAnalytics: false,
      canDistributeCoins: false,
      canResolveReports: false,
      canReviewStoryAppeals: false,
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
