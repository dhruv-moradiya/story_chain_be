import { PipelineStage } from 'mongoose';

/** Type for pipeline stages that can be used inside nested $lookup pipelines */
export type NestedPipelineStage = Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>;

/**
 * Creates a $lookup stage to attach ancestor details to chapters.
 * Looks up chapters by their slugs from the ancestorSlugs array.
 */
export function attachAncestorDetailsStage(): PipelineStage.Lookup {
  return {
    $lookup: {
      from: 'chapters',
      let: { ancestorSlugs: '$ancestorSlugs' },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$slug', '$$ancestorSlugs'] },
          },
        },
        {
          $project: {
            _id: 0,
            slug: 1,
            branchIndex: 1,
          },
        },
      ],
      as: 'ancestorDetails',
    },
  };
}

/**
 * Creates a stage to order ancestorDetails by the original ancestorSlugs order.
 * MongoDB $lookup doesn't preserve order, so we need to reorder.
 */
export function orderAncestorsBySlugStage(): PipelineStage.AddFields {
  return {
    $addFields: {
      ancestorDetails: {
        $map: {
          input: '$ancestorSlugs',
          as: 'ancestorSlug',
          in: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$ancestorDetails',
                  cond: {
                    $eq: ['$$this.slug', '$$ancestorSlug'],
                  },
                },
              },
              0,
            ],
          },
        },
      },
    },
  };
}

/**
 * Creates a stage to compute the displayNumber for chapters.
 * Format: "1.2.3" based on branchIndex of ancestors and current chapter.
 *
 * For root chapters (no ancestors): just the branchIndex (e.g., "1")
 * For nested chapters: ancestor indices joined with dots (e.g., "1.2.3")
 */
export function buildDisplayNumberStage(): PipelineStage.AddFields {
  return {
    $addFields: {
      displayNumber: {
        $cond: {
          if: {
            $eq: [{ $size: { $ifNull: ['$ancestorSlugs', []] } }, 0],
          },
          then: { $toString: '$branchIndex' },
          else: {
            $concat: [
              {
                $reduce: {
                  input: '$ancestorDetails',
                  initialValue: '',
                  in: {
                    $concat: [
                      '$$value',
                      {
                        $cond: [{ $eq: ['$$value', ''] }, '', '.'],
                      },
                      { $toString: '$$this.branchIndex' },
                    ],
                  },
                },
              },
              '.',
              { $toString: '$branchIndex' },
            ],
          },
        },
      },
    },
  };
}

/**
 * Returns all stages needed to compute displayNumber for chapters.
 * Combines ancestor lookup, ordering, and display number calculation.
 * Returns NestedPipelineStage[] for use inside nested $lookup pipelines.
 */
export function getDisplayNumberStages(): NestedPipelineStage[] {
  return [attachAncestorDetailsStage(), orderAncestorsBySlugStage(), buildDisplayNumberStage()];
}

/**
 * Creates a stage to match chapters with at least one ancestor.
 */
export function matchWithAncestorsStage(): PipelineStage.Match {
  return {
    $match: {
      $expr: {
        $gt: [{ $size: { $ifNull: ['$ancestorSlugs', []] } }, 0],
      },
    },
  };
}

/**
 * Creates a stage to remove sensitive/internal chapter fields.
 * Used when preparing chapters for public consumption.
 */
export function cleanChapterFieldsStage(additionalFields: string[] = []): PipelineStage.Unset {
  return {
    $unset: ['content', 'pullRequest', ...additionalFields],
  };
}

/**
 * Creates a stage to extract prId from pullRequest object.
 */
export function extractPrIdStage(): PipelineStage.Set {
  return {
    $set: {
      prId: {
        $ifNull: ['$pullRequest.prId', null],
      },
    },
  };
}
