import {
  ClientSession,
  Document,
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';
import { ID } from '@/types/index.js';
import { ApiError, ErrorCode } from './apiResponse.js';
import { logger } from './logger.js';

export class BaseModule {
  protected logger = logger;

  // ===========================================
  // 🧱 Lifecycle Hooks
  // ===========================================
  async initialize() {
    // Override in subclasses if needed
  }

  async destroy() {
    // Override in subclasses if needed
  }

  // ===========================================
  // 🧾 Logging Helpers
  // ===========================================
  protected logInfo(message: string, data?: unknown) {
    this.logger.info(`[${this.constructor.name}] ${message}`, data);
  }

  protected logError(message: string, error?: unknown) {
    this.logger.error(`[${this.constructor.name}] ${message}`, error);
  }

  protected logDebug(message: string, data?: unknown) {
    this.logger.debug?.(`[${this.constructor.name}] ${message}`, data);
  }

  // ===========================================
  // 🚨 Error Throw Helpers (With Error Codes)
  // ===========================================

  /**
   * Throw a custom error with specific code
   * @example this.throwError('STORY_NOT_FOUND', 404, 'Story not found');
   */
  protected throwError(
    code: ErrorCode,
    statusCode: number,
    message?: string,
    field?: string
  ): never {
    throw new ApiError(code, statusCode, message, { field });
  }

  /**
   * Throw a bad request (400) error
   * @example this.throwBadRequest('SLUG_REQUIRED', 'Slug is required', 'slug');
   */
  protected throwBadRequest(
    codeOrMessage: ErrorCode | string = 'INVALID_INPUT',
    message?: string,
    field?: string
  ): never {
    // Support legacy usage: throwBadRequest('Some message')
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.badRequest('INVALID_INPUT', codeOrMessage);
    }
    throw ApiError.badRequest(codeOrMessage as ErrorCode, message, field);
  }

  /**
   * Throw a validation (422) error
   * @example this.throwValidationError('VALIDATION_FAILED', 'Invalid data');
   */
  protected throwValidationError(
    codeOrMessage: ErrorCode | string = 'VALIDATION_FAILED',
    message?: string,
    details?: Record<string, unknown>
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.validationError('VALIDATION_FAILED', codeOrMessage);
    }
    throw ApiError.validationError(codeOrMessage as ErrorCode, message, details);
  }

  /**
   * Throw an unauthorized (401) error
   * @example this.throwUnauthorizedError('AUTH_TOKEN_EXPIRED');
   */
  protected throwUnauthorizedError(
    codeOrMessage: ErrorCode | string = 'UNAUTHORIZED',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.unauthorized('UNAUTHORIZED', codeOrMessage);
    }
    throw ApiError.unauthorized(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a forbidden (403) error
   * @example this.throwForbiddenError('PERMISSION_DENIED', 'You cannot do this');
   */
  protected throwForbiddenError(
    codeOrMessage: ErrorCode | string = 'FORBIDDEN',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.forbidden('FORBIDDEN', codeOrMessage);
    }
    throw ApiError.forbidden(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a not found (404) error
   * @example this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found');
   */
  protected throwNotFoundError(
    codeOrMessage: ErrorCode | string = 'NOT_FOUND',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.notFound('NOT_FOUND', codeOrMessage);
    }
    throw ApiError.notFound(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a method not allowed (405) error
   */
  protected throwMethodNotAllowedError(
    codeOrMessage: ErrorCode | string = 'NOT_FOUND',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.methodNotAllowed('NOT_FOUND', codeOrMessage);
    }
    throw ApiError.methodNotAllowed(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a conflict (409) error
   * @example this.throwConflictError('USER_ALREADY_COLLABORATOR');
   */
  protected throwConflictError(
    codeOrMessage: ErrorCode | string = 'CONFLICT',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.conflict('CONFLICT', codeOrMessage);
    }
    throw ApiError.conflict(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw an unprocessable entity (422) error
   */
  protected throwUnprocessableEntityError(
    codeOrMessage: ErrorCode | string = 'VALIDATION_FAILED',
    message?: string,
    details?: Record<string, unknown>
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.unprocessableEntity('VALIDATION_FAILED', codeOrMessage);
    }
    throw ApiError.unprocessableEntity(codeOrMessage as ErrorCode, message, details);
  }

  /**
   * Throw a too many requests (429) error
   */
  protected throwTooManyRequestsError(
    codeOrMessage: ErrorCode | string = 'RATE_LIMIT_EXCEEDED',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.tooManyRequests('RATE_LIMIT_EXCEEDED', codeOrMessage);
    }
    throw ApiError.tooManyRequests(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a bad gateway (502) error
   */
  protected throwBadGatewayError(
    codeOrMessage: ErrorCode | string = 'EXTERNAL_SERVICE_ERROR',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.badGateway('EXTERNAL_SERVICE_ERROR', codeOrMessage);
    }
    throw ApiError.badGateway(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw an internal server (500) error
   * @example this.throwInternalError('DATABASE_ERROR', 'DB connection failed');
   */
  protected throwInternalError(
    codeOrMessage: ErrorCode | string = 'INTERNAL_SERVER_ERROR',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.internalError('INTERNAL_SERVER_ERROR', codeOrMessage);
    }
    throw ApiError.internalError(codeOrMessage as ErrorCode, message);
  }

  /**
   * Throw a service unavailable (503) error
   */
  protected throwServiceUnavailableError(
    codeOrMessage: ErrorCode | string = 'SERVICE_UNAVAILABLE',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.serviceUnavailable('SERVICE_UNAVAILABLE', codeOrMessage);
    }
    throw ApiError.serviceUnavailable(codeOrMessage as ErrorCode, message);
  }

  // ===========================================
  // 🎯 Helper Methods
  // ===========================================

  /**
   * Check if a string looks like an error code (UPPER_SNAKE_CASE)
   */
  private isErrorCode(value: string): boolean {
    return /^[A-Z][A-Z0-9_]+$/.test(value);
  }
}

export abstract class BaseHandler<Input = unknown, Output = unknown> extends BaseModule {
  abstract handle(input: Input): Promise<Output>;
}

export class BaseValidator extends BaseModule {}

export abstract class BaseRepository<TEntity, TDocument extends Document> {
  protected model: Model<TDocument>;

  constructor(model: Model<TDocument>) {
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

  async find(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: { session?: ClientSession }
  ): Promise<TEntity[]> {
    const query = this.model.find(filter, projection);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity[]>().exec();
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
    id: ID,
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

  async findOneAndDelete(
    filter: FilterQuery<TDocument>,
    options?: { session?: ClientSession }
  ): Promise<TEntity | null> {
    const query = this.model.findOneAndDelete(filter);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
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
