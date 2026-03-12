import { IOperationOptions } from '@/types';
import { IStoryCollaboratorInvitationDTO } from '@dto/storyCollaborator.dto';
import { StoryCollaborator } from '@models/storyCollaborator.model';
import { ApiError } from '@utils/apiResponse';
import { BaseRepository } from '@utils/baseClass';
import { ClientSession, PipelineStage } from 'mongoose';
import { IStoryCollaborator, IStoryCollaboratorDoc } from '../types/storyCollaborator.types';

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

  // ==================== CREATE METHODS ====================

  /** Bulk insert collaborators */
  async createMany(
    data: Partial<IStoryCollaborator>[],
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator[]> {
    const docs = await this.model.insertMany(data, { session: options.session, lean: true });
    return docs as IStoryCollaborator[];
  }

  async addCollaborator(data: IStoryCollaborator, options?: { session?: ClientSession }) {
    return this.model.create([data], options);
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

  // ==================== UPDATE METHODS ====================

  async updateCollaborator(
    slug: string,
    userId: string,
    data: Partial<IStoryCollaborator>,
    options?: { session?: ClientSession }
  ) {
    return this.model.findOneAndUpdate({ slug, userId }, data, {
      new: true,
      session: options?.session,
    });
  }

  // ==================== DELETE METHODS ====================

  async removeCollaborator(slug: string, userId: string, options?: { session?: ClientSession }) {
    const result = await this.model.deleteOne({ slug, userId }, options);
    if (result.deletedCount === 0) throw ApiError.notFound('Collaborator not found');
  }

  // ==================== QUERY METHODS ====================

  async findByStoryAndUser(slug: string, userId: string) {
    return this.model.findOne({ slug, userId });
  }

  async findStoryCollaborators(slug: string): Promise<IStoryCollaborator[]> {
    return this.model.find({ slug });
  }

  async findUserStories(userId: string) {
    return this.model.find({ userId, status: StoryCollaboratorStatus.ACCEPTED });
  }
}
