import { IStory } from '@features/story/types/story.types';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';

interface INotificationForCollabInvitation {
  invitedUser: {
    id: string;
    name: string;
  };
  inviterUser: {
    id: string;
    name: string;
  };
  story: IStory;
  role: TStoryCollaboratorRole;
}

interface IGetUserNotificationDTO {
  userId: string;
}

export type { INotificationForCollabInvitation, IGetUserNotificationDTO };
