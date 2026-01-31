interface IStoryInvitationService {
  createInvite(slug: string, role: string): Promise<string>;
  acceptInvite(inviteLink: string, invitedUserId: string): Promise<void>;
  declineInvite(inviteLink: string, invitedUserId: string): Promise<void>;
}

export type { IStoryInvitationService };
