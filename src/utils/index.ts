import { Document, FilterQuery, ProjectionType, QueryOptions, UpdateQuery } from 'mongoose';
import { ApiError } from './apiResponse';
import { logger } from './logger';
import { Model } from 'mongoose';

export class BaseModule {
  protected logger = logger;

  async initialize() {
    // Override in subclasses if needed
  }

  async destroy() {
    // Override in subclasses if needed
  }

  protected logInfo(message: string, data: unknown) {
    this.logger.info(`[ChapterModule] ${message}`, data);
  }

  protected throwValidationError(message: string) {
    throw ApiError.validationError(message);
  }

  protected throwForbiddenError(message: string) {
    throw ApiError.forbidden(message);
  }
}

export abstract class BaseHandler<Input = unknown, Output = unknown> extends BaseModule {
  abstract handle(input: Input): Promise<Output>;
}

export abstract class BaseValidator<Input = unknown, Output = void> extends BaseModule {
  abstract validate(input: Input): Promise<Output>;
}

export abstract class BaseRepository<TEntity, TDocument extends Document> extends BaseModule {
  protected model: Model<TDocument>;

  constructor(model: Model<TDocument>) {
    super();
    this.model = model;
  }

  // 🧠 CREATE
  async create(data: Partial<TEntity>): Promise<TEntity> {
    const doc = new this.model(data);
    const saved = await doc.save();
    return saved.toObject() as TEntity;
  }

  // 🔍 FIND ONE
  async findOne(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null
  ): Promise<TEntity | null> {
    return this.model.findOne(filter, projection).lean<TEntity>().exec();
  }

  // 🔍 FIND BY ID
  async findById(
    id: string,
    projection?: ProjectionType<TDocument> | null
  ): Promise<TEntity | null> {
    return this.model.findById(id, projection).lean<TEntity>().exec();
  }

  // 🔁 UPDATE ONE
  async findOneAndUpdate(
    filter: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
    options: QueryOptions = { new: true }
  ): Promise<TEntity | null> {
    return this.model.findOneAndUpdate(filter, update, options).lean<TEntity>().exec();
  }

  // ❌ DELETE ONE
  async deleteOne(filter: FilterQuery<TDocument>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount === 1;
  }

  // 📜 PAGINATION / FIND MANY
  async findMany(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: QueryOptions & { limit?: number; skip?: number }
  ): Promise<TEntity[]> {
    return this.model.find(filter, projection, options).lean<TEntity[]>().exec();
  }

  // 🧾 COUNT
  async count(filter: FilterQuery<TDocument>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async softDelete(filter: FilterQuery<TDocument>): Promise<boolean> {
    const result = await this.model.updateOne(filter, { $set: { deletedAt: new Date() } }).exec();
    return result.modifiedCount > 0;
  }
}
