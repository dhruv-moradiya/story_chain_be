import { IStoryBanPopulated } from '@/features/storyBan/types/storyBan.types';

export interface IStoryBanStatusResponse {
  isBanned: boolean;
  banDetails: IStoryBanPopulated | null;
}
