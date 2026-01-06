import { PipelineStage } from 'mongoose';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class UserPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  matchById(userId: string) {
    this.pipeline.push({ $match: { _id: userId } });
    return this;
  }

  matchSearch(search: string) {
    if (!search) return this;

    const escapedSearch = escapeRegex(search);

    this.pipeline.push({
      $match: {
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ],
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

  sortByCreated() {
    this.pipeline.push({ $sort: { createdAt: -1 } });
    return this;
  }

  build() {
    return [...this.pipeline];
  }
}
