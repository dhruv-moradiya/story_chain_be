import { ProjectionType, UpdateQuery } from 'mongoose';
import { singleton } from 'tsyringe';
import { User } from '@models/user.model';
import { ICreateNewUser, IUser, IUserDoc } from '../types/user.types';
import { BaseRepository } from '@utils/baseClass';
import { IUserRepository } from '../interfaces';

@singleton()
export class UserRepository extends BaseRepository<IUser, IUserDoc> implements IUserRepository {
  constructor() {
    super(User);
  }

  async createNewUser(input: ICreateNewUser): Promise<IUser> {
    return this.create({ data: input });
  }

  async findByClerkId(
    clerkId: string,
    projection?: ProjectionType<IUser> | null
  ): Promise<IUser | null> {
    return this.findOne({ filter: { clerkId }, projection });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ filter: { email } });
  }

  async findByUsername(username: string): Promise<IUser[]> {
    return this.findMany({
      filter: {
        username: {
          $regex: username,
          $options: 'i',
        },
      },
    });
  }

  async findOneByUsername(username: string): Promise<IUser | null> {
    return this.findOne({
      filter: { username },
    });
  }

  async updateByClerkId(id: string, update: UpdateQuery<IUser>): Promise<IUser | null> {
    return this.findOneAndUpdate({
      filter: { clerkId: id },
      update: { ...update },
      options: { new: true },
    });
  }

  async updateXP(clerkId: string, updates: UpdateQuery<IUser>): Promise<IUser | null> {
    return this.findOneAndUpdate({
      filter: { clerkId },
      update: updates,
    });
  }

  async addBadge(clerkId: string, badge: string): Promise<IUser | null> {
    return this.findOneAndUpdate({
      filter: { clerkId },
      update: { $push: { badges: badge } },
    });
  }

  // eslint-disable-next-line
  async countAllUsers(options?: { session?: any }) {
    return this.count({
      filter: {},
      options,
    });
  }

  async deleteByClerkId(clerkId: string): Promise<void> {
    await this.model.deleteOne({ clerkId });
  }
}
