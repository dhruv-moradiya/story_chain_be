import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '../features/storyCollaborator/storyCollaborator.types';

interface IStoryCollaboratorCreateDTO {
  slug: string;
  userId: string;
  role: TStoryCollaboratorRole;
  status?: TStoryCollaboratorStatus;
}

interface IStoryCollaboratorInvitationDTO {
  slug: string;
  role: TStoryCollaboratorRole;
  invitedUser: {
    id: string;
    name: string;
  };
  inviterUser: {
    id: string;
    name: string;
  };
}

interface IStoryCollaboratorUpdateStatusDTO {
  status: TStoryCollaboratorStatus;
  userId: string;
  slug: string;
}

interface IGetAllStoryMembersBySlugDTO {
  slug: string;
}

export type {
  IGetAllStoryMembersBySlugDTO,
  IStoryCollaboratorCreateDTO,
  IStoryCollaboratorInvitationDTO,
  IStoryCollaboratorUpdateStatusDTO,
};
