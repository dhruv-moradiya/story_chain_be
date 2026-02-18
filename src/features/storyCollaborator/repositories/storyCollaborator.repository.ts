import { StoryCollaborator } from '@models/storyCollaborator.model';
import { IStoryCollaborator, IStoryCollaboratorDoc } from '../types/storyCollaborator.types';
import { ApiError } from '@utils/apiResponse';
import { ClientSession, PipelineStage } from 'mongoose';
import { BaseRepository } from '@utils/baseClass';
import { IStoryCollaboratorInvitationDTO } from '@dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';

import { StoryCollaboratorStatus } from '../types/storyCollaborator-enum';

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

  async findByStoryAndUser(slug: string, userId: string) {
    return StoryCollaborator.findOne({ slug, userId });
  }

  async addCollaborator(data: IStoryCollaborator, options?: { session?: ClientSession }) {
    return StoryCollaborator.create([data], options);
  }

  async updateCollaborator(
    slug: string,
    userId: string,
    data: Partial<IStoryCollaborator>,
    options?: { session?: ClientSession }
  ) {
    return StoryCollaborator.findOneAndUpdate({ slug, userId }, data, {
      new: true,
      session: options?.session,
    });
  }

  async removeCollaborator(slug: string, userId: string, options?: { session?: ClientSession }) {
    const result = await StoryCollaborator.deleteOne({ slug, userId }, options);
    if (result.deletedCount === 0) throw ApiError.notFound('Collaborator not found');
  }

  async findStoryCollaborators(slug: string): Promise<IStoryCollaborator[]> {
    return StoryCollaborator.find({ slug });
  }

  async findUserStories(userId: string) {
    return StoryCollaborator.find({ userId, status: StoryCollaboratorStatus.ACCEPTED });
  }
}
