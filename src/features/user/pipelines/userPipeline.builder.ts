import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class UserPipelineBuilder extends BasePipelineBuilder<UserPipelineBuilder> {
  matchByClerkId(clerkId: string) {
    this.pipeline.push({ $match: { clerkId } });
    return this;
  }

  matchById(userId: string) {
    this.pipeline.push({ $match: { _id: userId } });
    return this;
  }

  matchSearch(search?: string) {
    if (!search || search.trim() === '') return this;

    const escapedSearch = escapeRegex(search.trim());

    this.pipeline.push({
      $match: {
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { clerkId: { $regex: escapedSearch, $options: 'i' } },
        ],
      },
    });
    return this;
  }

  projectPaginatedUserData() {
    this.pipeline.push({
      $project: {
        clerkId: 1,
        username: 1,
        email: 1,
        bio: 1,
        avatarUrl: 1,
        xp: 1,
        level: 1,
        badges: 1,
        stats: 1,
        preferences: 1,
        isActive: 1,
        lastActive: 1,
        createdAt: 1,
        updatedAt: 1,
        connectedAccounts: 1,
        primaryAuthMethod: 1,
        emailVerified: 1,
      },
    });
    return this;
  }

  includeRoles() {
    this.pipeline.push({
      $lookup: {
        from: 'platformroles',
        localField: 'clerkId',
        foreignField: 'userId',
        as: 'roles',
      },
    });
    return this;
  }

  activeOnly() {
    this.pipeline.push({ $match: { isActive: true } });
    return this;
  }

  sortByCreated(order: 1 | -1 = -1) {
    this.pipeline.push({ $sort: { createdAt: order } });
    return this;
  }
}
