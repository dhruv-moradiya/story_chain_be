import { StoryCollaborator } from '../../../models/storyCollaborator.model';
import { IStoryCollaborator, IStoryCollaboratorDoc } from '../storyCollaborator.types';
import { ApiError } from '../../../utils/apiResponse';
import { ClientSession } from 'mongoose';
import { BaseRepository } from '../../../utils/baseClass';

export class StoryCollaboratorRepository extends BaseRepository<
  IStoryCollaborator,
  IStoryCollaboratorDoc
> {
  async findByStoryAndUser(storyId: string, userId: string) {
    return StoryCollaborator.findOne({ storyId, userId });
  }

  async addCollaborator(data: IStoryCollaborator, options?: { session?: ClientSession }) {
    return StoryCollaborator.create([data], options);
  }

  async updateCollaborator(
    storyId: string,
    userId: string,
    data: Partial<IStoryCollaborator>,
    options?: { session?: ClientSession }
  ) {
    return StoryCollaborator.findOneAndUpdate({ storyId, userId }, data, {
      new: true,
      session: options?.session,
    });
  }

  async removeCollaborator(storyId: string, userId: string, options?: { session?: ClientSession }) {
    const result = await StoryCollaborator.deleteOne({ storyId, userId }, options);
    if (result.deletedCount === 0) throw ApiError.notFound('Collaborator not found');
  }

  async findStoryCollaborators(storyId: string) {
    return StoryCollaborator.find({ storyId });
  }

  async findUserStories(userId: string) {
    return StoryCollaborator.find({ userId, status: 'ACCEPTED' });
  }
}
