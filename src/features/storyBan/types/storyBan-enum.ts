import { StoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator-enum';

// Only roles with canBanFromStory: true can issue story bans.
export enum StoryBanIssuerRole {
  OWNER = StoryCollaboratorRole.OWNER,
  CO_AUTHOR = StoryCollaboratorRole.CO_AUTHOR,
  MODERATOR = StoryCollaboratorRole.MODERATOR,
}

export const STORY_BAN_ISSUER_ROLES = [
  StoryBanIssuerRole.OWNER,
  StoryBanIssuerRole.CO_AUTHOR,
  StoryBanIssuerRole.MODERATOR,
] as const;
