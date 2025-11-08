import { User } from '../../models/user.model';
import { IUser, IUserDoc, SaveNewUser } from './user.types';
import { logger } from '../../utils/logger';
import { BaseRepository } from '../../utils';
import { ProjectionType, UpdateQuery } from 'mongoose';

export class UserRepository extends BaseRepository<IUser, IUserDoc> {
  constructor() {
    super(User);
  }

  async findByClerkId(
    clerkId: string,
    projection?: ProjectionType<IUser> | null
  ): Promise<IUser | null> {
    return this.findOne({ clerkId }, projection);
  }

  async updateXP(clerkId: string, updates: UpdateQuery<IUser>): Promise<IUser | null> {
    return this.findOneAndUpdate({ clerkId }, updates);
  }

  async addBadge(clerkId: string, badge: string): Promise<IUser | null> {
    return this.findOneAndUpdate({ clerkId }, { $push: { badges: badge } });
  }
}

export class UserService {
  /**
   * Save a new user to the database
   */
  static async saveNewUser(data: SaveNewUser) {
    try {
      // Prevent duplicates based on clerkId or email
      const existingUser = await User.findOne({
        $or: [{ clerkId: data.clerkId }, { email: data.email }],
      });

      if (existingUser) {
        logger.warn(`User already exists with Clerk ID: ${data.clerkId}`);
        return existingUser; // optionally throw an error if that's desired
      }

      const user = await User.create(data);
      logger.info(`✅ New user created: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error('Failed to save user');
    }
  }

  /**
   * Get user profile by MongoDB ObjectId
   */
  static async getUserProfileById(userId: string) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error(`Error fetching user by ID (${userId}):`, error);
      throw new Error('Failed to fetch user by ID');
    }
  }

  /**
   * Get user profile by Clerk ID
   */
  static async getUserProfileByClerkId(clerkUserId: string) {
    try {
      const user = await User.findOne({ clerkId: clerkUserId });
      return user;
    } catch (error) {
      logger.error(`Error fetching user by Clerk ID (${clerkUserId}):`, error);
      throw new Error('Failed to fetch user by Clerk ID');
    }
  }
}
