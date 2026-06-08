import { singleton } from 'tsyringe';
import { StoryTimeline } from '@models/storyTimeline.model';
import { BaseRepository } from '@utils/baseClass';
import {
  IStoryTimeline,
  IStoryTimelineDoc,
  TStoryTimelineAction,
} from '@features/story/types/story.types';
import { IOperationOptions } from '@/types';

export interface ICreateStoryTimelineEventInput {
  storySlug: string;
  action: TStoryTimelineAction;
  performedBy: string | null; // For system generated events, it will be null
  metadata?: Record<string, unknown>;
}

export interface IGetStoryTimelineOptions extends IOperationOptions {
  limit?: number;
  skip?: number;
}

@singleton()
export class StoryTimelineRepository extends BaseRepository<IStoryTimeline, IStoryTimelineDoc> {
  constructor() {
    super(StoryTimeline);
  }

  appendEvent(
    input: ICreateStoryTimelineEventInput,
    options: IOperationOptions = {}
  ): Promise<IStoryTimeline> {
    const { storySlug, action, performedBy, metadata = {} } = input;

    return this.create({
      data: {
        storySlug,
        action,
        performedBy,
        performedAt: new Date(),
        metadata,
      },
      options,
    });
  }

  findByStory(
    storySlug: string,
    options: IGetStoryTimelineOptions = {}
  ): Promise<IStoryTimeline[]> {
    const { limit = 20, skip = 0, ...operationOptions } = options;

    return this.findMany({
      filter: { storySlug },
      options: {
        ...operationOptions,
        sort: { performedAt: -1 },
        limit,
        skip,
      },
    });
  }

  /**
   * Fetch timeline entries for a story filtered by a specific action type.
   */
  findByStoryAndAction(
    storySlug: string,
    action: TStoryTimelineAction,
    options: IGetStoryTimelineOptions = {}
  ): Promise<IStoryTimeline[]> {
    const { limit = 20, skip = 0, ...operationOptions } = options;

    return this.findMany({
      filter: { storySlug, action },
      options: {
        ...operationOptions,
        sort: { performedAt: -1 },
        limit,
        skip,
      },
    });
  }

  /**
   * Count total events for a story (useful for pagination metadata).
   */
  countByStory(storySlug: string, options: IOperationOptions = {}): Promise<number> {
    return this.count({ filter: { storySlug }, options });
  }
}
