import { logger } from '@/utils/logger';
import { PipelineStage } from 'mongoose';
import { CHAPTER_WITH_STORY_PROJECTION, PUBLIC_AUTHOR_PROJECTION } from './chapter.projections';
import { ID } from '@/types';
import { toId } from '@/utils';

class ChapterPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  findById(chapterId: ID) {
    this.pipeline.push({
      $match: { _id: toId(chapterId) },
    });

    return this;
  }

  findBySlug(chapterSlug: string) {
    this.pipeline.push({
      $match: { slug: chapterSlug },
    });

    return this;
  }

  /**
   * Filters chapters belonging to a specific author using their ID.
   */
  loadChaptersByAuthor(authorId: string) {
    this.pipeline.push({
      $match: { authorId },
    });

    return this;
  }

  /**
   * Attaches story details to the chapter.
   */
  /**
   * Attaches story details to the chapter.
   */
  attachStory(options?: { project?: PipelineStage.Project['$project'] }) {
    this.pipeline.push(
      {
        $lookup: {
          from: 'stories',
          let: { storySlug: '$storySlug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$slug', '$$storySlug'] },
              },
            },
            ...(options && options.project ? [{ $project: options.project }] : []),
          ],
          as: 'story',
        },
      },
      {
        $unwind: '$story',
      }
    );

    return this;
  }

  /**
   * Attaches author details to the chapter.
   */
  attachAuthor(options?: { project?: PipelineStage.Project['$project'] }) {
    this.pipeline.push(
      {
        $lookup: {
          from: 'users',
          let: { authorId: '$authorId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clerkId', '$$authorId'] },
              },
            },
            ...(options && options.project ? [{ $project: options.project }] : []),
          ],
          as: 'author',
        },
      },
      {
        $unwind: {
          path: '$author',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    return this;
  }

  /**
   * Projects chapter data into a format suitable for chapter with story.
   */
  projectChapterWithStory() {
    this.pipeline.push({
      $project: CHAPTER_WITH_STORY_PROJECTION,
    });

    return this;
  }

  /**
   * Sorts chapters by creation date.
   */
  sortByCreatedAt(order: 1 | -1 = -1) {
    this.pipeline.push({
      $sort: { createdAt: order },
    });

    return this;
  }

  /**
   * Filters chapters belonging to a specific story using its slug.
   */
  loadChaptersForStory(storySlug: string) {
    this.pipeline.push({
      $match: {
        storySlug,
      },
    });

    return this;
  }

  /**
   * Normalizes chapter data into a graph-friendly structure.
   * Flattens author data and removes heavy or internal fields.
   */
  prepareChapterForGraph() {
    this.pipeline.push(
      {
        $set: {
          prId: {
            $ifNull: ['$pullRequest.prId', null],
          },
        },
      },
      {
        $unset: ['authorId', 'content', 'pullRequest'],
      }
    );

    return this;
  }

  /**
   * Attaches ancestor details to the chapter.
   */
  attachAncestors() {
    this.pipeline.push({
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
    });

    return this;
  }

  /**
   * Orders ancestor details by slug.
   */
  orderAncestorsBySlug() {
    this.pipeline.push({
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
    });

    return this;
  }

  /**
   * Builds the display number for the chapter.
   */
  buildDisplayNumber() {
    this.pipeline.push({
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
    });

    return this;
  }

  /**
   * Skips chapters with no ancestors.
   */
  skipIfNoAncestors() {
    this.pipeline.push({
      $match: {
        $expr: {
          $gt: [{ $size: { $ifNull: ['$ancestorSlugs', []] } }, 0],
        },
      },
    });

    return this;
  }

  build() {
    return this.pipeline;
  }

  // const pipeline = new StoryPipelineBuilder()
  // .storyById(storyId)
  // .when(includeCreator, (b) => b.withStoryCreator())
  // .when(includeCollaborators, (b) => b.withStoryCollaborators())
  // .when(userRole === 'admin', (b) =>
  //   b.storySettings(['isPublic', 'allowComments'])
  // )
  // .when(!!pagination, (b) => b.paginate(page, limit))
  // .build();
  when(condition: boolean, callback: (builder: this) => this) {
    return condition ? callback(this) : this;
  }

  addStage(stage: PipelineStage[]) {
    this.pipeline.push(...stage);
    return this;
  }

  reset() {
    this.pipeline = [];
    return this;
  }

  debug() {
    logger.debug('Pipeline stages:', JSON.stringify(this.pipeline, null, 2));
    return this;
  }

  getPipeline() {
    return [...this.pipeline];
  }

  // Presets for chapter pipelines
  buildStoryChapterTreePreset(storySlug: string) {
    return this.loadChaptersForStory(storySlug)
      .attachAuthor({ project: PUBLIC_AUTHOR_PROJECTION })
      .prepareChapterForGraph()
      .attachAncestors()
      .orderAncestorsBySlug()
      .buildDisplayNumber();
  }
}

export { ChapterPipelineBuilder };
