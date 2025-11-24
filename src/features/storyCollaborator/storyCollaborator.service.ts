import { StoryCollaborator } from '../../models/storyCollaborator.model';
import { BaseRepository } from '../../utils/baseClass';
import { IStoryCollaborator, IStoryCollaboratorDoc } from './storyCollaborator.types';

export class StoryCollaboratorRepository extends BaseRepository<
  IStoryCollaborator,
  IStoryCollaboratorDoc
> {
  constructor() {
    super(StoryCollaborator);
  }

  async findCollaborator(
    storyId: string,
    userId: string,
    status: IStoryCollaborator['status']
  ): Promise<IStoryCollaborator | null> {
    return this.findOne({ storyId, userId, status });
  }

  async findModerators(storyId: string): Promise<IStoryCollaborator[]> {
    return await StoryCollaborator.find({
      storyId,
      status: 'ACCEPTED',
      'permissions.canApprove': true,
    }).select('userId');
  }
}
