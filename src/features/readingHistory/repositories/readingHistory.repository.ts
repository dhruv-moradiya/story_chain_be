import { IRecordHeartBeatDTO } from '@/dto/readingHistory.dto';
import { ReadingHistory } from '@/models/readingHistory.model';
import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { ReadingHistoryPipelineBuilder } from '../pipelines/readingHistoryPipeline.builder';
import {
  IReadingHistory,
  IReadingHistoryDoc,
  IRawAnalyticsBucket,
} from '../types/readingHistory.types';

@singleton()
class ReadingHistoryRepository extends BaseRepository<IReadingHistory, IReadingHistoryDoc> {
  constructor() {
    super(ReadingHistory);
  }

  /**
   * Upsert reading history with heartbeat data
   * @param data - The heartbeat data (userId, storySlug, chapterSlug, duration)
   * @param isEnding - Whether the chapter is an ending chapter (determined by service)
   */
  /**
   * Upsert reading history with heartbeat data
   * @param data - The heartbeat data (userId, storySlug, chapterSlug, duration)
   * @param isEnding - Whether the chapter is an ending chapter (determined by service)
   */
  async upsert(data: IRecordHeartBeatDTO, isEnding: boolean = false): Promise<IReadingHistory> {
    const { userId, storySlug, chapterSlug, duration } = data;

    const pipelineBuilder = new ReadingHistoryPipelineBuilder().upsertHeartBeat(
      chapterSlug,
      duration
    );

    // If this chapter is an ending chapter, mark it as completed
    // This will only increment completedPaths if user hasn't completed this ending before
    if (isEnding) {
      pipelineBuilder.markEndingChapterCompleted(chapterSlug);
    }

    const pipeline = pipelineBuilder.build();

    const readingHistory = this.model.findOneAndUpdate({ userId, storySlug }, pipeline, {
      upsert: true,
      new: true,
    });

    return readingHistory;
  }

