import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IFollow, IFollowDoc } from '../types/follow.types';
import { Follow } from '@/models/follow.model';

@singleton()
export class FollowRepository extends BaseRepository<IFollow, IFollowDoc> {
  constructor() {
    super(Follow);
  }

  async follow(followerId: string, followingId: string) {
    return this.create({ data: { followerId, followingId } });
  }

  async unfollow(followerId: string, followingId: string) {
    return this.model.deleteOne({ followerId, followingId });
  }

  async checkFollow(followerId: string, followingId: string) {
    return this.findOne({ filter: { followerId, followingId } });
  }
}
