import { Document, FilterQuery, Model, ProjectionType, QueryOptions, UpdateQuery } from 'mongoose';
import { ID, IOperationOptions } from '@/types/index.js';
import { ApiError, ErrorCode } from './apiResponse.js';
import { logger } from './logger.js';

export interface IBaseQueryInput<TDocument> {
  filter: FilterQuery<TDocument>;
  projection?: ProjectionType<TDocument> | null;
  options?: IOperationOptions;
}

export interface ICreateInput<TEntity> {
  data: Partial<TEntity>;
  options?: IOperationOptions;
}

export interface IFindByIdInput<TDocument> {
  id: ID;
  projection?: ProjectionType<TDocument> | null;
  options?: IOperationOptions;
}

export interface IFindOneAndUpdateInput<TDocument> {
  filter: FilterQuery<TDocument>;
  update: UpdateQuery<TDocument>;
  options?: QueryOptions & IOperationOptions;
}

export interface IFindManyInput<TDocument> {
  filter: FilterQuery<TDocument>;
  projection?: ProjectionType<TDocument> | null;
  options?: QueryOptions &
    IOperationOptions & {
      limit?: number;
      skip?: number;
    };
}

export class BaseModule {
  protected logger = logger;

  async initialize() {}

  async destroy() {}

  protected logInfo(message: string, data?: unknown) {
    this.logger.info(`[${this.constructor.name}] ${message}`, data);
  }

  protected logError(message: string, error?: unknown) {
    this.logger.error(`[${this.constructor.name}] ${message}`, error);
  }

  protected logDebug(message: string, data?: unknown) {
    this.logger.debug?.(`[${this.constructor.name}] ${message}`, data);
  }

  protected throwError(
    code: ErrorCode,
    statusCode: number,
    message?: string,
    field?: string
  ): never {
    throw new ApiError(code, statusCode, message, { field });
  }

  protected throwBadRequest(
    codeOrMessage: ErrorCode | string = 'INVALID_INPUT',
    message?: string,
    field?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.badRequest('INVALID_INPUT', codeOrMessage);
    }
    throw ApiError.badRequest(codeOrMessage as ErrorCode, message, field);
  }

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

  protected throwUnauthorizedError(
    codeOrMessage: ErrorCode | string = 'UNAUTHORIZED',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.unauthorized('UNAUTHORIZED', codeOrMessage);
    }
    throw ApiError.unauthorized(codeOrMessage as ErrorCode, message);
  }

  protected throwForbiddenError(
    codeOrMessage: ErrorCode | string = 'FORBIDDEN',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.forbidden('FORBIDDEN', codeOrMessage);
    }
    throw ApiError.forbidden(codeOrMessage as ErrorCode, message);
  }

  protected throwNotFoundError(
    codeOrMessage: ErrorCode | string = 'NOT_FOUND',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.notFound('NOT_FOUND', codeOrMessage);
    }
    throw ApiError.notFound(codeOrMessage as ErrorCode, message);
  }

  protected throwMethodNotAllowedError(
    codeOrMessage: ErrorCode | string = 'NOT_FOUND',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.methodNotAllowed('NOT_FOUND', codeOrMessage);
    }
    throw ApiError.methodNotAllowed(codeOrMessage as ErrorCode, message);
  }

  protected throwConflictError(
    codeOrMessage: ErrorCode | string = 'CONFLICT',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.conflict('CONFLICT', codeOrMessage);
    }
    throw ApiError.conflict(codeOrMessage as ErrorCode, message);
  }

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

  protected throwTooManyRequestsError(
    codeOrMessage: ErrorCode | string = 'RATE_LIMIT_EXCEEDED',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.tooManyRequests('RATE_LIMIT_EXCEEDED', codeOrMessage);
    }
    throw ApiError.tooManyRequests(codeOrMessage as ErrorCode, message);
  }

  protected throwBadGatewayError(
    codeOrMessage: ErrorCode | string = 'EXTERNAL_SERVICE_ERROR',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.badGateway('EXTERNAL_SERVICE_ERROR', codeOrMessage);
    }
    throw ApiError.badGateway(codeOrMessage as ErrorCode, message);
  }

  protected throwInternalError(
    codeOrMessage: ErrorCode | string = 'INTERNAL_SERVER_ERROR',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.internalError('INTERNAL_SERVER_ERROR', codeOrMessage);
    }
    throw ApiError.internalError(codeOrMessage as ErrorCode, message);
  }

  protected throwServiceUnavailableError(
    codeOrMessage: ErrorCode | string = 'SERVICE_UNAVAILABLE',
    message?: string
  ): never {
    if (codeOrMessage && !this.isErrorCode(codeOrMessage)) {
      throw ApiError.serviceUnavailable('SERVICE_UNAVAILABLE', codeOrMessage);
    }
    throw ApiError.serviceUnavailable(codeOrMessage as ErrorCode, message);
  }

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

  // ==================== CREATE METHODS ====================

  async create(input: ICreateInput<TEntity>): Promise<TEntity> {
    const { data, options } = input;

    if (options?.session) {
      const [doc] = await this.model.create([data], { session: options.session });
      return doc.toObject() as TEntity;
    }

    const doc = new this.model(data);
    const saved = await doc.save();

    return saved.toObject() as TEntity;
  }

  // ==================== QUERY METHODS ====================

  async find(input: IBaseQueryInput<TDocument>): Promise<TEntity[]> {
    const { filter, projection, options } = input;

    const query = this.model.find(filter, projection);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity[]>().exec();
  }

  async findOne(input: IBaseQueryInput<TDocument>): Promise<TEntity | null> {
    const { filter, projection, options } = input;

    const query = this.model.findOne(filter, projection);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  async findById(input: IFindByIdInput<TDocument>): Promise<TEntity | null> {
    const { id, projection, options } = input;

    const query = this.model.findById(id, projection);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  async findMany(input: IFindManyInput<TDocument>): Promise<TEntity[]> {
    const { filter, projection, options } = input;

    const query = this.model.find(filter, projection, options);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity[]>().exec();
  }

  async count(input: IBaseQueryInput<TDocument>): Promise<number> {
    const { filter, options } = input;

    const query = this.model.countDocuments(filter);

    if (options?.session) query.session(options.session);

    return query.exec();
  }

  async existsById(input: IBaseQueryInput<TDocument>) {
    return this.model.exists(input.filter);
  }

  // ==================== UPDATE METHODS ====================

  async findOneAndUpdate(input: IFindOneAndUpdateInput<TDocument>): Promise<TEntity | null> {
    const { filter, update, options = { new: true } } = input;

    const query = this.model.findOneAndUpdate(filter, update, options);

    if (options.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }

  async softDelete(input: IBaseQueryInput<TDocument>): Promise<boolean> {
    const { filter, options } = input;

    const query = this.model.updateOne(filter, {
      $set: { deletedAt: new Date() },
    });

    if (options?.session) query.session(options.session);

    const result = await query.exec();

    return result.modifiedCount > 0;
  }

  // ==================== DELETE METHODS ====================

  async findOneAndDelete(input: IBaseQueryInput<TDocument>): Promise<TEntity | null> {
    const { filter, options } = input;

    const query = this.model.findOneAndDelete(filter);

    if (options?.session) query.session(options.session);

    return query.lean<TEntity>().exec();
  }
}
