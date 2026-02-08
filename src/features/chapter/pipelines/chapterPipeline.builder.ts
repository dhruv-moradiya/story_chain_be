import { PipelineStage } from 'mongoose';
import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import {
  attachAncestorDetailsStage,
  orderAncestorsBySlugStage,
  buildDisplayNumberStage,
  extractPrIdStage,
} from '@/shared/pipelines/stages';
import { CHAPTER_WITH_STORY_PROJECTION, PUBLIC_AUTHOR_PROJECTION } from './chapter.projections';
import { ID } from '@/types';
import { toId } from '@/utils';

class ChapterPipelineBuilder extends BasePipelineBuilder<ChapterPipelineBuilder> {
  /**
   * Matches chapters by story slug.
   */
  getByStorySlug(storySlug: string) {
    this.pipeline.push({
      $match: { storySlug },
    });
    return this;
  }

  /**
   * Matches a chapter by its ID.
   */
  findById(chapterId: ID) {
    this.pipeline.push({
      $match: { _id: toId(chapterId) },
    });
    return this;
  }

  /**
   * Matches a chapter by its slug.
   */
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
   * Filters chapters belonging to a specific story using its slug.
   * Alias for getByStorySlug for readability.
   */
  loadChaptersForStory(storySlug: string) {
    return this.getByStorySlug(storySlug);
  }

  /**
   * Normalizes chapter data into a graph-friendly structure.
   * Flattens author data and removes heavy or internal fields.
   */
  prepareChapterForGraph() {
    this.pipeline.push(extractPrIdStage(), {
      $unset: ['authorId', 'content', 'pullRequest'],
    });
    return this;
  }

  /**
   * Attaches ancestor details to the chapter.
   * Uses shared stage from @/shared/pipelines/stages
   */
  attachAncestors() {
    this.pipeline.push(attachAncestorDetailsStage());
    return this;
  }

  /**
   * Orders ancestor details by slug.
   * Uses shared stage from @/shared/pipelines/stages
   */
  orderAncestorsBySlug() {
    this.pipeline.push(orderAncestorsBySlugStage());
    return this;
  }

  /**
   * Builds the display number for the chapter.
   * Uses shared stage from @/shared/pipelines/stages
   */
  buildDisplayNumber() {
    this.pipeline.push(buildDisplayNumberStage());
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

  // ==================== PRESETS ====================

  /**
   * Preset for building a story's chapter tree.
   * Combines multiple stages for graph visualization.
   */
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
