import { logger } from '@/utils/logger';
import { PipelineStage } from 'mongoose';
import { CHAPTER_WITH_STORY_PROJECTION } from './chapter.projections';
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
  attachStory() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'stories',
          localField: 'storySlug',
          foreignField: 'slug',
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
  buildChapterGraphNode() {
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

  build() {
    return this.pipeline;
  }

  // const pipeline = new StoryPipelineBuilder()
  // .findById(storyId)
  // .when(includeCreator, (b) => b.attachCreator())
  // .when(includeCollaborators, (b) => b.attachCollaborators())
  // .when(userRole === 'admin', (b) =>
  //   b.projectSettings(['isPublic', 'allowComments'])
  // )
  // .when(!!pagination, (b) => b.paginate(page, limit))
  // .build();
  when(condition: boolean, callback: (builder: this) => this) {
    return condition ? callback(this) : this;
  }

  addStage(stage: PipelineStage) {
    this.pipeline.push(stage);
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
}

export { ChapterPipelineBuilder };
