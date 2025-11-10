import {
  ClientSession,
  Document,
  FilterQuery,
  ProjectionType,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';
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

  protected throwValidationError(message: string): never {
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
  async create(data: Partial<TEntity>, options?: { session?: ClientSession }): Promise<TEntity> {
    if (options?.session) {
      const [doc] = await this.model.create([data], { session: options.session });
      return doc.toObject() as TEntity;
    }

    const doc = new this.model(data);
    const saved = await doc.save();
    return saved.toObject() as TEntity;
  }

  // 🔍 FIND ONE
  async findOne(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: { session?: ClientSession }
  ): Promise<TEntity | null> {
    const query = this.model.findOne(filter, projection);

    // If a session is provided, attach it to the query so the execution
    // will participate in the given transaction/session. Do not execute
    // the query twice — call `.lean().exec()` once and return its promise.
    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  // 🔍 FIND BY ID
  async findById(
    id: string,
    projection?: ProjectionType<TDocument> | null,
    options?: { session?: ClientSession }
  ): Promise<TEntity | null> {
    const query = this.model.findById(id, projection);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  // 🔁 UPDATE ONE
  async findOneAndUpdate(
    filter: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
    options: QueryOptions & { session?: ClientSession } = { new: true }
  ): Promise<TEntity | null> {
    const query = this.model.findOneAndUpdate(filter, update, options);

    if (options.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  // ❌ DELETE ONE
  async deleteOne(
    filter: FilterQuery<TDocument>,
    options?: { session?: ClientSession }
  ): Promise<boolean> {
    const query = this.model.deleteOne(filter);

    if (options?.session) query.session(options.session);

    const result = await query.exec();

    return result.deletedCount === 1;
  }

  // 📜 PAGINATION / FIND MANY
  async findMany(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: QueryOptions & { limit?: number; skip?: number; session?: ClientSession }
  ): Promise<TEntity[]> {
    const query = this.model.find(filter, projection, options);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity[]>().exec();
  }

  // ======================================================
  // 🧾 COUNT
  // ======================================================
  async count(
    filter: FilterQuery<TDocument>,
    options?: { session?: ClientSession }
  ): Promise<number> {
    const query = this.model.countDocuments(filter);

    if (options?.session) query.session(options.session);

    return query.exec();
  }

  // ======================================================
  // 🧹 SOFT DELETE
  // ======================================================
  async softDelete(
    filter: FilterQuery<TDocument>,
    options?: { session?: ClientSession }
  ): Promise<boolean> {
    const query = this.model.updateOne(filter, { $set: { deletedAt: new Date() } });

    if (options?.session) query.session(options.session);

    const result = await query.exec();

    return result.modifiedCount > 0;
  }
}
