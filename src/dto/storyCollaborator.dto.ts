import { ID } from '../types';
import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '../features/storyCollaborator/storyCollaborator.types';

interface IStoryCollaboratorCreateDTO {
  storyId: ID;
  userId: string;
  role: TStoryCollaboratorRole;
  status?: TStoryCollaboratorStatus;
}

interface IStoryCollaboratorInvitationDTO {
  storyId: ID;
  role: TStoryCollaboratorRole;
  invitedUserId: string;
  inviterUserId: string;
}

interface IStoryCollaboratorUpdateStatusDTO {
  status: TStoryCollaboratorStatus;
  userId: string;
  stotyId: ID;
}

interface IGetAllStoryMembers {
  storyId: ID;
}

export type {
  IStoryCollaboratorInvitationDTO,
  IGetAllStoryMembers,
  IStoryCollaboratorCreateDTO,
  IStoryCollaboratorUpdateStatusDTO,
};
