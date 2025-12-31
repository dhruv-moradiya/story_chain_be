import { StoryCollaborator } from '../../../models/storyCollaborator.model';
import { IStoryCollaborator, IStoryCollaboratorDoc } from '../storyCollaborator.types';
import { ApiError } from '../../../utils/apiResponse';
import { ClientSession, PipelineStage } from 'mongoose';
import { BaseRepository } from '../../../utils/baseClass';
import { IStoryCollaboratorInvitationDTO } from '../../../dto/storyCollaborator.dto';
import { ID, IOperationOptions } from '../../../types';

export class StoryCollaboratorRepository extends BaseRepository<
  IStoryCollaborator,
  IStoryCollaboratorDoc
> {
  constructor() {
    super(StoryCollaborator);
  }

  async aggregateStories<T = IStoryCollaborator>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  async createInvitation(
    input: IStoryCollaboratorInvitationDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const doc = new this.model({
      slug: input.slug,
      userId: input.invitedUser.id,
      invitedBy: input.inviterUser.id,
      role: input.role,
    });

    await doc.save({ session: options.session });

    return doc.toObject();
  }

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

  async findStoryCollaborators(storyId: ID): Promise<IStoryCollaborator[]> {
    return StoryCollaborator.find({ storyId });
  }

  async findUserStories(userId: string) {
    return StoryCollaborator.find({ userId, status: 'ACCEPTED' });
  }
}
