import { PipelineStage } from 'mongoose';

/**
 * Projection for public user data (safe to expose).
 */
export const PUBLIC_USER_PROJECTION = {
  _id: 0,
  clerkId: 1,
  username: 1,
  avatarUrl: 1,
};

/**
 * Projection for user data including email.
 */
export const USER_WITH_EMAIL_PROJECTION = {
  ...PUBLIC_USER_PROJECTION,
  email: 1,
};

interface AttachUserOptions {
  /** The local field containing the user ID (e.g., 'authorId', 'creatorId') */
  localField: string;
  /** The field to store the result as (e.g., 'author', 'creator') */
  as: string;
  /** Custom projection for user fields */
  project?: Record<string, unknown>;
  /** Whether to preserve documents when user is not found */
  preserveNullAndEmpty?: boolean;
  /** Whether to unset the original localField after lookup */
  unsetLocalField?: boolean;
}

/**
 * Creates pipeline stages to attach user data via $lookup.
 * Joins on clerkId field.
 *
 * @example
 * // Attach author to chapter
 * pipeline.push(...attachUserStages({
 *   localField: 'authorId',
 *   as: 'author',
 *   project: PUBLIC_USER_PROJECTION
 * }));
 */
export function attachUserStages(options: AttachUserOptions): PipelineStage[] {
  const {
    localField,
    as,
    project = PUBLIC_USER_PROJECTION,
    preserveNullAndEmpty = true,
    unsetLocalField = false,
  } = options;

  const stages: PipelineStage[] = [
    {
      $lookup: {
        from: 'users',
        let: { userId: `$${localField}` },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$clerkId', '$$userId'] },
            },
          },
          { $project: project },
        ],
        as,
      },
    },
    {
      $unwind: {
        path: `$${as}`,
        preserveNullAndEmptyArrays: preserveNullAndEmpty,
      },
    },
  ];

  if (unsetLocalField) {
    stages.push({ $unset: localField });
  }

  return stages;
}

/**
 * Creates a nested pipeline for user lookup (for use inside $lookup pipelines).
 * Does not include $unwind - caller handles that.
 */
export function userLookupPipeline(
  localFieldVar: string,
  asField: string,
  project: Record<string, unknown> = PUBLIC_USER_PROJECTION
): PipelineStage.Lookup['$lookup'] {
  return {
    from: 'users',
    let: { userId: localFieldVar },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$clerkId', '$$userId'] },
        },
      },
      { $project: project },
    ],
    as: asField,
  };
}
