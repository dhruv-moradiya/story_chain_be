import { ProjectionType, UpdateQuery } from 'mongoose';
import { User } from '../../../models/user.model';
import { ICreateNewUser, IUser, IUserDoc } from '../user.types';
import { BaseRepository } from '../../../utils/baseClass';

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

  async findByUsername(username: string): Promise<IUser[]> {
    return this.findMany({
      username: {
        $regex: username,
        $options: 'i',
      },
    });
  }

  async findOneByUsername(username: string): Promise<IUser | null> {
    return this.findOne({ username });
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

  // eslint-disable-next-line
  async countAllUsers(options?: { session?: any }) {
    return this.count({}, options);
  }
}
