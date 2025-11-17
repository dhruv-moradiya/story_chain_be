import { ProjectionType, UpdateQuery } from 'mongoose';
import { User } from '../../../models/user.model';
import { BaseRepository } from '../../../utils';
import { ICreateNewUser, IUser, IUserDoc } from '../user.types';

export class UserRepository extends BaseRepository<IUser, IUserDoc> {
  constructor() {
    super(User);
  }

  async createNewUser(input: ICreateNewUser): Promise<IUser> {
    return this.create(input);
  }

  async findByClerkId(
    clerkId: string,
    projection?: ProjectionType<IUser> | null
  ): Promise<IUser | null> {
    return this.findOne({ clerkId }, projection);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  async updateByClerkId(id: string, update: UpdateQuery<IUser>): Promise<IUser | null> {
    return this.findOneAndUpdate({ clerkId: id }, { ...update }, { new: true });
  }

  async updateXP(clerkId: string, updates: UpdateQuery<IUser>): Promise<IUser | null> {
    return this.findOneAndUpdate({ clerkId }, updates);
  }

  async addBadge(clerkId: string, badge: string): Promise<IUser | null> {
    return this.findOneAndUpdate({ clerkId }, { $push: { badges: badge } });
  }

  async countAllUsers() {
    return this.count({});
  }
}
