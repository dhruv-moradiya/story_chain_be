import { ID } from '../types';
import { TStoryCollaboratorRole } from '../features/storyCollaborator/storyCollaborator.types';

interface IStoryCollaboratorCreateDTO {
  storyId: ID;
  userId: string;
  role: TStoryCollaboratorRole;
}

interface IStoryCollaboratorInvitationDTO {
  storyId: ID;
  role: TStoryCollaboratorRole;
  invitedUserId: string;
  inviterUserId: string;
}

interface IGetAllStoryMembers {
  storyId: ID;
}

export type { IStoryCollaboratorInvitationDTO, IGetAllStoryMembers, IStoryCollaboratorCreateDTO };
