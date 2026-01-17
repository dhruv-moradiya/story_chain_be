import 'reflect-metadata';

import { TOKENS } from '@container/tokens';
import { logger } from '@utils/logger';
import mongoose, { Connection } from 'mongoose';
import { inject, singleton } from 'tsyringe';
import { ConfigService } from './config.service';

@singleton()
class DatabaseService {
  private connection: Connection | null = null;

  constructor(@inject(TOKENS.ConfigService) private readonly config: ConfigService) {}

  async connect(): Promise<void> {
    if (this.connection) {
      logger.warn('Database already connected');
      return;
    }

    mongoose.set('strictQuery', true);

    const connectionInstance = await mongoose.connect(this.config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    this.connection = connectionInstance.connection;
    logger.info(`MongoDB connected: ${this.connection.host}`);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      logger.info('MongoDB disconnected');
    }
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return this.connection;
  }

  get isConnected(): boolean {
    return this.connection !== null && this.connection.readyState === 1;
  }
}

export { DatabaseService };
