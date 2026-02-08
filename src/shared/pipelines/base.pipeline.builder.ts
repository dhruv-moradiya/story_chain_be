import { PipelineStage } from 'mongoose';
import { logger } from '@/utils/logger';

/**
 * Abstract base class for MongoDB aggregation pipeline builders.
 * Provides common utility methods shared across all pipeline builders.
 */
abstract class BasePipelineBuilder<T extends BasePipelineBuilder<T>> {
  protected pipeline: PipelineStage[] = [];

  /**
   * Builds and returns the final pipeline stages.
   */
  build(): PipelineStage[] {
    return this.pipeline;
  }

  /**
   * Returns a copy of the current pipeline stages.
   */
  getPipeline(): PipelineStage[] {
    return [...this.pipeline];
  }

  /**
   * Adds a single pipeline stage.
   */
  addStage(stage: PipelineStage): T {
    this.pipeline.push(stage);
    return this as unknown as T;
  }

  /**
   * Adds multiple pipeline stages.
   */
  addStages(stages: PipelineStage[]): T {
    this.pipeline.push(...stages);
    return this as unknown as T;
  }

  /**
   * Conditionally applies a callback to the builder.
   * Useful for optional pipeline additions based on runtime conditions.
   *
   * @example
   * builder
   *   .findBySlug(slug)
   *   .when(includeAuthor, (b) => b.attachAuthor())
   *   .build();
   */
  when(condition: boolean, callback: (builder: T) => T): T {
    return condition ? callback(this as unknown as T) : (this as unknown as T);
  }

  /**
   * Resets the pipeline to an empty state.
   */
  reset(): T {
    this.pipeline = [];
    return this as unknown as T;
  }

  /**
   * Logs the current pipeline stages for debugging.
   */
  debug(): T {
    logger.debug('Pipeline stages:', JSON.stringify(this.pipeline, null, 2));
    return this as unknown as T;
  }

  /**
   * Limits the number of documents in the result.
   */
  limit(limit: number): T {
    this.pipeline.push({ $limit: limit });
    return this as unknown as T;
  }

  /**
   * Skips a number of documents.
   */
  skip(skip: number): T {
    this.pipeline.push({ $skip: skip });
    return this as unknown as T;
  }

  /**
   * Applies pagination using page number and limit.
   * Page numbers are 1-indexed.
   */
  paginate(page: number, limit: number): T {
    const skip = Math.max(page - 1, 0) * limit;
    this.pipeline.push({ $skip: skip }, { $limit: limit });
    return this as unknown as T;
  }

  /**
   * Sorts documents by a field.
   */
  sortBy(field: string, order: 1 | -1 = -1): T {
    this.pipeline.push({ $sort: { [field]: order } });
    return this as unknown as T;
  }

  /**
   * Sorts documents by creation date.
   */
  sortByCreatedAt(order: 1 | -1 = -1): T {
    return this.sortBy('createdAt', order);
  }

  /**
   * Matches documents by a field value.
   */
  matchField<V>(field: string, value: V): T {
    this.pipeline.push({ $match: { [field]: value } });
    return this as unknown as T;
  }

  /**
   * Projects specific fields.
   */
  project(projection: Record<string, unknown>): T {
    this.pipeline.push({ $project: projection });
    return this as unknown as T;
  }

  /**
   * Unsets (removes) fields from documents.
   */
  unset(fields: string | string[]): T {
    this.pipeline.push({ $unset: fields });
    return this as unknown as T;
  }

  /**
   * Sets fields on documents.
   */
  set(fields: Record<string, unknown>): T {
    this.pipeline.push({ $set: fields });
    return this as unknown as T;
  }
}

export { BasePipelineBuilder };
