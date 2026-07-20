import { TOKENS } from '@/container';
import { IToggleFollowDTO } from '@/dto/follow.dto';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { FollowRepository } from '../repositories/follow.repository';
import { trySafe } from '@/utils/trySafe';

@singleton()
export class FollowService extends BaseModule {
  constructor(
    @inject(TOKENS.FollowRepository)
    private readonly followRepo: FollowRepository
  ) {
    super();
  }

  async toggleFollow(input: IToggleFollowDTO) {
    const { userId, followingId } = input;

    // 1. Check whether the user is already following the target user.
    const [followedUser, checkError] = await trySafe(() =>
      this.followRepo.checkFollow(userId, followingId)
    );

    if (checkError) {
      this.throwInternalError('Failed to check follow status.');
    }

    // 2. If already following, remove the follow relationship.
    if (followedUser) {
      const [result, unfollowError] = await trySafe(() =>
        this.followRepo.unfollow(userId, followingId)
      );

      if (unfollowError) {
        this.throwInternalError('Failed to unfollow user.');
      }

      return result;
    }

    // 3. Otherwise, create a new follow relationship.
    const [result, followError] = await trySafe(() => this.followRepo.follow(userId, followingId));

    if (followError) {
      this.throwInternalError('Failed to follow user.');
    }

    // 4. Return the newly created follow relationship.
    return result;
  }
}