  async initializeSession(input: { userId: string; storySlug: string }): Promise<IReadingHistory> {
    const now = new Date();
    return this.model.findOneAndUpdate(
      {
        userId: input.userId,
        storySlug: input.storySlug,
      },
      {
        $setOnInsert: {
          userId: input.userId,
          storySlug: input.storySlug,
          currentChapterSlug: null,
          chaptersRead: [],
          totalStoryReadTime: 0,
          completedEndingChapters: [],
          completedPaths: 0,
          createdAt: now,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
  }

  async tryUpdateSession(input: {
    userId: string;
    storySlug: string;
    chapterSlug: string;
    sessionId: string;
  }) {
    const now = new Date();
    return this.model.findOneAndUpdate(
      {
        userId: input.userId,
        storySlug: input.storySlug,
        'chaptersRead.chapterSlug': input.chapterSlug,
      },
      {
        $set: {
          'chaptersRead.$.activeSessionId': input.sessionId,
          'chaptersRead.$.lastHeartbeatAt': now,
          lastReadAt: now,
        },
      }
    );
  }

  async addNewChapterSession(input: {
    userId: string;
    storySlug: string;
    chapterSlug: string;
    sessionId: string;
  }) {
    const now = new Date();
    return this.model.findOneAndUpdate(
      {
        userId: input.userId,
        storySlug: input.storySlug,
      },
      {
        $push: {
          chaptersRead: {
            chapterSlug: input.chapterSlug,
            totalReadTime: 0,
            lastHeartbeatAt: now,
            activeSessionId: input.sessionId,
            hasQualifiedRead: false,
          },
        },
        $set: {
          lastReadAt: now,
        },
      }
    );
  }

  async updateHeartbeat(
    input: {
      userId: string;
      storySlug: string;
      chapterSlug: string;
      sessionId: string;
    },
    options: {
      maxAllowedGap: number;
      incrementAmount: number;
    }
  ) {
    const now = new Date();
    return this.model.findOneAndUpdate(
      {
        userId: input.userId,
        storySlug: input.storySlug,
        chaptersRead: {
          $elemMatch: {
            chapterSlug: input.chapterSlug,
            activeSessionId: input.sessionId,
            lastHeartbeatAt: {
              $gte: new Date(Date.now() - options.maxAllowedGap * 1000),
            },
          },
        },
      },
      {
        $inc: {
          'chaptersRead.$.totalReadTime': options.incrementAmount,
          totalStoryReadTime: options.incrementAmount,
        },
        $set: {
          'chaptersRead.$.lastHeartbeatAt': now,
          lastReadAt: now,
        },
      }
    );
  }

  async resetActiveSession(input: {
    userId: string;
    storySlug: string;
    chapterSlug: string;
    sessionId: string;
  }) {
    return this.model.findOneAndUpdate(
      {
        userId: input.userId,
        storySlug: input.storySlug,
        'chaptersRead.chapterSlug': input.chapterSlug,
      },
      {
        $set: {
          'chaptersRead.$.activeSessionId': input.sessionId,
          'chaptersRead.$.lastHeartbeatAt': new Date(),
        },
      }
    );
  }

  async getUnqualifiedChapterSession(
    userId: string,
    storySlug: string,
    chapterSlug: string
  ): Promise<IReadingHistory | null> {
    return this.model.findOne(
      {
        userId,
        storySlug,
        chaptersRead: {
          $elemMatch: {
            chapterSlug: chapterSlug,
            hasQualifiedRead: false,
          },
        },
      },
      {
        'chaptersRead.$': 1,
      }
    );
  }

  async markChapterAsQualified(userId: string, storySlug: string, chapterSlug: string) {
    return this.model.findOneAndUpdate(
      {
        userId,
        storySlug,
        chaptersRead: {
          $elemMatch: {
            chapterSlug: chapterSlug,
            hasQualifiedRead: false,
          },
        },
      },
      {
        $set: {
          'chaptersRead.$.hasQualifiedRead': true,
          currentChapterSlug: chapterSlug,
        },
      }
    );
  }

  /**
   * Aggregate chapter-level analytics (reads, unique readers, total read time)
   * grouped into time buckets (hour or day).
   */
  async aggregateChapterAnalytics(
    chapterSlug: string,
    from: Date,
    to: Date,
    bucketType: 'hour' | 'day'
  ): Promise<IRawAnalyticsBucket[]> {
    const dateFormat = bucketType === 'hour' ? '%Y-%m-%dT%H:00:00.000Z' : '%Y-%m-%d';

    return this.model.aggregate<IRawAnalyticsBucket>([
      {
        $match: {
          lastReadAt: { $gte: from, $lte: to },
          'chaptersRead.chapterSlug': chapterSlug,
        },
      },
      { $unwind: '$chaptersRead' },
      {
        $match: {
          'chaptersRead.chapterSlug': chapterSlug,
          'chaptersRead.hasQualifiedRead': true,
        },
      },
      {
        $group: {
          _id: {
            bucket: {
              $dateToString: { format: dateFormat, date: '$lastReadAt' },
            },
          },
          reads: { $sum: 1 },
          uniqueReaders: { $addToSet: '$userId' },
          totalReadTime: { $sum: '$chaptersRead.totalReadTime' },
        },
      },
      {
        $project: {
          _id: 0,
          bucket: '$_id.bucket',
          reads: 1,
          uniqueReaders: { $size: '$uniqueReaders' },
          totalReadTime: 1,
        },
      },
      { $sort: { bucket: 1 } },
    ]);
  }

  /**
   * Aggregate story-level analytics (reads, unique readers, total read time)
   * grouped into time buckets (hour or day).
   */
  async aggregateStoryAnalytics(
    storySlug: string,
    from: Date,
    to: Date,
    bucketType: 'hour' | 'day'
  ): Promise<IRawAnalyticsBucket[]> {
    const dateFormat = bucketType === 'hour' ? '%Y-%m-%dT%H:00:00.000Z' : '%Y-%m-%d';

    return this.model.aggregate<IRawAnalyticsBucket>([
      {
        $match: {
          storySlug,
          lastReadAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            bucket: {
              $dateToString: { format: dateFormat, date: '$lastReadAt' },
            },
          },
          reads: { $sum: 1 },
          uniqueReaders: { $addToSet: '$userId' },
          totalReadTime: { $sum: '$totalStoryReadTime' },
        },
      },
      {
        $project: {
          _id: 0,
          bucket: '$_id.bucket',
          reads: 1,
          uniqueReaders: { $size: '$uniqueReaders' },
          totalReadTime: 1,
        },
      },
      { $sort: { bucket: 1 } },
    ]);
  }
}

export { ReadingHistoryRepository };
